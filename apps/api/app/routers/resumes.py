import uuid

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.deps import get_current_user
from app.models import User
from app.schemas.resume import (
    ResumeCreate,
    ResumeGenerateAccepted,
    ResumeGenerateRequest,
    ResumeOut,
    ResumePatch,
    ResumeVersionOut,
)
from app.services import resume_service, review_gate

router = APIRouter(prefix="/resumes", tags=["resumes"])
versions_router = APIRouter(prefix="/resume-versions", tags=["resumes"])


@router.get("", response_model=list[ResumeOut])
def list_resumes(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> list[ResumeOut]:
    return [ResumeOut.model_validate(r) for r in resume_service.list_resumes(db, user)]


@router.post("", response_model=ResumeOut, status_code=status.HTTP_201_CREATED)
def create_resume(
    body: ResumeCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> ResumeOut:
    return ResumeOut.model_validate(resume_service.create_resume(db, user, body))


@router.patch("/{resume_id}", response_model=ResumeOut)
def patch_resume(
    resume_id: uuid.UUID,
    body: ResumePatch,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> ResumeOut:
    return ResumeOut.model_validate(resume_service.update_resume(db, user, resume_id, body))


@router.get("/{resume_id}/versions", response_model=list[ResumeVersionOut])
def list_versions(
    resume_id: uuid.UUID,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> list[ResumeVersionOut]:
    return [
        ResumeVersionOut.model_validate(v) for v in resume_service.list_versions(db, user, resume_id)
    ]


@router.post(
    "/{resume_id}/generate",
    response_model=ResumeGenerateAccepted,
    status_code=status.HTTP_202_ACCEPTED,
)
def generate(
    resume_id: uuid.UUID,
    body: ResumeGenerateRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> ResumeGenerateAccepted:
    """Kick off an async tailored-resume generation for a job/application."""
    resume = resume_service.get_resume(db, user, resume_id)
    job_row = resume_service.enqueue_generate(db, user, resume, body)
    return ResumeGenerateAccepted(job_id=job_row.id, status="queued")


@versions_router.get("/{version_id}", response_model=ResumeVersionOut)
def get_version(
    version_id: uuid.UUID,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> ResumeVersionOut:
    return ResumeVersionOut.model_validate(resume_service.get_version(db, user, version_id))


@versions_router.post("/{version_id}/review", response_model=ResumeVersionOut)
def review_version(
    version_id: uuid.UUID,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> ResumeVersionOut:
    version = resume_service.review_version(db, user, version_id)
    return ResumeVersionOut.model_validate(version)


@versions_router.get("/{version_id}/download")
def download_version(
    version_id: uuid.UUID,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    version = resume_service.get_version(db, user, version_id)
    review_gate.require_reviewed(version)
    if version.file_key is None:
        from app.services import file_store, resume_renderer

        pdf = resume_renderer.render_pdf(version.content, candidate_name=user.full_name)
        key = f"resume-versions/{version.id}.pdf"
        file_store.write_bytes(key, pdf)
        version.file_key = key
        db.add(version)
        db.commit()
    return {"url": f"/v1/files/{version.file_key}"}


@versions_router.delete("/{version_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_version(
    version_id: uuid.UUID,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> None:
    resume_service.delete_version(db, user, version_id)