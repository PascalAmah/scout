import logging
import uuid
from typing import Any

from app.config import settings

logger = logging.getLogger(__name__)

try:
    from celery import Celery  # type: ignore[import-untyped, import-not-found]

    _producer = Celery("scout-api", broker=settings.redis_url)
    _celery_available = True
except ImportError:  # pragma: no cover
    _celery_available = False
    _producer = None

QUEUE_ENRICHMENT = "enrichment"
QUEUE_GENERATION = "generation"


def enqueue_enrich_startup(startup_id: uuid.UUID, user_id: uuid.UUID | None) -> None:
    """Enqueue startup enrichment. Degrades to a no-op (job stays queued) when the
    broker is unreachable or celery isn't installed, so saves still succeed even
    if the worker is down."""
    _send(
        "enrich_startup",
        {"startup_id": str(startup_id), "user_id": str(user_id) if user_id else None},
        queue=QUEUE_ENRICHMENT,
    )


def enqueue_refresh_embeddings(entity: str, entity_id: str) -> None:
    """Enqueue an idempotent embedding refresh for a cv / startup / job entity.

    This is the partial-failure path from AI_DESIGN.md: if extraction succeeds but
    embedding fails, only this step is retried, not the whole enrichment run."""
    _send(
        "refresh_embeddings",
        {"entity": entity, "entity_id": entity_id},
        queue=QUEUE_ENRICHMENT,
    )


def enqueue_compute_match(user_id: str, job_id: str | None = None) -> None:
    """Enqueue Stage 1 match-score recomputation for a user (optionally one job)."""
    kwargs = {"user_id": user_id}
    if job_id:
        kwargs["job_id"] = job_id
    _send("compute_match", kwargs, queue=QUEUE_ENRICHMENT)


def enqueue_generate_resume(
    *,
    resume_id: str,
    job_id: str,
    startup_id: str,
    user_id: str,
    application_id: str | None,
    tone: str,
    emphasize: list[str],
    job_row_id: str,
) -> None:
    job_queue_kwargs = {
        "resume_id": resume_id,
        "job_id": job_id,
        "startup_id": startup_id,
        "user_id": user_id,
        "application_id": application_id,
        "tone": tone,
        "emphasize": emphasize,
        "job_row_id": job_row_id,
    }
    _send("generate_resume", job_queue_kwargs, queue=QUEUE_GENERATION)


def enqueue_generate_cover_letter(
    *, application_id: str, channel: str, user_id: str, job_row_id: str
) -> None:
    _send(
        "generate_cover_letter",
        {
            "application_id": application_id,
            "channel": channel,
            "user_id": user_id,
            "job_row_id": job_row_id,
        },
        queue=QUEUE_GENERATION,
    )


def _send(name: str, kwargs: dict[str, Any], queue: str) -> None:
    if not _celery_available:
        return
    try:
        assert _producer is not None
        _producer.send_task(name, kwargs=kwargs, queue=queue)
    except Exception:
        logger.exception("Failed to enqueue %s on queue %s; leaving job row queued", name, queue)