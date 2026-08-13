import uuid

from fastapi import APIRouter, Depends, Response, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.errors import ScoutError
from app.db.session import get_db
from app.deps import get_current_user
from app.models import SavedStartup, User
from app.schemas.startup import FounderOut, FounderPatch
from app.services import startup_service

router = APIRouter(prefix="/founders", tags=["founders"])


def _ensure_workspace(db: Session, user: User, startup_id: uuid.UUID) -> None:
    row = db.scalar(
        select(SavedStartup).where(
            SavedStartup.user_id == user.id, SavedStartup.startup_id == startup_id
        )
    )
    if row is None:
        raise ScoutError(
            "STARTUP_NOT_SAVED", "This startup is not in your workspace.", status_code=404
        )


def _owned_founder(db: Session, user: User, founder_id: uuid.UUID):
    founder = startup_service.get_founder(db, founder_id)
    _ensure_workspace(db, user, founder.startup_id)
    return founder


@router.patch("/{founder_id}", response_model=FounderOut)
def patch_founder(
    founder_id: uuid.UUID,
    body: FounderPatch,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> FounderOut:
    _owned_founder(db, user, founder_id)
    return FounderOut.model_validate(startup_service.patch_founder(db, founder_id, body))


@router.delete("/{founder_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_founder(
    founder_id: uuid.UUID,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> Response:
    _owned_founder(db, user, founder_id)
    startup_service.delete_founder(db, founder_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)