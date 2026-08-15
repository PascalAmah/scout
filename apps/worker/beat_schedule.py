"""Celery Beat schedule — retention + periodic sync jobs.

``scan_follow_ups`` raises ``follow_up_due`` notifications for applications past
the time-since-``applied_at`` threshold (the in-app pull for the retention loop).
``send_reminder_emails`` emails opted-in users a daily digest of unread
notifications (the push half of the loop).
"""

from celery.schedules import crontab

beat_schedule = {
    # Retention loop (Phase 4): daily check for applications needing follow-up.
    "scan-follow-ups-daily": {
        "task": "scan_follow_ups",
        "schedule": crontab(hour=7, minute=0),
    },
    # Retention loop (Phase 4): daily opt-in digest email of unread notifications.
    "send-reminder-emails-daily": {
        "task": "send_reminder_emails",
        "schedule": crontab(hour=8, minute=0),
    },
    # Expansion (Phase 6): server-initiated source sync. Compliance is hard-
    # gated inside sync_company (source_registry tiers) — restricted and
    # user_capture-only sources refuse to run even if scheduled.
    "sync-techstars-daily": {
        "task": "sync_company",
        "schedule": crontab(hour=5, minute=30),
        "kwargs": {"source": "techstars", "discovery": True},
    },
    "sync-producthunt-daily": {
        "task": "sync_company",
        "schedule": crontab(hour=6, minute=0),
        "kwargs": {"source": "producthunt", "discovery": True},
    },
}

# Keep the name stable for future importers.
schedule = beat_schedule