"""assistant_service — read-only tool-use agent over the user's own data.

Per AI_DESIGN.md's RAG architecture: the LLM picks which tool(s) to call, every
tool is executed with the authenticated user's ID injected server-side (never
trusted from the prompt), and results are fed back for the model to synthesize a
grounded answer with references. Strictly read-only in v3 — no write actions.

Tools:
- query_saved_startups(filters)      — SQL over the user's saved startups
- semantic_search(query, entity_type) — pgvector similarity (startup/job)
- query_applications(status, days)  — all application rows, filterable
- get_application_status(startup)   — the user's applications for one startup
- get_match_explanation(job_id)     — cached match score + explanation
- get_recent_activity(days)         — recent saved/application/note activity
"""

import json
import logging
import re
import uuid
from datetime import UTC, datetime, timedelta
from typing import cast

from openai.types.chat import (
    ChatCompletionMessageParam,
    ChatCompletionMessageToolCall,
    ChatCompletionMessageToolCallParam,
    ChatCompletionToolParam,
)
from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app.models import (
    Application,
    Job,
    JobEmbedding,
    MatchScore,
    Note,
    SavedStartup,
    Startup,
    StartupEmbedding,
    User,
)
from app.schemas.assistant import (
    AssistantChatRequest,
    AssistantChatResponse,
    AssistantReference,
    AssistantToolCall,
)

logger = logging.getLogger(__name__)

_MAX_ITERATIONS = 4
_TOOL_RESULT_MAX_CHARS = 8000


def _safe_json(result: object) -> str:
    """Serialize *result* to JSON, keeping complete list items.

    If the full JSON exceeds ``_TOOL_RESULT_MAX_CHARS`` and the top-level
    value is a list, items are dropped from the end (with a ``"_truncated"``
    marker) until the payload fits.  Non-list results are simply truncated at
    the character boundary (degraded but usable).
    """
    full = json.dumps(result, default=str)
    if len(full) <= _TOOL_RESULT_MAX_CHARS or not isinstance(result, list):
        return full
    # Drop items from the tail until it fits.
    kept: list[object] = []
    for item in result:
        kept.append(item)
        if len(json.dumps(kept, default=str)) > _TOOL_RESULT_MAX_CHARS:
            kept.pop()
            break
    kept.append({"_truncated": True, "total": len(result), "returned": len(kept)})
    return json.dumps(kept, default=str)


# --- Tool definitions (OpenAI function-calling schema) -----------------------


