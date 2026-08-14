"""generate_resume task — tailored resume generation.

Grounding (AI_DESIGN): base resume/CV structured data + job + company enrichment
+ the stored match explanation, with an explicit no-fabrication constraint in the
prompt. Every run appends an immutable ``resume_versions`` row — regeneration
never overwrites history. ``reviewed_at`` stays null until the user explicitly
reviews the version (review gate).
"""

import json
import logging
import uuid
from copy import deepcopy
from datetime import UTC, datetime

from celery import shared_task
from sqlalchemy import select

logger = logging.getLogger(__name__)


def _session():
    from app.db.session import SessionLocal

    return SessionLocal()


def _grounding_text(
    base, job, startup, match, user_name: str | None, tone: str, emphasize: list[str]
) -> str:
    from app.services.matching_service import _job_text

    return json.dumps(
        {
            "base_resume": base,
            "job": {"title": job.title, "description": job.description},
            "company_summary": startup.summary if startup else None,
            "match": match,
            "tone": tone,
            "emphasize": emphasize,
            "candidate_name": user_name,
        },
        default=str,
    )


def _heuristic_resume(base, match) -> dict:
    """Deterministic reshaping that never fabricates: copy the base resume, then
    move matched/emphasized skills to the front of the skills list."""
    content = deepcopy(base) if isinstance(base, dict) else {}
    content.setdefault("summary", "")
    skills = list(content.get("skills") or [])
    matched = [s for s in (match or {}).get("matched_skills") or [] if s in skills]
    reordered = list(dict.fromkeys([*matched, *skills]))
    content["skills"] = reordered
    content.setdefault("experience", [])
    content.setdefault("education", [])
    content.setdefault("projects", [])
    return content


def _resume_from_cv(structured: dict) -> dict:
    roles = structured.get("roles") or []
    years = structured.get("years_of_experience")
    summary_parts = [f"{roles[0]}"] if roles else []
    if years is not None:
        summary_parts.append(f"with {years} years of experience")
    return {
        "summary": (", ".join(summary_parts) + ".") if summary_parts else "",
        "skills": [str(s) for s in structured.get("skills") or []],
        "experience": [],
        "education": [dict(e) for e in (structured.get("education") or [])],
        "projects": [],
    }


@shared_task(name="generate_resume", bind=True, max_retries=2, default_retry_delay=30)
def generate_resume(
    self,
    resume_id: str,
    job_id: str,
    startup_id: str,
    user_id: str,
    application_id: str | None = None,
    tone: str = "concise",
    emphasize: list | None = None,
    job_row_id: str | None = None,
) -> dict:
    from app.models import (
        Application,
        CVProfile,
        EnrichmentJob,
        Job,
        MatchScore,
        Resume,
        ResumeVersion,
        Startup,
        User,
    )

    from tasks.llm import GEN_MODEL, structured_call
    from tasks.prompts import load_prompt

    db = _session()
    job_row: EnrichmentJob | None = None
    try:
        resume = db.get(Resume, uuid.UUID(resume_id))
        job = db.get(Job, uuid.UUID(job_id))
        startup = db.get(Startup, uuid.UUID(startup_id))
        user = db.get(User, uuid.UUID(user_id))
        if resume is None or job is None or startup is None or user is None:
            raise ValueError("resume/job/startup/user not found")

        if job_row_id:
            job_row = db.get(EnrichmentJob, uuid.UUID(job_row_id))
        if job_row is not None and job_row.status in ("queued", "running"):
            job_row.status = "running"
            job_row.started_at = datetime.now(UTC)
            db.commit()

        application = None
        if application_id:
            application = db.get(Application, uuid.UUID(application_id))

        profile = db.scalar(select(CVProfile).where(CVProfile.user_id == user.id))
        match = db.scalar(
            select(MatchScore).where(MatchScore.user_id == user.id, MatchScore.job_id == job.id)
        )

        if resume.content:
            base = resume.content
        elif profile and profile.structured_data:
            base = _resume_from_cv(profile.structured_data)
        else:
            base = {"summary": "", "skills": [], "experience": [], "education": [], "projects": []}

        grounding = _grounding_text(
            base,
            job,
            startup,
            match.explanation if match else None,
            user.full_name,
            tone,
            list(emphasize or []),
        )

        content: dict | None = None
        model = "heuristic"
        try:
            result = structured_call(load_prompt("generate_resume.v1"), grounding, GEN_MODEL)
            if isinstance(result, dict):
                content = result
                model = GEN_MODEL
        except Exception as exc:  # defensive — structured_call already swallows
            logger.exception("LLM resume generation failed; falling back: %s", exc)
            content = None
        if content is None:
            content = _heuristic_resume(base, match.explanation if match else None)

        version = ResumeVersion(
            resume_id=resume.id,
            application_id=application.id if application else None,
            content=content,
            generated_by_model=model,
        )
        db.add(version)
        db.flush()

        if job_row is not None and job_row.status == "running":
            job_row.status = "succeeded"
            job_row.finished_at = datetime.now(UTC)
        db.commit()
        logger.info("generated resume version %s for resume %s", version.id, resume.id)
        return {"status": "succeeded", "version_id": str(version.id), "model": model}
    except Exception as exc:
        logger.exception("generate_resume failed for resume %s", resume_id)
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