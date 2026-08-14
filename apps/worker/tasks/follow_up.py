"""Follow-up tasks — the retention loop.

``scan_follow_ups`` (Celery Beat) walks active applications past the
time-since-``applied_at`` threshold and raises a ``follow_up_due`` notification
per application (never more than once per application, so it can't spam).
``generate_follow_up`` produces a suggested follow-up message on demand: it is
grounded on the application, job, company, the candidate's profile, and the last
outreach message, and is stored as an ``outreach`` row in ``draft`` so the review
gate applies before the user marks it sent — it is never auto-sent.
"""

import json
import logging
import uuid
from datetime import UTC, datetime

from celery import shared_task
from sqlalchemy import select

logger = logging.getLogger(__name__)


def _session():
    from app.db.session import SessionLocal

    return SessionLocal()


@shared_task(name="scan_follow_ups")
def scan_follow_ups(threshold_days: int | None = None) -> dict:
    from app.models import Application
    from app.services import follow_up_service

    db = _session()
    try:
        threshold = threshold_days or follow_up_service_threshold()
        due_user_ids = db.scalars(
            select(Application.user_id).distinct().where(
                Application.status.in_(follow_up_service.FOLLOW_UP_STATUSES)
            )
        ).all()
        created = 0
        for user_id in due_user_ids:
            for application in follow_up_service.due_applications(db, user_id, threshold):
                follow_up_service.raise_follow_up_notice(db, application)
                created += 1
        db.commit()
        logger.info("scan_follow_ups raised %d notifications", created)
        return {"status": "succeeded", "raised": created}
    except Exception as exc:
        logger.exception("scan_follow_ups failed")
        db.rollback()
        return {"status": "failed", "error": str(exc)[:500]}
    finally:
        db.close()


def follow_up_service_threshold() -> int:
    from app.config import settings

    return settings.follow_up_days


def _grounding(application, job, startup, match, profile, user, last_outreach) -> str:
    candidate_facts = {
        "name": user.full_name if user else None,
        "skills": (profile.structured_data or {}).get("skills") if profile else None,
        "roles": (profile.structured_data or {}).get("roles") if profile else None,
    }
    return json.dumps(
        {
            "candidate": candidate_facts,
            "job": {"title": job.title, "description": job.description} if job else None,
            "company_summary": startup.summary if startup else None,
            "match": match.explanation if match else None,
            "applied_days_ago": (
                (datetime.now(UTC) - application.applied_at).days
                if application.applied_at
                else None
            ),
            "previous_outreach": last_outreach.content if last_outreach else None,
        },
        default=str,
    )


def _heuristic_follow_up(application, job, startup, user_name: str | None) -> str:
    company = startup.name if startup else "your team"
    role = job.title if job else "the role"
    name = user_name or "I"
    return (
        f"Hi {company} team, I'm following up on my application for the {role} role "
        f"that {name} sent a short while ago. I remain very interested and would be "
        "happy to share more detail or hop on a quick call whenever works for you. "
        "Thanks for your time!"
    )


@shared_task(name="generate_follow_up", bind=True, max_retries=2, default_retry_delay=30)
def generate_follow_up(
    self,
    application_id: str,
    user_id: str | None = None,
    job_row_id: str | None = None,
) -> dict:
    from app.models import (
        Application,
        CVProfile,
        EnrichmentJob,
        Job,
        MatchScore,
        Outreach,
        Startup,
    )

    from tasks.llm import GEN_MODEL, text_call
    from tasks.prompts import load_prompt

    db = _session()
    job_row: EnrichmentJob | None = None
    try:
        application = db.get(Application, uuid.UUID(application_id))
        if application is None:
            raise ValueError("application not found")

        if job_row_id:
            job_row = db.get(EnrichmentJob, uuid.UUID(job_row_id))
        if job_row is not None and job_row.status in ("queued", "running"):
            job_row.status = "running"
            job_row.started_at = datetime.now(UTC)
            db.commit()

        job = db.get(Job, application.job_id) if application.job_id else None
        startup = db.get(Startup, application.startup_id) if application.startup_id else None
        from app.models import User

        user = db.get(User, application.user_id)
        profile = (
            db.scalar(select(CVProfile).where(CVProfile.user_id == application.user_id))
            if user
            else None
        )
        match = None
        if job is not None and user is not None:
            match = db.scalar(
                select(MatchScore).where(
                    MatchScore.user_id == user.id, MatchScore.job_id == job.id
                )
            )
        last_outreach = db.scalar(
            select(Outreach)
            .where(Outreach.application_id == application.id)
            .order_by(Outreach.created_at.desc())
            .limit(1)
        )

        grounding = _grounding(
            application, job, startup, match, profile, user, last_outreach
        )

        content: str | None = None
        model = "heuristic"
        try:
            generated = text_call(load_prompt("generate_follow_up.v1"), grounding, GEN_MODEL)
            if generated:
                content = generated
                model = GEN_MODEL
        except Exception:
            content = None
        if content is None:
            content = _heuristic_follow_up(application, job, startup, user.full_name if user else None)

        outreach = Outreach(
            application_id=application.id,
            channel="email",
            content=content,
            status="draft",
        )
        db.add(outreach)
        db.flush()

        if job_row is not None and job_row.status == "running":
            job_row.status = "succeeded"
            job_row.finished_at = datetime.now(UTC)
        db.commit()
        logger.info("generated follow-up outreach %s for application %s", outreach.id, application.id)
        return {"status": "succeeded", "outreach_id": str(outreach.id), "model": model}
    except Exception as exc:
        logger.exception("generate_follow_up failed for application %s", application_id)
        db.rollback()
        if job_row is not None and job_row.id is not None:
            job_row = db.get(EnrichmentJob, job_row.id)
            if job_row is not None:
                job_row.status = "failed"
                job_row.error = str(exc)[:500]
                job_row.finished_at = datetime.now(UTC)
                db.commit()
        try:
            self.retry(exc=exc)
        except Exception:
            return {"status": "failed", "error": str(exc)[:500]}
    finally:
        db.close()
    return {"status": "failed"}
