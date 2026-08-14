"""matching_service — Phase 2 Stage 1 retrieval (embedding similarity).

Per the build plan this ships embedding-only scores:
- ``recompute_user`` computes cached ``match_scores`` for every open job in the
  user's workspace — cosine similarity over pgvector embeddings, with a
  token-overlap fallback so matching works end to end before any of a user's
  content has been embedded (and on non-postgres test dialects).
- ``recommended`` reads the cached scores (sorted by fit, not recency).
- The Phase 3.1 LLM re-rank fills ``confidence_band``/``explanation`` on these
  same cached rows — they are deliberately ``null`` here.
"""

import base64
import math
import re
import uuid
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
from app.schemas.cv import MatchOut

MATCH_MODEL = "phase_2_embedding"


# --- score computation ------------------------------------------------------


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


# --- recompute --------------------------------------------------------------


def recompute_user(db: Session, user: User, job_id: uuid.UUID | None = None) -> int:
    """Compute and cache Stage 1 scores for the user's workspace jobs.

    Idempotent: existing ``match_scores`` rows are upserted in place. Returns the
    number of scores written. Raises nothing — a user without a CV or without
    workspace jobs simply produces zero scores.
    """
    profile = db.scalar(select(CVProfile).where(CVProfile.user_id == user.id))
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
        written += 1

    db.commit()
    return written


# --- reads ------------------------------------------------------------------


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


def _to_match_out(score: MatchScore, job: Job, startup: Startup) -> MatchOut:
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
        confidence_band=None,
        explanation=None,
    )


def recommended(db: Session, user: User, cursor: str | None, limit: int) -> tuple[list[MatchOut], str | None]:
    """Ranked jobs for the current user, straight from the cached match_scores."""
    stmt: Select = (
        select(MatchScore, Job, Startup)
        .join(Job, Job.id == MatchScore.job_id)
        .join(Startup, Startup.id == Job.startup_id)
        .where(
            MatchScore.user_id == user.id,
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