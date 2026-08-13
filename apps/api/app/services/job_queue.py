import logging
import uuid
from typing import Any

from app.config import settings

logger = logging.getLogger(__name__)

try:
    from celery import Celery  # type: ignore[import-not-found]

    _producer = Celery("scout-api", broker=settings.redis_url)
    _celery_available = True
except ImportError:  # pragma: no cover
    _celery_available = False
    _producer = None

QUEUE_ENRICHMENT = "enrichment"


def enqueue_enrich_startup(startup_id: uuid.UUID, user_id: uuid.UUID | None) -> None:
    """Enqueue startup enrichment. Degrades to a no-op (job stays queued) when the
    broker is unreachable or celery isn't installed, so saves still succeed even
    if the worker is down."""
    _send(
        "enrich_startup",
        {"startup_id": str(startup_id), "user_id": str(user_id) if user_id else None},
        queue=QUEUE_ENRICHMENT,
    )


def _send(name: str, kwargs: dict[str, Any], queue: str) -> None:
    if not _celery_available:
        return
    try:
        assert _producer is not None
        _producer.send_task(name, kwargs=kwargs, queue=queue)
    except Exception:
        logger.exception("Failed to enqueue %s on queue %s; leaving job row queued", name, queue)