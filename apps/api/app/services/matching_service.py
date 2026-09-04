"""matching_service — the two-stage matching pipeline.

- Stage 1 retrieval: cosine similarity over pgvector ``job_embeddings`` (with a
  deterministic token-overlap fallback so scores exist before any content is
  embedded and unit tests on sqlite can exercise matching).
- Stage 2 re-rank: an LLM ``{score, matched_skills, gaps, summary}`` verdict per
  candidate, with a deterministic ``heuristic_explanation`` fallback so the API
  contract (explanation + confidence_band always present, gaps required) holds
  even with no model key. The LLM scorer lives in the worker; the API uses the
  heuristic fallback synchronously on ``POST /match/compute``.
- Reads serve the cached ``match_scores`` rows; explanations are stored, never
  regenerated per view (AI_DESIGN explainability).
"""

import base64
import math
import re
import uuid
from collections.abc import Callable
from datetime import UTC, datetime
from typing import Any, cast

from sqlalchemy import ColumnElement, Select, select, tuple_
from sqlalchemy.orm import Session

from app.core.errors import ScoutError
from app.models import (
    CVEmbedding,
    CVProfile,
    Job,
    JobEmbedding,
    MatchScore,
    SavedStartup,
    Startup,
    User,
)
from app.schemas.cv import MatchExplanation, MatchOut

MATCH_MODEL = "phase_2_embedding"
RERANK_MODEL = "phase_3_rerank"

STOPWORDS = {
    "the", "and", "for", "with", "you", "will", "a", "an", "to", "of", "in",
    "on", "our", "we", "your", "are", "is", "be", "role", "this", "that",
    "working", "work", "experience", "team", "company", "what", "who", "as",
    "at", "by", "or", "from", "it", "would", "should", "about",
}

REQ_KEYWORDS = {
    "python": "Python", "golang": "Go", "go": "Go", "typescript": "TypeScript",
    "javascript": "JavaScript", "react": "React", "vue": "Vue", "node": "Node.js",
    "postgres": "PostgreSQL", "postgresql": "PostgreSQL", "mysql": "MySQL",
    "graphql": "GraphQL", "docker": "Docker", "kubernetes": "Kubernetes",
    "k8s": "Kubernetes", "aws": "AWS", "gcp": "Google Cloud",
    "microsoft azure": "Azure", "azure": "Azure", "redis": "Redis",
    "fastapi": "FastAPI", "django": "Django", "flask": "Flask",
    "next.js": "Next.js", "nextjs": "Next.js", "tensorflow": "TensorFlow",
    "pytorch": "PyTorch", "sql": "SQL", "api": "API", "machine learning": "Machine Learning",
    "leadership": "Leadership",
}

Scorer = Callable[[dict[str, Any], Job, Startup, float], tuple[float, dict[str, Any]]]


# --- Stage 1: score computation ----------------------------------------------


def _cosine(a: list[float], b: list[float]) -> float:
    if not a or not b or len(a) != len(b):
        return 0.0
    dot = sum(x * y for x, y in zip(a, b, strict=False))
    na = math.sqrt(sum(x * x for x in a))
    nb = math.sqrt(sum(x * x for x in b))
    if na == 0 or nb == 0:
        return 0.0
    return max(-1.0, min(1.0, dot / (na * nb)))


def _tokens(*parts: str | None) -> set[str]:
    tokens: set[str] = set()
    for part in parts:
        if not part:
            continue
        tokens.update(re.findall(r"[a-z0-9]+", part.lower()))
    return tokens


def _overlap_score(cv_text: str, job_text: str, cv_skills: list[str]) -> float:
    """Deterministic token-overlap fallback (0-100) so scores exist before any
    embeddings are written, and so unit tests on sqlite can exercise matching."""
    if not cv_text.strip():
        return 0.0
    cv_tokens = _tokens(cv_text) | _tokens(*cv_skills)
    job_tokens = _tokens(job_text)
    if not job_tokens:
        return 0.0
    overlap = cv_tokens & job_tokens
    if not overlap:
        return 0.0
    dice = 2 * len(overlap) / (len(cv_tokens) + len(job_tokens))
    return round(max(0.0, min(100.0, dice * 100)), 2)


def _job_text(job: Job, startup: Startup) -> str:
    return " ".join(part for part in (startup.summary, job.title, job.description) if part)


def _default_profile(db: Session, user: User) -> CVProfile | None:
    """The user's active CV profile — matches anchor to it. With multiple
    profiles (Phase 6.2) the marked default wins, oldest as fallback."""
    return db.scalar(
        select(CVProfile)
        .where(CVProfile.user_id == user.id)
        .order_by(CVProfile.is_default.desc(), CVProfile.created_at.asc())
        .limit(1)
    )


def _cv_context(profile: CVProfile) -> dict[str, Any]:
    sd = profile.structured_data or {}
    return {
        "raw_text": profile.raw_text or "",
        "skills": sd.get("skills") or [],
        "roles": sd.get("roles") or [],
        "years_of_experience": sd.get("years_of_experience"),
        "education": sd.get("education") or [],
    }


