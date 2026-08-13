"""generate_cover_letter task — Phase 4/6+ (placeholder)."""

from celery import shared_task


@shared_task(name="generate_cover_letter")
def run(*_args, **_kwargs) -> dict:
    return {"status": "not_implemented"}
