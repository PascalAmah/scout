import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "api"))

# Load config before any task module reads it. Precedence (highest wins):
#   1. already-set environment variables
#   2. apps/worker/.env        (worker-local overrides)
#   3. repo-root .env          (canonical shared config: AI, DB, Redis, auth)
# A later load_dotenv never overrides an earlier value, so root provides
# defaults and apps/worker/.env can tune worker-specific knobs.
from dotenv import load_dotenv  # noqa: E402

load_dotenv(Path(__file__).resolve().parents[2] / ".env")
load_dotenv(Path(__file__).resolve().parent / ".env")

from celery import Celery  # noqa: E402

from beat_schedule import beat_schedule  # noqa: E402
from queues import QUEUE_ENRICHMENT, QUEUE_GENERATION, QUEUE_SCHEDULED  # noqa: E402

BROKER_URL = os.getenv("REDIS_URL", "redis://127.0.0.1:6379/0")

celery_app = Celery(
    "scout-worker",
    broker=BROKER_URL,
    backend=BROKER_URL,
    include=[
        "tasks.enrich_startup",
        "tasks.refresh_embeddings",
        "tasks.compute_match",
        "tasks.generate_resume",
        "tasks.generate_cover_letter",
        "tasks.follow_up",
        "tasks.reminder_email",
        "tasks.sync_company",
    ],
)

celery_app.conf.update(
    task_default_queue=QUEUE_ENRICHMENT,
    # Routes tell the broker where tasks should go; worker_queues tells THIS
    # worker which queues to consume. Without worker_queues the worker only
    # consumes task_default_queue (enrichment) and generation/scheduled tasks
    # sit in their queues forever — resume/cover-letter generation included.
    task_routes={
        "enrich_startup": {"queue": QUEUE_ENRICHMENT},
        "refresh_embeddings": {"queue": QUEUE_ENRICHMENT},
        "compute_match": {"queue": QUEUE_ENRICHMENT},
        "generate_resume": {"queue": QUEUE_GENERATION},
        "generate_cover_letter": {"queue": QUEUE_GENERATION},
        "sync_company": {"queue": QUEUE_SCHEDULED},
    },
    worker_queues=[QUEUE_ENRICHMENT, QUEUE_GENERATION, QUEUE_SCHEDULED],
    beat_schedule=beat_schedule,
    task_acks_late=True,
    worker_prefetch_multiplier=1,
    broker_connection_retry_on_startup=True,
    timezone="UTC",
    enable_utc=True,
)