"""compute_match task — Stage 1 retrieval (embedding similarity) recompute.

Writes cached ``match_scores`` for the user's workspace jobs (or a single job),
reusing the API's ``matching_service`` so the score math is identical whether it
runs synchronously (POST /match/compute) or in the background (CV upload or a
new job save). Records an ``enrichment_jobs`` row so ``/jobs-status/{id}`` can
poll progress.
"""

import logging
import uuid
from datetime import UTC, datetime

from celery import shared_task

logger = logging.getLogger(__name__)


def _session():
    from app.db.session import SessionLocal

    return SessionLocal()


@shared_task(name="compute_match")
def compute_match(user_id: str | None = None, job_id: str | None = None) -> dict:
    from app.models import EnrichmentJob, User
    from app.services import matching_service

    db = _session()
    job_row: EnrichmentJob | None = None
    try:
        if user_id is None:
            raise ValueError("compute_match requires a user_id")

        user = db.get(User, uuid.UUID(user_id))
        if user is None:
            return {"status": "failed", "error": "user not found"}

        job_row = EnrichmentJob(
            user_id=user.id,
            entity_type="user",
            entity_id=user.id,
            job_type="compute_match",
            status="running",
            started_at=datetime.now(UTC),
        )
        db.add(job_row)
        db.commit()
        db.refresh(job_row)

        job_uuid = uuid.UUID(job_id) if job_id else None
        count = matching_service.recompute_user(db, user, job_uuid)

        job_row.status = "succeeded"
        job_row.finished_at = datetime.now(UTC)
        db.commit()
        return {"status": "succeeded", "computed_scores": count}
    except Exception as exc:
        logger.exception("compute_match failed for user %s", user_id)
        db.rollback()
        if job_row is not None and job_row.id is not None:
            job_row = db.get(EnrichmentJob, job_row.id)
            if job_row is not None:
                job_row.status = "failed"
                job_row.error = str(exc)[:500]
                job_row.finished_at = datetime.now(UTC)
                db.commit()
        return {"status": "failed", "error": str(exc)[:500]}
    finally:
        db.close()