def recompute_user(db: Session, user: User, job_id: uuid.UUID | None = None) -> int:
    """Stage 1 only: compute and cache summary-embedding scores for the user's
    workspace jobs. Idempotent upsert. Returns the number of scores written."""
    profile = _default_profile(db, user)
    if profile is None:
        return 0

    cv_embedding = db.scalar(
        select(CVEmbedding).where(CVEmbedding.cv_profile_id == profile.id).limit(1)
    )
    cv_vec: list[float] = cv_embedding.embedding if cv_embedding else []
    cv_text = profile.raw_text or ""
    cv_skills = (profile.structured_data or {}).get("skills", [])

    stmt: Select = (
        select(Job, Startup)
        .join(Startup, Startup.id == Job.startup_id)
        .join(SavedStartup, SavedStartup.startup_id == Startup.id)
        .where(
            SavedStartup.user_id == user.id,
            SavedStartup.status != "archived",
            Job.deleted_at.is_(None),
            Startup.deleted_at.is_(None),
            Job.status != "closed",
        )
    )
    if job_id is not None:
        stmt = stmt.where(Job.id == job_id)

    written = 0
    for job, startup in db.execute(stmt).all():
        job_embedding = db.scalar(
            select(JobEmbedding).where(JobEmbedding.job_id == job.id).limit(1)
        )
        if cv_vec and job_embedding is not None:
            score = round(max(0.0, _cosine(cv_vec, job_embedding.embedding)) * 100, 2)
        else:
            score = _overlap_score(cv_text, _job_text(job, startup), list(cv_skills))

        row = db.scalar(
            select(MatchScore).where(
                MatchScore.user_id == user.id, MatchScore.job_id == job.id
            )
        )
        if row is None:
            row = MatchScore(
                user_id=user.id,
                job_id=job.id,
                startup_id=startup.id,
                score=score,
                model=MATCH_MODEL,
            )
            db.add(row)
        else:
            row.score = score
            row.startup_id = startup.id
            row.model = MATCH_MODEL
        row.computed_at = datetime.now(UTC)
        written += 1

    db.commit()
    return written


# --- Stage 2: re-rank (explanation) ------------------------------------------


def _job_mentions(job_text_lower: str, skill: str) -> bool:
    return skill.lower() in job_text_lower


def _fallback_gap(job: Job, startup: Startup, cv_text_lower: str) -> str:
    text = _job_text(job, startup).lower()
    for word in text.split():
        w = word.strip(".,;:()[]{}'\"!")
        if len(w) < 5 or w in STOPWORDS or w in cv_text_lower:
            continue
        return w.capitalize()
    return "Domain-specific specialist knowledge"


def heuristic_explanation(
    cv_ctx: dict[str, Any], job: Job, startup: Startup, stage1_score: float
) -> tuple[float, dict[str, Any]]:
    """Deterministic Stage-2 fallback so explanations are always present even
    without an LLM key. Mirrors the LLM output schema."""
    job_text = _job_text(job, startup)
    job_lower = job_text.lower()
    cv_text_lower = (cv_ctx["raw_text"] or "").lower()
    skills = list(cv_ctx["skills"] or [])
    skill_lower = {s.lower() for s in skills}

    matched = [s for s in skills if _job_mentions(job_lower, s)]
    if not matched:
        overlap = sorted(_tokens(job_text) & (_tokens(cv_ctx["raw_text"]) | _tokens(*skills)))
        matched = [t.capitalize() for t in overlap[:4]]

    gaps: list[str] = []
    for keyword, label in REQ_KEYWORDS.items():
        if keyword in job_lower and keyword not in cv_text_lower and label.lower() not in skill_lower:
            if label not in gaps:
                gaps.append(label)
    if not gaps:
        fb = _fallback_gap(job, startup, cv_text_lower)
        if fb:
            gaps.append(fb)
    gaps = gaps[:4]

    score = max(0.0, round(float(stage1_score or 0) - 8.0 * len(gaps), 2))
    matched_head = ", ".join(matched[:3]) or "your background"
    explanation = {
        "matched_skills": matched[:6],
        "gaps": gaps,
        "summary": (
            f"Your background overlaps the role on {matched_head}"
            f"{'. Specified requirements not evidenced in the CV: ' + ', '.join(gaps[:2]) + '.' if gaps else '.'}"
        ),
    }
    return score, explanation


def rerank_user(
    db: Session, user: User, job_id: uuid.UUID | None = None, scorer: Scorer | None = None
) -> int:
    """Stage 2 re-rank: run a scorer over the cached Stage-1 rows and persist the
    final ``score`` + ``explanation``. Defaults to the deterministic heuristic."""
    if scorer is None:
        scorer = heuristic_explanation
    profile = _default_profile(db, user)
    if profile is None:
        return 0
    cv_ctx = _cv_context(profile)

    stmt: Select = (
        select(MatchScore, Job, Startup)
        .join(Job, Job.id == MatchScore.job_id)
        .join(Startup, Startup.id == Job.startup_id)
        .where(MatchScore.user_id == user.id)
    )
    if job_id is not None:
        stmt = stmt.where(MatchScore.job_id == job_id)

    rows = list(db.execute(stmt).all())
    count = 0
    for score_row, job, startup in rows:
        stage1 = float(score_row.score or 0)
        final_score, explanation = scorer(cv_ctx, job, startup, stage1)
        score_row.score = max(0.0, min(100.0, float(final_score)))
        score_row.explanation = explanation
        score_row.model = RERANK_MODEL
        score_row.computed_at = datetime.now(UTC)
        count += 1
    if rows:
        db.commit()
    return count


