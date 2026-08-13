"""compute_match task — Phase 4/6+ (placeholder)."""

from celery import shared_task


@shared_task(name="compute_match")
def run(*_args, **_kwargs) -> dict:
    return {"status": "not_implemented"}
