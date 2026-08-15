import uuid

from fastapi import APIRouter, Depends, Query, Response, status
from sqlalchemy.orm import Session

from app.config import settings
from app.db.session import get_db
from app.deps import get_current_user
from app.models import EnrichmentJob, User
from app.schemas.application import (
    ApplicationCreate,
    ApplicationDetail,
    ApplicationOut,
    ApplicationPatch,
    FollowUpAccepted,
    FollowUpOut,
    LastOutreachRef,
    ResumeVersionRef,
    TimelineEvent,
)
from app.schemas.common import Page
from app.schemas.outreach import OutreachOut
from app.services import application_service, follow_up_service
from app.services.job_queue import enqueue_generate_follow_up

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


@router.get("/needs-follow-up", response_model=list[FollowUpOut])
def needs_follow_up(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> list[FollowUpOut]:
    """Active applications past the follow-up threshold — powers the Dashboard
    'needs follow-up' section (Phase 4 retention loop)."""
    rows = follow_up_service.due_applications(db, user.id, settings.follow_up_days)
    out: list[FollowUpOut] = []
    for row in rows:
        last_outreach = application_service.last_outreach_ref(db, row.id)
        out.append(
            FollowUpOut(
                application_id=row.id,
                startup_name=row.startup.name if row.startup else None,
                job_title=row.job.title if row.job else None,
                applied_at=row.applied_at,
                days_since=(
                    follow_up_service.days_since(row.applied_at)
                    if row.applied_at is not None
                    else 0
                ),
                last_outreach_status=last_outreach.get("status") if last_outreach else None,
            )
        )
    return out


@router.post("/{application_id}/follow-up", response_model=FollowUpAccepted, status_code=status.HTTP_202_ACCEPTED)
def generate_follow_up(
    application_id: uuid.UUID,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> FollowUpAccepted:
    """Generate a suggested follow-up message (async). Stored as a draft outreach
    so the review gate applies — never auto-sent."""
    application_service.get_application(db, user, application_id)
    job_row = EnrichmentJob(
        user_id=user.id,
        entity_type="application",
        entity_id=application_id,
        job_type="generate_follow_up",
        status="queued",
    )
    db.add(job_row)
    db.commit()
    db.refresh(job_row)
    enqueue_generate_follow_up(
        application_id=str(application_id),
        user_id=str(user.id),
        job_row_id=str(job_row.id),
    )
    return FollowUpAccepted(job_id=job_row.id, status="queued")


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