def set_feedback(db: Session, user: User, job_id: uuid.UUID, feedback: str) -> MatchScore:
    if feedback not in ("good", "poor"):
        raise ScoutError("INVALID_FEEDBACK", "Feedback must be 'good' or 'poor'.", status_code=400)
    row = db.scalar(
        select(MatchScore).where(MatchScore.user_id == user.id, MatchScore.job_id == job_id)
    )
    if row is None:
        raise ScoutError("MATCH_NOT_FOUND", "No match score for that job.", status_code=404)
    row.feedback = feedback
    db.add(row)
    db.commit()
    return row


# --- reads -------------------------------------------------------------------


def _derive_band(score: float) -> str:
    if score >= 70:
        return "strong"
    if score >= 40:
        return "moderate"
    return "weak"


def _to_match_out(score: MatchScore, job: Job, startup: Startup) -> MatchOut:
    explanation = None
    if score.explanation:
        explanation = MatchExplanation(**score.explanation)
    return MatchOut(
        job_id=job.id,
        startup_id=startup.id,
        startup_name=startup.name,
        title=job.title,
        description=job.description,
        location=job.location,
        remote=job.remote,
        employment_type=job.employment_type,
        seniority=job.seniority,
        url=job.url,
        status=job.status,
        score=float(score.score),
        confidence_band=_derive_band(float(score.score)),
        explanation=explanation,
    )


def _encode_score_cursor(score: Any, job_id: uuid.UUID) -> str:
    raw = f"{score}|{job_id}"
    return base64.urlsafe_b64encode(raw.encode()).decode()


def _decode_score_cursor(cursor: str) -> tuple[float, uuid.UUID]:
    try:
        raw = base64.urlsafe_b64decode(cursor.encode()).decode()
        score_str, id_str = raw.split("|", 1)
        return float(score_str), uuid.UUID(id_str)
    except Exception as exc:
        raise ScoutError("INVALID_CURSOR", "Malformed pagination cursor.", status_code=400) from exc


def recommended(db: Session, user: User, cursor: str | None, limit: int) -> tuple[list[MatchOut], str | None]:
    """Ranked unrated jobs for the current user, straight from the cached match_scores.

    Matches the user has rated (good/poor) are retired from the list, so the
    queue shrinks as the user works through it.
    """
    stmt: Select = (
        select(MatchScore, Job, Startup)
        .join(Job, Job.id == MatchScore.job_id)
        .join(Startup, Startup.id == Job.startup_id)
        .where(
            MatchScore.user_id == user.id,
            MatchScore.feedback.is_(None),
            Job.deleted_at.is_(None),
            Startup.deleted_at.is_(None),
        )
        .order_by(MatchScore.score.desc(), MatchScore.id.desc())
        .limit(limit + 1)
    )
    if cursor:
        score, job_id = _decode_score_cursor(cursor)
        stmt = stmt.where(
            tuple_(MatchScore.score, MatchScore.id)
            < tuple_(cast(ColumnElement[Any], score), cast(ColumnElement[Any], job_id))
        )

    rows = list(db.execute(stmt).all())
    has_more = len(rows) > limit
    page = rows[:limit]

    matches = [_to_match_out(score, job, startup) for score, job, startup in page]
    next_cursor = None
    if has_more and page:
        last_score, last_job, _ = page[-1]
        next_cursor = _encode_score_cursor(last_score.score, last_job.id)
    return matches, next_cursor


def get_match(db: Session, user: User, job_id: uuid.UUID) -> MatchOut:
    """Match score for one job. Enforces workspace membership like the jobs router."""
    job = db.get(Job, job_id)
    if job is None or job.deleted_at is not None:
        raise ScoutError("JOB_NOT_FOUND", "No job found with that id.", status_code=404)

    saved = db.scalar(
        select(SavedStartup).where(
            SavedStartup.user_id == user.id,
            SavedStartup.startup_id == job.startup_id,
            SavedStartup.status != "archived",
        )
    )
    if saved is None:
        raise ScoutError("JOB_NOT_FOUND", "No job found with that id.", status_code=404)

    row = db.scalar(
        select(MatchScore).where(MatchScore.user_id == user.id, MatchScore.job_id == job_id)
    )
    if row is None:
        raise ScoutError(
            "MATCH_NOT_FOUND", "No match score computed for that job yet.", status_code=404
        )
    startup = db.get(Startup, job.startup_id)
    if startup is None:
        raise ScoutError("JOB_NOT_FOUND", "No job found with that id.", status_code=404)
    return _to_match_out(row, job, startup)