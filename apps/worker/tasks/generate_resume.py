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
    fallback_summary = (", ".join(summary_parts) + ".") if summary_parts else ""
    education = []
    for e in structured.get("education") or []:
        # Heuristic parse stores labels as strings; keep dict entries as-is.
        education.append(dict(e) if isinstance(e, dict) else {"degree": str(e)})
    return {
        "summary": (structured.get("summary") or "").strip() or fallback_summary,
        "skills": [str(s) for s in structured.get("skills") or []],
        "experience": [
            dict(e) for e in (structured.get("experience") or []) if isinstance(e, dict)
        ],
        "education": education,
        "projects": [],
        "name": (structured.get("name") or "").strip() or None,
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
            # deepcopy so the in-place merges below never dirty the stored row.
            base = deepcopy(resume.content)
            # Upgrade path: base resumes created before the CV parse extracted
            # experience/education have empty sections. Backfill them from the
            # CV so generation has real content to reshape — never overwrite
            # non-empty sections (the base resume stays the source of truth).
            if profile and profile.structured_data:
                structured = profile.structured_data
                if not base.get("experience") and structured.get("experience"):
                    base["experience"] = [
                        dict(e) for e in structured["experience"] if isinstance(e, dict)
                    ]
                if not base.get("education") and structured.get("education"):
                    base["education"] = [
                        dict(e) if isinstance(e, dict) else {"degree": str(e)}
                        for e in structured["education"]
                    ]
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
            result = structured_call(load_prompt("generate_resume"), grounding, GEN_MODEL)
            if isinstance(result, dict):
                content = result
                model = GEN_MODEL
        except Exception as exc:  # defensive — structured_call already swallows
            logger.exception("LLM resume generation failed; falling back: %s", exc)
            content = None
        if content is None:
            content = _heuristic_resume(base, match.explanation if match else None)

        # Carry the candidate's name into every version so the rendered PDF
        # shows it instead of a generic "Resume" header. Prefer the account
        # name, then the base resume, then the CV parse directly (covers base
        # resumes created before the parse extracted a name).
        candidate_name = (user.full_name or "").strip() or (base.get("name") or "").strip()
        if (
            not candidate_name
            and profile
            and profile.structured_data
            and profile.structured_data.get("name")
        ):
            candidate_name = str(profile.structured_data.get("name")).strip()
        if candidate_name:
            content.setdefault("name", candidate_name)

        # Stamp the role label so the UI can name this version even when it was
        # generated from a job (matches page) rather than an application — the
        # version row has no application_id to derive a label from. "Engineer @
        # Acme" style, used by Resume Studio's version list. Hard-set (not
        # setdefault) so a stray key from the LLM/heuristic output can never
        # override the authoritative "job @ startup" label.
        content["role_label"] = f"{job.title} @ {startup.name}"

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