"""enrich_startup task — the Phase 1 enrichment pipeline.

fetch → clean → content-hash check → extract (LLM or heuristic) → persist →
mark enrichment_jobs succeeded/failed → insert a notifications row.
"""

import logging
import uuid
from datetime import UTC, datetime

from celery import shared_task
from sqlalchemy import select

logger = logging.getLogger(__name__)


def _session():
    from app.db.session import SessionLocal

    return SessionLocal()


def _notify(db, user_id: uuid.UUID, startup, summary) -> None:
    from app.models import Notification

    title = "Enrichment complete"
    body = f"{startup.name} was enriched"
    if summary:
        body = f"{startup.name}: {summary[:160]}"
    db.add(
        Notification(
            user_id=user_id,
            type="enrichment_complete",
            entity_type="startup",
            entity_id=startup.id,
            title=title,
            body=body,
        )
    )


@shared_task(name="enrich_startup", bind=True, max_retries=3, default_retry_delay=60)
def enrich_startup(self, startup_id: str, user_id: str | None = None) -> dict:
    from adapters import get_adapter

    from app.models import EnrichmentJob, Startup
    from tasks.enrich_cache import cache
    from tasks.extract import content_hash, extract_company

    startup_uuid = uuid.UUID(startup_id)
    user_uuid = uuid.UUID(user_id) if user_id else None

    db = _session()
    try:
        startup = db.get(Startup, startup_uuid)
        if startup is None:
            return {"status": "failed", "error": "startup not found"}

        job = db.scalar(
            select(EnrichmentJob)
            .where(
                EnrichmentJob.entity_type == "startup",
                EnrichmentJob.entity_id == startup.id,
                EnrichmentJob.job_type == "enrich_startup",
            )
            .order_by(EnrichmentJob.created_at.desc())
            .limit(1)
        )
        if job is not None and job.status in ("queued", "running"):
            job.status = "running"
            job.started_at = datetime.now(UTC)
            db.commit()

        # Fetch + clean via the source adapter.
        adapter = get_adapter(startup.source or "generic_careers")
        if adapter is None:
            raise ValueError(f"no adapter for source '{startup.source}'")
        source_url = startup.source_url or (f"https://www.ycombinator.com/companies/{startup.name.lower().replace(' ', '-')}" if startup.source == "yc" else startup.website or "")
        if not source_url:
            raise ValueError("no source URL to enrich from")

        content = adapter.fetch(source_url)
        if not content.raw_text.strip():
            raise ValueError(f"empty content fetched from {source_url}")

        text_hash = content_hash(content.raw_text)
        if cache.last_hash(str(startup.id)) == text_hash and startup.last_enriched_at is not None:
            # Unchanged source — nothing new to extract.
            _finish(db, job, "succeeded")
            return {"status": "succeeded", "skipped": True}

        extracted = extract_company(content.raw_text)

        startup.summary = extracted.get("company_summary") or startup.summary
        startup.stage = extracted.get("stage") or startup.stage
        if extracted.get("hiring_signal") and extracted["hiring_signal"] != "unknown":
            startup.hiring_status = extracted["hiring_signal"]
        startup.tech_stack = extracted.get("tech_stack") or startup.tech_stack
        if extracted.get("tags"):
            startup.tags = list(dict.fromkeys([*(startup.tags or []), *extracted["tags"]]))
        startup.last_enriched_at = datetime.now(UTC)

        # Persist any jobs the adapter surfaced.
        from app.models import Job

        for job_data in content.jobs:
            title = job_data.get("title")
            if not title:
                continue
            existing = db.scalar(
                select(Job).where(Job.startup_id == startup.id, Job.title == title).limit(1)
            )
            if existing is None:
                db.add(Job(startup_id=startup.id, title=title, url=source_url))
        db.commit()

        cache.set_hash(str(startup.id), text_hash)
        if user_uuid is not None:
            _notify(db, user_uuid, startup, startup.summary)
            db.commit()

        _finish(db, job, "succeeded")
        logger.info("enriched startup %s", startup.id)
        return {"status": "succeeded", "skipped": False}
    except Exception as exc:
        logger.exception("enrich_startup failed for %s", startup_id)
        if job is not None and job.status in ("queued", "running"):
            job.status = "failed"
            job.error = str(exc)[:500]
            job.finished_at = datetime.now(UTC)
            db.commit()
        try:
            self.retry(exc=exc)
        except Exception:
            return {"status": "failed", "error": str(exc)[:500]}
    finally:
        db.close()
    return {"status": "failed"}


def _finish(db, job, status: str) -> None:
    from datetime import datetime

    if job is not None and job.status in ("queued", "running"):
        job.status = status
        job.finished_at = datetime.now(UTC)
        db.commit()