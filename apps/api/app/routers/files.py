import uuid

from fastapi import APIRouter, Depends
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.core.errors import ScoutError
from app.db.session import get_db
from app.deps import get_current_user
from app.models import User
from app.services import file_store, resume_service

router = APIRouter(prefix="/files", tags=["files"])

_RESUME_PREFIX = "resume-versions/"


@router.get("/{key:path}")
def get_file(
    key: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> FileResponse:
    """Serve a stored object by key, scoped to the current user's ownership.

    Only keys under known namespaces are servable; anything else is rejected so
    a user can never address another user's (or arbitrary) files.
    """
    key = key.lstrip("/")
    if not key.startswith(_RESUME_PREFIX) or not key.endswith(".pdf"):
        raise ScoutError("FILE_FORBIDDEN", "This file is not accessible.", status_code=403)

    version_id_str = key[len(_RESUME_PREFIX) : -len(".pdf")]
    try:
        version_id = uuid.UUID(version_id_str)
    except ValueError:
        raise ScoutError("FILE_FORBIDDEN", "This file is not accessible.", status_code=403) from None

    # Ownership check: get_version raises 404 unless the version belongs to `user`.
    resume_service.get_version(db, user, version_id)

    if not file_store.exists(key):
        raise ScoutError("FILE_NOT_FOUND", "Rendered file not found.", status_code=404)

    return FileResponse(
        file_store.resolve_path(key),
        media_type="application/pdf",
        filename=f"resume-{version_id_str}.pdf",
    )
