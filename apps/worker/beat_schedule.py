"""Celery Beat schedule — populated in Phase 4/6 (sync_company cadence etc.)."""


beat_schedule = {
    # Phase 6: gated by compliance tier inside the dispatcher.
    # "sync-wellfound-daily": {
    #     "task": "sync_company",
    #     "schedule": crontab(hour=3, minute=0),
    #     "kwargs": {"source": "wellfound"},
    # },
}

# Keep the name stable for future importers.
schedule = beat_schedule