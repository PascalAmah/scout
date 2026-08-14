"""resume_service — Resume Studio business logic.

Owns the ``resumes`` (base, editable) and ``resume_versions`` (immutable generated
snapshots) resources. Generation is asynchronous: the endpoint records an
``enrichment_jobs`` row and enqueues a ``generate_resume`` task on the
``generation`` queue; the worker inserts the new ``resume_versions`` row. The
full contract (grounding, no-fabrication) lives in the worker task + prompt.
"""

import uuid

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.errors import ScoutError
from app.models import (
    Application,
    EnrichmentJob,
    Job,
    Resume,
    ResumeVersion,
    SavedStartup,
    Startup,
    User,
)
from app.schemas.resume import ResumeCreate, ResumeGenerateRequest, ResumePatch
from app.services import job_queue, review_gate


def _owned_resume(db: Session, user: User, resume_id: uuid.UUID) -> Resume:
    row = db.scalar(
        select(Resume).where(Resume.id == resume_id, Resume.user_id == user.id)
    )
    if row is None:
        raise ScoutError("RESUME_NOT_FOUND", "No resume found with that id.", status_code=404)
    return row


def get_resume(db: Session, user: User, resume_id: uuid.UUID) -> Resume:
    return _owned_resume(db, user, resume_id)


def create_resume(db: Session, user: User, body: ResumeCreate) -> Resume:
    is_base = db.scalar(
        select(Resume).where(Resume.user_id == user.id, Resume.is_base.is_(True))
    ) is None
    row = Resume(
        user_id=user.id,
        title=body.title or "My Resume",
        is_base=is_base,
        content=body.content,
    )
    db.add(row)
    db.commit()
    return _owned_resume(db, user, row.id)


def list_resumes(db: Session, user: User) -> list[Resume]:
    return list(
        db.scalars(
            select(Resume).where(Resume.user_id == user.id).order_by(Resume.created_at.desc())
        ).all()
    )


def update_resume(db: Session, user: User, resume_id: uuid.UUID, body: ResumePatch) -> Resume:
    resume = _owned_resume(db, user, resume_id)
    if body.title is not None:
        resume.title = body.title
    if body.content is not None:
        resume.content = body.content
    db.add(resume)
    db.commit()
    return _owned_resume(db, user, resume_id)


def determine_target_job(
    db: Session, user: User, request: ResumeGenerateRequest
) -> tuple[Job, "Startup"]:
    """Resolve which job a generation targets, enforcing the user's workspace."""
    selected_job: Job | None
    if request.application_id is not None:
        app = db.scalar(
            select(Application).where(
                Application.id == request.application_id, Application.user_id == user.id
            )
        )
        if app is None or app.job_id is None:
            raise ScoutError(
                "JOB_REQUIRED", "The application has no attached job.", status_code=400
            )
        selected_job = app.job
    elif request.job_id is not None:
        selected_job = db.get(Job, request.job_id)
        if selected_job is None:
            raise ScoutError("JOB_NOT_FOUND", "No job found with that id.", status_code=404)
        saved = db.scalar(
            select(SavedStartup).where(
                SavedStartup.user_id == user.id,
                SavedStartup.startup_id == selected_job.startup_id,
                SavedStartup.status != "archived",
            )
        )
        if saved is None:
            raise ScoutError("JOB_NOT_FOUND", "No job found with that id.", status_code=404)
    else:
        raise ScoutError("JOB_REQUIRED", "Provide an application_id or job_id.", status_code=400)

    if selected_job is None:
        raise ScoutError("JOB_NOT_FOUND", "No job found with that id.", status_code=404)
    job = selected_job
    startup = db.get(Startup, job.startup_id)
    if startup is None:
        raise ScoutError("STARTUP_NOT_FOUND", "Startup missing.", status_code=404)
    return job, startup


def enqueue_generate(
    db: Session, user: User, resume: Resume, request: ResumeGenerateRequest
) -> EnrichmentJob:
    job, startup = determine_target_job(db, user, request)
    application_id = str(request.application_id) if request.application_id else None
    job_row = EnrichmentJob(
        user_id=user.id,
        entity_type="resume",
        entity_id=resume.id,
        job_type="generate_resume",
        status="queued",
    )
    db.add(job_row)
    db.commit()
    db.refresh(job_row)

    job_queue.enqueue_generate_resume(
        resume_id=str(resume.id),
        job_id=str(job.id),
        startup_id=str(startup.id),
        user_id=str(user.id),
        application_id=application_id,
        tone=request.tone,
        emphasize=list(request.emphasize),
        job_row_id=str(job_row.id),
    )
    return job_row


def list_versions(db: Session, user: User, resume_id: uuid.UUID) -> list[ResumeVersion]:
    _owned_resume(db, user, resume_id)
    return list(
        db.scalars(
            select(ResumeVersion)
            .where(ResumeVersion.resume_id == resume_id)
            .order_by(ResumeVersion.created_at.desc())
        ).all()
    )


def _owned_version(db: Session, user: User, version_id: uuid.UUID) -> ResumeVersion:
    row = db.scalar(
        select(ResumeVersion)
        .join(Resume, Resume.id == ResumeVersion.resume_id)
        .where(ResumeVersion.id == version_id, Resume.user_id == user.id)
    )
    if row is None:
        raise ScoutError(
            "RESUME_VERSION_NOT_FOUND", "No resume version found with that id.", status_code=404
        )
    return row


def get_version(db: Session, user: User, version_id: uuid.UUID) -> ResumeVersion:
    return _owned_version(db, user, version_id)


def review_version(db: Session, user: User, version_id: uuid.UUID) -> ResumeVersion:
    version = _owned_version(db, user, version_id)
    return review_gate.mark_reviewed(db, version)