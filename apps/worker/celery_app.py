import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "api"))

from celery import Celery  # noqa: E402
from queues import QUEUE_ENRICHMENT, QUEUE_GENERATION, QUEUE_SCHEDULED  # noqa: E402

BROKER_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")

celery_app = Celery(
    "scout-worker",
    broker=BROKER_URL,
    backend=BROKER_URL,
    include=["tasks.enrich_startup"],
)

celery_app.conf.update(
    task_default_queue=QUEUE_ENRICHMENT,
    task_routes={
        "enrich_startup": {"queue": QUEUE_ENRICHMENT},
        "refresh_embeddings": {"queue": QUEUE_ENRICHMENT},
        "generate_resume": {"queue": QUEUE_GENERATION},
        "generate_cover_letter": {"queue": QUEUE_GENERATION},
        "sync_company": {"queue": QUEUE_SCHEDULED},
    },
    task_acks_late=True,
    worker_prefetch_multiplier=1,
    broker_connection_retry_on_startup=True,
    timezone="UTC",
    enable_utc=True,
)