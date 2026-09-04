import uuid

from fastapi import APIRouter, Depends, File, Form, UploadFile
from sqlalchemy.orm import Session

from app.core.errors import ScoutError
from app.db.session import get_db
from app.deps import get_current_user
from app.models import User
from app.schemas.cv import CVProfileOut, CVProfilePatch
from app.services import cv_service

router = APIRouter(prefix="/cv", tags=["cv"])


def _extract_upload(file: UploadFile | None, text: str | None) -> tuple[str, str | None]:
    if file is not None and file.filename:
        raw = file.file.read()
        return cv_service.extract_text(file.filename, raw), file.filename
    if text:
        return text.strip(), None
    raise ScoutError("CV_REQUIRED", "Provide a CV as a file upload or raw text.", status_code=422)


@router.get("", response_model=CVProfileOut)
def get_cv(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> CVProfileOut:
    """The user's default (active) CV profile."""
    return CVProfileOut.model_validate(cv_service.get_cv(db, user))


@router.post("", response_model=CVProfileOut, status_code=200)
def upload_cv(
    file: UploadFile | None = File(default=None),
    text: str | None = Form(default=None),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> CVProfileOut:
    """Upload or replace the default CV profile — either a file (PDF/text) or raw text."""
    raw_text, source_file_key = _extract_upload(file, text)
    return CVProfileOut.model_validate(cv_service.upsert_cv(db, user, raw_text, source_file_key))


@router.get("/profiles", response_model=list[CVProfileOut])
def list_profiles(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> list[CVProfileOut]:
    return [CVProfileOut.model_validate(p) for p in cv_service.list_profiles(db, user)]


@router.post("/profiles", response_model=CVProfileOut, status_code=201)
def create_profile(
    name: str = Form(...),
    file: UploadFile | None = File(default=None),
    text: str | None = Form(default=None),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> CVProfileOut:
    """Create a new named CV profile (e.g. \"backend\" vs \"product\"). The first
    profile a user creates becomes their default."""
    raw_text, source_file_key = _extract_upload(file, text)
    return CVProfileOut.model_validate(
        cv_service.create_profile(db, user, name, raw_text, source_file_key)
    )


@router.patch("/profiles/{profile_id}", response_model=CVProfileOut)
def patch_profile(
    profile_id: uuid.UUID,
    body: CVProfilePatch,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> CVProfileOut:
    """Rename a profile and/or promote it to default."""
    return CVProfileOut.model_validate(
        cv_service.update_profile(
            db, user, profile_id, name=body.name, is_default=body.is_default
        )
    )


@router.delete("/profiles/{profile_id}", status_code=204)
def delete_profile(
    profile_id: uuid.UUID,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> None:
    """Delete a profile. Deleting the default promotes the oldest remaining one."""
    cv_service.delete_profile(db, user, profile_id)
