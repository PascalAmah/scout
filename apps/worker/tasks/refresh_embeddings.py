"""refresh_embeddings task — Phase 4/6+ (placeholder)."""

from celery import shared_task


@shared_task(name="refresh_embeddings")
def run(*_args, **_kwargs) -> dict:
    return {"status": "not_implemented"}
