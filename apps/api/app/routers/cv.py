from fastapi import APIRouter, Depends, File, Form, UploadFile
from sqlalchemy.orm import Session

from app.core.errors import ScoutError
from app.db.session import get_db
from app.deps import get_current_user
from app.models import User
from app.schemas.cv import CVProfileOut
from app.services import cv_service

router = APIRouter(prefix="/cv", tags=["cv"])


@router.get("", response_model=CVProfileOut)
def get_cv(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> CVProfileOut:
    profile = cv_service.get_cv(db, user)
    return CVProfileOut.model_validate(profile)


@router.post("", response_model=CVProfileOut, status_code=200)
def upload_cv(
    file: UploadFile | None = File(default=None),
    text: str | None = Form(default=None),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> CVProfileOut:
    """Upload or replace the active CV — either a file (PDF/text) or raw text."""
    if file is not None and file.filename:
        raw = file.file.read()
        raw_text = cv_service.extract_text(file.filename, raw)
        source_file_key = file.filename
    elif text:
        raw_text = text.strip()
        source_file_key = None
    else:
        raise ScoutError(
            "CV_REQUIRED", "Provide a CV as a file upload or raw text.", status_code=422
        )

    profile = cv_service.upsert_cv(db, user, raw_text, source_file_key)
    return CVProfileOut.model_validate(profile)