TOOL_SCHEMAS: list[ChatCompletionToolParam] = [
    {
        "type": "function",
        "function": {
            "name": "query_saved_startups",
            "description": "List the user's saved startups, optionally filtered by stage, hiring_status, tags, or free-text q. Returns id, name, stage, hiring_status, summary, tags, status. If the list is too long, a _truncated marker is appended — report the total and advise the user to narrow filters.",
            "parameters": {
                "type": "object",
                "properties": {
                    "stage": {"type": "string", "description": "e.g. seed, series_a"},
                    "hiring_status": {"type": "string", "description": "hiring | maybe | not_hiring"},
                    "tags": {"type": "array", "items": {"type": "string"}},
                    "q": {"type": "string", "description": "free-text match on name/summary/tags"},
                    "limit": {"type": "integer", "default": 20},
                },
                "additionalProperties": False,
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "semantic_search",
            "description": "Fuzzy semantic search over the user's saved startups or their jobs by embedding similarity to a query phrase. Returns id, name, and a similarity hint.",
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {"type": "string"},
                    "entity_type": {"type": "string", "enum": ["startup", "job"]},
                    "limit": {"type": "integer", "default": 10},
                },
                "required": ["query", "entity_type"],
                "additionalProperties": False,
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_application_status",
            "description": "Return the user's application rows for a startup by name (status, job title, applied_at).",
            "parameters": {
                "type": "object",
                "properties": {"startup_name": {"type": "string"}},
                "required": ["startup_name"],
                "additionalProperties": False,
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_match_explanation",
            "description": "Return the cached match score and explanation for a job_id.",
            "parameters": {
                "type": "object",
                "properties": {"job_id": {"type": "string"}},
                "required": ["job_id"],
                "additionalProperties": False,
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "query_applications",
            "description": "List the user's application rows across every startup. Optionally filter by status (saved | applied | interview | offer | rejected | withdrawn | archived) or recency in days. Returns id, startup, job_title, status, applied_at, updated_at ordered by most recently updated. Use for 'list all my applications', 'which are in interview', 'anything stale or overdue for follow-up'.",
            "parameters": {
                "type": "object",
                "properties": {
                    "status": {"type": "string", "description": "saved | applied | interview | offer | rejected | withdrawn | archived"},
                    "recent_days": {"type": "integer", "description": "only applications created or updated within this many days"},
                    "limit": {"type": "integer", "default": 30},
                },
                "additionalProperties": False,
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_recent_activity",
            "description": "Return the user's recent workspace activity from the last N days (default 7): startups saved, applications created or status-changed, and notes added, each with a timestamp. Use for 'summarize my week', 'what's new since...', 'anything happened this week'.",
            "parameters": {
                "type": "object",
                "properties": {
                    "days": {"type": "integer", "default": 7, "description": "how far back to look, e.g. 7 or 30"},
                    "limit": {"type": "integer", "default": 30},
                },
                "additionalProperties": False,
            },
        },
    },
]


# --- Tool implementations (all read-only, user-scoped) ------------------------


def _tool_query_saved_startups(db: Session, user: User, args: dict) -> list[dict]:
    stage = args.get("stage")
    hiring_status = args.get("hiring_status")
    tags = args.get("tags") or []
    q = args.get("q")
    limit = min(int(args.get("limit") or 20), 50)

    stmt = (
        select(SavedStartup)
        .join(Startup, Startup.id == SavedStartup.startup_id)
        .where(
            SavedStartup.user_id == user.id,
            SavedStartup.status != "archived",
            Startup.deleted_at.is_(None),
        )
        .limit(limit)
    )
    if stage:
        stmt = stmt.where(Startup.stage == stage)
    if hiring_status:
        stmt = stmt.where(Startup.hiring_status == hiring_status)
    if tags and db.get_bind().dialect.name == "postgresql":
        stmt = stmt.where(Startup.tags.overlap(tags))
    if q:
        like = f"%{q}%"
        stmt = stmt.where(or_(Startup.name.ilike(like), Startup.summary.ilike(like)))

    out = []
    for saved in db.scalars(stmt).all():
        startup = saved.startup
        out.append(
            {
                "id": str(startup.id),
                "name": startup.name,
                "stage": startup.stage,
                "hiring_status": startup.hiring_status,
                "status": saved.status,
                "summary": startup.summary,
                "tags": startup.tags or [],
            }
        )
    return out


def _cosine(a: list[float], b: list[float]) -> float:
    if not a or not b:
        return 0.0
    dot = sum(x * y for x, y in zip(a, b, strict=False))
    na = sum(x * x for x in a) ** 0.5 or 1.0
    nb = sum(x * x for x in b) ** 0.5 or 1.0
    return dot / (na * nb)


def _tool_semantic_search(db: Session, user: User, args: dict) -> list[dict]:
    query = (args.get("query") or "").strip()
    entity_type = args.get("entity_type") or "startup"
    limit = min(int(args.get("limit") or 10), 20)
    if not query:
        return []

    from app.services.embedding import embed_query

    query_vec, _ = embed_query(query)

    # Restrict to the user's saved startups.
    saved_ids = set(
        db.scalars(
            select(SavedStartup.startup_id).where(
                SavedStartup.user_id == user.id, SavedStartup.status != "archived"
            )
        ).all()
    )
    if not saved_ids:
        return []

    if entity_type == "job":
        job_ids = _job_ids_of(db, saved_ids)
        if not job_ids:
            return []
        scored_jobs: list[dict] = []
        for job_emb in db.scalars(select(JobEmbedding)).all():
            if job_emb.job_id not in job_ids:
                continue
            job = db.get(Job, job_emb.job_id)
            startup = db.get(Startup, job.startup_id) if job else None
            score = _cosine(query_vec, job_emb.embedding)
            scored_jobs.append(
                {
                    "id": str(job.id) if job else "",
                    "name": (f"{startup.name}: {job.title}" if startup and job else ""),
                    "score": round(score, 3),
                }
            )
        scored_jobs.sort(key=lambda x: x["score"], reverse=True)
        return scored_jobs[:limit]

    scored_startups: list[dict] = []
    for startup_emb in db.scalars(select(StartupEmbedding)).all():
        if startup_emb.startup_id not in saved_ids:
            continue
        startup = db.get(Startup, startup_emb.startup_id)
        score = _cosine(query_vec, startup_emb.embedding)
        scored_startups.append(
            {
                "id": str(startup_emb.startup_id),
                "name": startup.name if startup else "",
                "score": round(score, 3),
                "summary": startup.summary if startup else None,
            }
        )
    scored_startups.sort(key=lambda x: x["score"], reverse=True)
    return scored_startups[:limit]


def _job_ids_of(db: Session, startup_ids: set[uuid.UUID]) -> set[uuid.UUID]:
    return set(db.scalars(select(Job.id).where(Job.startup_id.in_(startup_ids))).all())


def _tool_get_application_status(db: Session, user: User, args: dict) -> list[dict]:
    name = (args.get("startup_name") or "").strip()
    if not name:
        return []
    like = f"%{name}%"
    rows = db.scalars(
        select(Application)
        .join(Startup, Startup.id == Application.startup_id)
        .where(
            Application.user_id == user.id,
            or_(Startup.name.ilike(like), Startup.name.ilike(f"%{name.lower()}%")),
        )
        .limit(20)
    ).all()
    out = []
    for app in rows:
        startup = db.get(Startup, app.startup_id)
        job = db.get(Job, app.job_id) if app.job_id else None
        out.append(
            {
                "startup": startup.name if startup else None,
                "status": app.status,
                "job_title": job.title if job else None,
                "applied_at": app.applied_at.isoformat() if app.applied_at else None,
            }
        )
    return out


def _tool_get_match_explanation(db: Session, user: User, args: dict) -> dict | None:
    job_id = (args.get("job_id") or "").strip()
    if not job_id:
        return None
    try:
        job_uuid = uuid.UUID(job_id)
    except ValueError:
        return None
    row = db.scalar(
        select(MatchScore).where(
            MatchScore.user_id == user.id, MatchScore.job_id == job_uuid
        )
    )
    if row is None:
        return None
    job = db.get(Job, job_uuid)
    startup = db.get(Startup, job.startup_id) if job else None
    return {
        "job_id": job_id,
        "startup": startup.name if startup else None,
        "job_title": job.title if job else None,
        "score": float(row.score),
        "explanation": row.explanation,
    }


def _as_utc_iso(dt) -> str | None:
    """Return an ISO string for a DB timestamp, normalizing naive → UTC."""
    if not dt:
        return None
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=UTC)
    return dt.isoformat()


def _tool_query_applications(db: Session, user: User, args: dict) -> list[dict]:
    status = (args.get("status") or "").strip()
    recent_days = args.get("recent_days")
    limit = min(int(args.get("limit") or 30), 100)

    stmt = select(Application).where(Application.user_id == user.id)
    if status:
        stmt = stmt.where(Application.status == status)
    if recent_days:
        cutoff = datetime.now(UTC) - timedelta(days=int(recent_days))
        stmt = stmt.where(
            or_(Application.created_at >= cutoff, Application.updated_at >= cutoff)
        )
    stmt = stmt.order_by(Application.updated_at.desc()).limit(limit)

    out: list[dict] = []
    for app in db.scalars(stmt).all():
        startup = db.get(Startup, app.startup_id)
        job = db.get(Job, app.job_id) if app.job_id else None
        out.append(
            {
                "id": str(app.id),
                "startup": startup.name if startup else None,
                "job_title": job.title if job else None,
                "status": app.status,
                "applied_at": _as_utc_iso(app.applied_at),
                "updated_at": _as_utc_iso(app.updated_at),
            }
        )
    return out


def _tool_get_recent_activity(db: Session, user: User, args: dict) -> list[dict]:
    days = min(int(args.get("days") or 7), 90)
    limit = min(int(args.get("limit") or 30), 60)
    cutoff = datetime.now(UTC) - timedelta(days=days)

    events: list[dict] = []

    for saved in db.scalars(
        select(SavedStartup)
        .where(
            SavedStartup.user_id == user.id,
            SavedStartup.status != "archived",
            SavedStartup.created_at >= cutoff,
        )
        .order_by(SavedStartup.created_at.desc())
        .limit(limit)
    ).all():
        startup = db.get(Startup, saved.startup_id)
        events.append(
            {
                "type": "startup_saved",
                "entity_type": "startup",
                "entity_id": str(saved.startup_id),
                "name": startup.name if startup else "a startup",
                "details": "saved to workspace",
                "when": _as_utc_iso(saved.created_at),
            }
        )

    for app in db.scalars(
        select(Application)
        .where(Application.user_id == user.id, Application.updated_at >= cutoff)
        .order_by(Application.updated_at.desc())
        .limit(limit)
    ).all():
        startup = db.get(Startup, app.startup_id)
        job = db.get(Job, app.job_id) if app.job_id else None
        label = job.title if job else "application"
        events.append(
            {
                "type": "application_updated",
                "entity_type": "application",
                "entity_id": str(app.id),
                "name": startup.name if startup else "an application",
                "details": f"{label} → {app.status}",
                "when": _as_utc_iso(app.updated_at),
            }
        )

    for note in db.scalars(
        select(Note)
        .where(Note.user_id == user.id, Note.created_at >= cutoff)
        .order_by(Note.created_at.desc())
        .limit(limit)
    ).all():
        startup = db.get(Startup, note.startup_id) if note.startup_id else None
        events.append(
            {
                "type": "note",
                "entity_type": "startup",
                "entity_id": str(note.startup_id) if note.startup_id else None,
                "name": startup.name if startup else "Note",
                "details": (note.body or "")[:120],
                "when": _as_utc_iso(note.created_at),
            }
        )

    events.sort(key=lambda e: e["when"] or "", reverse=True)
    return events[:limit]


_TOOLS = {
    "query_saved_startups": _tool_query_saved_startups,
    "semantic_search": _tool_semantic_search,
    "query_applications": _tool_query_applications,
    "get_application_status": _tool_get_application_status,
    "get_match_explanation": _tool_get_match_explanation,
    "get_recent_activity": _tool_get_recent_activity,
}


# --- LLM orchestration --------------------------------------------------------


def _client():
    from openai import OpenAI

    from app.config import resolve_chat_config

    cfg = resolve_chat_config()
    kwargs = {"api_key": cfg["api_key"]}
    if cfg["base_url"]:
        kwargs["base_url"] = cfg["base_url"]
    return OpenAI(**kwargs)


def _chat_model() -> str:
    from app.config import resolve_chat_config

    return resolve_chat_config()["model"]


def _load_system_prompt() -> str:
    """Load the assistant system prompt selected by ASSISTANT_PROMPT.

    ``v1`` → packages/prompts/assistant.v1.txt (plain, no references)
    ``v2`` → packages/promptsV2/assistant.v2.txt (references JSON format)
    anything else → treated as a path to a prompt file (repo-root relative
    unless absolute); falls back to v2 with a warning when it doesn't exist.
    """
    from pathlib import Path

    from app.config import settings

    root = Path(__file__).resolve().parents[4]
    version = (settings.assistant_prompt or "v2").strip().lower()
    if version == "v1":
        path = root / "packages" / "prompts" / "assistant.v1.txt"
    elif version == "v2":
        path = root / "packages" / "promptsV2" / "assistant.v2.txt"
    else:
        candidate = Path(version)
        path = candidate if candidate.is_absolute() else root / candidate
        if not path.exists():
            logger.warning("ASSISTANT_PROMPT %r not found; falling back to v2", version)
            path = root / "packages" / "promptsV2" / "assistant.v2.txt"
    return path.read_text(encoding="utf-8")


_JSON_FENCE_RE = re.compile(r"^```(?:json)?\s*(.*?)\s*```$", re.DOTALL)


def _extract_json_object(text: str) -> object | None:
    """Best-effort JSON parse: the whole string, or the JSON object buried in
    surrounding prose (models often wrap the envelope in a sentence)."""
    candidates: list[str] = []
    start = text.find("{")
    if start != -1:
        depth = 0
        for i in range(start, len(text)):
            if text[i] == "{":
                depth += 1
            elif text[i] == "}":
                depth -= 1
                if depth == 0:
                    candidates.append(text[start : i + 1])
                    break
        candidates.append(text[start:])
    candidates.insert(0, text)
    for candidate in candidates:
        try:
            return json.loads(candidate)
        except json.JSONDecodeError:
            continue
    return None


def _strip_json_blob(text: str) -> str:
    """Remove the first balanced JSON object from ``text``, leaving the prose."""
    start = text.find("{")
    if start == -1:
        return text
    depth = 0
    for i in range(start, len(text)):
        if text[i] == "{":
            depth += 1
        elif text[i] == "}":
            depth -= 1
            if depth == 0:
                return (text[:start] + text[i + 1 :]).strip()
    return text


def _parse_answer_references(content: str | None) -> tuple[str, list[AssistantReference]]:
    """Split the model's final answer into prose + linkable references.

    The v2 prompt asks for a JSON envelope ``{"answer": ..., "references":
    [...]}``. Robustly unwrap it (markdown fences, prose around the JSON);
    malformed output degrades to plain text with no references. The envelope's
    ``answer`` wins when it's substantive or the JSON is the whole response;
    otherwise (prose + stub envelope) the surrounding prose is the answer."""
    text = (content or "").strip()
    if not text:
        return "I couldn't find that in your workspace.", []
    candidate = text
    fence = _JSON_FENCE_RE.match(text)
    if fence:
        candidate = fence.group(1).strip()
    data = _extract_json_object(candidate)
    references: list[AssistantReference] = []
    envelope_answer = ""
    if isinstance(data, dict):
        envelope_answer = str(data.get("answer") or "").strip()
        for ref in data.get("references") or []:
            if isinstance(ref, dict) and ref.get("id") and ref.get("name"):
                references.append(
                    AssistantReference(
                        type=str(ref.get("type") or "startup"),
                        id=str(ref["id"]),
                        name=str(ref["name"]),
                    )
                )
    if isinstance(data, dict):
        prose = _strip_json_blob(candidate).strip()
        if envelope_answer and (not prose or len(envelope_answer) >= 10):
            return envelope_answer, references
        if prose:
            return prose, references
    return text, references


def chat(db: Session, user: User, body: AssistantChatRequest) -> AssistantChatResponse:
    """Run the tool-use loop: LLM proposes tool calls → execute → feed back →
    repeat until the model returns a final answer (or iteration cap)."""
    from app.config import resolve_chat_config

    # Check the *resolved* key (env var → .env → placeholder-sniffed) so an
    # unfilled template like YOUR_GEMINI_API_KEY_HERE surfaces as a clear 503
    # instead of a provider 400/500.
    if not resolve_chat_config()["api_key"]:
        raise ValueError(
            "Assistant is not configured: set AI_API_KEY in the repo-root .env."
        )

    messages: list[ChatCompletionMessageParam] = [
        {"role": "system", "content": _load_system_prompt()}
    ]
    messages.extend(
        cast(
            ChatCompletionMessageParam,
            {"role": m.role, "content": m.content},
        )
        for m in body.history
    )
    messages.append(
        cast(
            ChatCompletionMessageParam,
            {"role": "user", "content": body.message},
        )
    )

    tool_calls_run: list[AssistantToolCall] = []

    for _ in range(_MAX_ITERATIONS):
        resp = _client().chat.completions.create(
            model=_chat_model(),
            messages=messages,
            tools=TOOL_SCHEMAS,
            tool_choice="auto",
        )
        choice = resp.choices[0]
        tool_calls = getattr(choice.message, "tool_calls", None)

        if not tool_calls:
            answer, references = _parse_answer_references(choice.message.content)
            return AssistantChatResponse(
                answer=answer, references=references, tools=tool_calls_run
            )

        messages.append(
            cast(
                ChatCompletionMessageParam,
                {
                    "role": "assistant",
                    "content": choice.message.content or "",
                    "tool_calls": _as_plain_tool_calls(tool_calls),
                },
            )
        )
        for call in tool_calls:
            name = call.function.name
            fn = _TOOLS.get(name)
            try:
                args = json.loads(call.function.arguments or "{}")
            except json.JSONDecodeError:
                args = {}
            result: object
            if fn is None:
                result = {"error": f"unknown tool '{name}'"}
            else:
                try:
                    result = fn(db, user, args)
                except Exception as exc:  # tool errors are surfaced to the model
                    logger.exception("assistant tool %s failed", name)
                    result = {"error": str(exc)[:300]}
            safe = _safe_json(result)
            tool_calls_run.append(
                AssistantToolCall(
                    name=name,
                    arguments=args,
                    result=safe,
                )
            )
            messages.append(
                {
                    "role": "tool",
                    "tool_call_id": call.id,
                    "content": safe,
                }
            )

    # Iteration cap reached without a final answer — synthesize from last results.
    last_content = next(
        (
            str(m.get("content")).strip()
            for m in reversed(messages)
            if m.get("role") == "assistant" and m.get("content")
        ),
        None,
    )
    answer, references = _parse_answer_references(last_content)
    return AssistantChatResponse(answer=answer, references=references, tools=tool_calls_run)


def _as_plain_tool_calls(
    tool_calls: list[ChatCompletionMessageToolCall],
) -> list[ChatCompletionMessageToolCallParam]:
    return [
        {
            "id": call.id,
            "type": "function",
            "function": {
                "name": call.function.name,
                "arguments": call.function.arguments or "{}",
            },
        }
        for call in tool_calls
    ]
