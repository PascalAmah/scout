"""generate_cover_letter task — outreach copy generation.

Grounding (AI_DESIGN): candidate base-resume facts + job + company enrichment +
match explanation, with a no-fabrication constraint. Creates an ``outreach`` row
(starting ``draft``, ``reviewed_at`` null). The ``draft → sent`` transition is
blocked by the review gate until the user reviews it.
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


def _grounding(application, job, startup, match, profile, user) -> str:
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
        },
        default=str,
    )


def _heuristic_copy(application, job, startup, match, user_name: str | None) -> str:
    company = startup.name if startup else "the team"
    job_title = job.title if job else "role"
    summary = startup.summary if startup else ""
    summary_clause = f" {summary[:180]}" if summary else ""
    matched = ", ".join((match.explanation or {}).get("matched_skills") or []) or "your background"
    name = user_name or "the candidate"
    return (
        f"Hello {company} team,{summary_clause}\n\n"
        f"I'm {name}. I came across your {job_title} opening. My work centers on {matched}, "
        f"which lines up with what the role calls for.\n\n"
        "I'd welcome a conversation about how I can contribute. "
        "Thanks for your time."
    )


def _heuristic_dm(application, job, startup, match, user_name: str | None) -> str:
    company = startup.name if startup else "your team"
    job_title = job.title if job else "role"
    matched = ", ".join((match.explanation or {}).get("matched_skills") or []) or "my background"
    name = user_name or "I"
    return (
        f"Hi {company}, I saw you're hiring for a {job_title}. {name} have the {matched} "
        f"experience the role needs — happy to share more if you're open to a quick chat."
    )


def _copy_candidate_base(application, structured: dict, user_name: str | None) -> str:
    """Last-resort copy from CV structured data alone — never fabricates detail."""
    skills = ", ".join(str(s) for s in (structured or {}).get("skills") or []) or "relevant experience"
    name = user_name or ""
    greeting = f"I'm {name}. " if name else ""
    return (
        f"Hello,{greeting}My background is a strong fit for this role — I bring "
        f"experience across {skills}, and I'd love to discuss how that can help your team. "
        "Thanks for your time."
    )


@shared_task(name="generate_cover_letter", bind=True, max_retries=2, default_retry_delay=30)
def generate_cover_letter(
    self,
    application_id: str,
    channel: str = "email",
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
        User,
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

        user = db.get(User, application.user_id)
        job = db.get(Job, application.job_id) if application.job_id else None
        startup = db.get(Startup, application.startup_id) if application.startup_id else None
        profile = db.scalar(
            select(CVProfile).where(CVProfile.user_id == application.user_id)
        ) if user else None
        match = None
        if job is not None and user is not None:
            match = db.scalar(
                select(MatchScore).where(
                    MatchScore.user_id == user.id, MatchScore.job_id == job.id
                )
            )

        grounding = _grounding(application, job, startup, match, profile, user)
        is_dm = channel == "linkedin_dm"

        content: str | None = None
        model = "heuristic"
        try:
            prompt = load_prompt("generate_linkedin_dm" if is_dm else "generate_outreach")
            generated = text_call(prompt, grounding, GEN_MODEL)
            if generated:
                content = generated
                model = GEN_MODEL
        except Exception as exc:
            logger.exception("LLM outreach generation failed; falling back: %s", exc)
            content = None
        if content is None:
            if profile and profile.structured_data:
                content = _copy_candidate_base(application, profile.structured_data, user.full_name if user else None)
            elif is_dm:
                content = _heuristic_dm(application, job, startup, match, user.full_name if user else None)
            else:
                content = _heuristic_copy(application, job, startup, match, user.full_name if user else None)

        outreach = Outreach(
            application_id=application.id,
            channel=channel,
            content=content,
            status="draft",
        )
        db.add(outreach)
        db.flush()

        if job_row is not None and job_row.status == "running":
            job_row.status = "succeeded"
            job_row.finished_at = datetime.now(UTC)
        db.commit()
        logger.info("generated %s outreach %s for application %s", channel, outreach.id, application.id)
        return {"status": "succeeded", "outreach_id": str(outreach.id), "model": model}
    except Exception as exc:
        logger.exception("generate_cover_letter failed for application %s", application_id)
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