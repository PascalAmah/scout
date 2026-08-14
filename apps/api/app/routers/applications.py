import uuid

from fastapi import APIRouter, Depends, Query, Response, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.deps import get_current_user
from app.models import User
from app.schemas.application import (
    ApplicationCreate,
    ApplicationDetail,
    ApplicationOut,
    ApplicationPatch,
    LastOutreachRef,
    ResumeVersionRef,
    TimelineEvent,
)
from app.schemas.common import Page
from app.schemas.outreach import OutreachOut
from app.services import application_service

router = APIRouter(prefix="/applications", tags=["crm"])


def _to_out(app, db: Session) -> ApplicationOut:
    resume_version = application_service.resume_version_ref(db, app.resume_version_id)
    last_outreach = application_service.last_outreach_ref(db, app.id)
    return ApplicationOut(
        id=app.id,
        startup_id=app.startup_id,
        job_id=app.job_id,
        status=app.status,
        applied_at=app.applied_at,
        created_at=app.created_at,
        updated_at=app.updated_at,
        startup={"id": app.startup.id, "name": app.startup.name, "website": app.startup.website}
        if app.startup
        else None,
        job={"id": app.job.id, "title": app.job.title} if app.job else None,
        resume_version=ResumeVersionRef(**resume_version) if resume_version else None,
        last_outreach=LastOutreachRef(**last_outreach) if last_outreach else None,
    )


@router.get("", response_model=Page[ApplicationOut])
def list_applications(
    app_status: str | None = Query(default=None, alias="status"),
    cursor: str | None = Query(default=None),
    limit: int = Query(default=25, ge=1, le=100),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    rows, next_cursor = application_service.list_applications(db, user, app_status, cursor, limit)
    return {"data": [_to_out(app, db) for app in rows], "next_cursor": next_cursor}


@router.post("", response_model=ApplicationOut, status_code=status.HTTP_201_CREATED)
def create_application(
    body: ApplicationCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> ApplicationOut:
    return _to_out(application_service.create_application(db, user, body), db)


@router.get("/pipeline")
def pipeline(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    grouped = application_service.pipeline(db, user)
    return {"data": {k: [_to_out(app, db) for app in v] for k, v in grouped.items()}}


@router.get("/{application_id}", response_model=ApplicationDetail)
def get_application(
    application_id: uuid.UUID,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> ApplicationDetail:
    app = application_service.get_application(db, user, application_id)
    outreach = application_service.outreach_for(db, app.id)
    resume_version = application_service.resume_version_ref(db, app.resume_version_id)
    base = _to_out(app, db).model_dump()
    base.pop("resume_version", None)
    return ApplicationDetail(
        **base,
        timeline=[
            TimelineEvent(**event)
            for event in application_service.timeline_events(db, app, outreach)
        ],
        outreach=[OutreachOut.model_validate(item) for item in outreach],
        resume_version=ResumeVersionRef(
            id=resume_version["id"],
            created_at=resume_version["created_at"],
            reviewed_at=resume_version["reviewed_at"],
        )
        if resume_version
        else None,
        resume_version_content=resume_version["content"] if resume_version else None,
    )


@router.patch("/{application_id}", response_model=ApplicationOut)
def patch_application(
    application_id: uuid.UUID,
    body: ApplicationPatch,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> ApplicationOut:
    return _to_out(application_service.update_application(db, user, application_id, body), db)


@router.delete("/{application_id}", status_code=status.HTTP_204_NO_CONTENT)
def archive_application(
    application_id: uuid.UUID,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> Response:
    application_service.archive_application(db, user, application_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)