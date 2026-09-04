"""refresh_embeddings task — idempotent per-entity embedding (Phase 2).

Separated from extraction so a failed embedding step is retried alone, per
AI_DESIGN.md's partial-failure handling. Entities: ``cv`` | ``startup`` | ``job``.
The upsert helpers are also called directly from ``enrich_startup`` so the
pipeline embeds in the same run when it can.
"""

import logging
import uuid
from datetime import UTC, datetime
from typing import Any

from app.models import (
    CVEmbedding,
    CVProfile,
    Job,
    JobEmbedding,
    Startup,
    StartupEmbedding,
)
from celery import shared_task
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.orm import Session

from tasks.embedding import embed_text

logger = logging.getLogger(__name__)


def _session():
    from app.db.session import SessionLocal

    return SessionLocal()


def _atomic_upsert(db: Session, model, key_column, values: dict) -> None:
    """Insert-or-update an embedding row in one statement.

    The embeddings tables have a unique index on the entity FK, so a
    SELECT-then-INSERT upsert races when two tasks enrich the same entity
    concurrently (e.g. duplicate queued enrich_startup jobs). ``ON CONFLICT``
    makes it atomic — the loser updates instead of raising UniqueViolation."""
    stmt = pg_insert(model).values(**values)
    stmt = stmt.on_conflict_do_update(
        index_elements=[key_column],
        set_={k: stmt.excluded[k] for k in ("embedding", "model")},
    )
    db.execute(stmt)


def upsert_cv_embedding(db: Session, profile: CVProfile, vector: list[float], model: str) -> None:
    _atomic_upsert(
        db,
        CVEmbedding,
        CVEmbedding.cv_profile_id,
        {"cv_profile_id": profile.id, "embedding": vector, "model": model},
    )
    profile.last_embedded_at = datetime.now(UTC)


def upsert_startup_embedding(db: Session, startup: Startup, vector: list[float], model: str) -> None:
    _atomic_upsert(
        db,
        StartupEmbedding,
        StartupEmbedding.startup_id,
        {"startup_id": startup.id, "embedding": vector, "model": model},
    )


def upsert_job_embedding(db: Session, job: Job, vector: list[float], model: str) -> None:
    _atomic_upsert(
        db,
        JobEmbedding,
        JobEmbedding.job_id,
        {"job_id": job.id, "embedding": vector, "model": model},
    )


def _job_text(job: Job, startup: Startup | None) -> str:
    parts = [part for part in (job.title, job.description, startup.summary if startup else None) if part]
    return "\n".join(parts)


@shared_task(name="refresh_embeddings")
def refresh_embeddings(entity: str, entity_id: str) -> dict:
    db = _session()
    try:
        result = _refresh(db, entity, entity_id)
        db.commit()
        return result
    except Exception as exc:
        db.rollback()
        logger.exception("refresh_embeddings failed for %s %s", entity, entity_id)
        return {"status": "failed", "error": str(exc)[:500]}
    finally:
        db.close()


def _refresh(db: Session, entity: str, entity_id: str) -> dict[str, Any]:
    if entity == "cv":
        profile = db.get(CVProfile, uuid.UUID(entity_id))
        if profile is None:
            return {"status": "skipped", "entity": entity, "reason": "no cv profile"}
        text = profile.raw_text or ""
        if not text.strip():
            return {"status": "skipped", "entity": entity, "reason": "empty cv text"}
        vector, model = embed_text(text)
        upsert_cv_embedding(db, profile, vector, model)
        return {"status": "succeeded", "entity": entity}

    if entity == "startup":
        startup = db.get(Startup, uuid.UUID(entity_id))
        if startup is None:
            return {"status": "skipped", "entity": entity, "reason": "no startup"}
        text = startup.summary or ""
        if not text.strip():
            return {"status": "skipped", "entity": entity, "reason": "no summary to embed"}
        vector, model = embed_text(text)
        upsert_startup_embedding(db, startup, vector, model)
        return {"status": "succeeded", "entity": entity}

    if entity == "job":
        job = db.get(Job, uuid.UUID(entity_id))
        if job is None:
            return {"status": "skipped", "entity": entity, "reason": "no job"}
        startup = db.get(Startup, job.startup_id) if job.startup_id else None
        text = _job_text(job, startup)
        if not text.strip():
            return {"status": "skipped", "entity": entity, "reason": "no job text to embed"}
        vector, model = embed_text(text)
        upsert_job_embedding(db, job, vector, model)
        return {"status": "succeeded", "entity": entity}

    return {"status": "failed", "entity": entity, "error": f"unknown entity type '{entity}'"}