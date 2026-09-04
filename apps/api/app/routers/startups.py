import uuid

from fastapi import APIRouter, Depends, Header, Query, Response, status
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session

from app.core.idempotency import idempotency_store
from app.db.session import get_db
from app.deps import get_current_user
from app.models import Founder, Job, Note, Startup, User
from app.schemas.common import Page
from app.schemas.startup import (
    EnrichmentJobOut,
    FounderCreate,
    FounderOut,
    JobCreate,
    JobOut,
    NoteCreate,
    NoteOut,
    StartupCreate,
    StartupDetail,
    StartupListItem,
    StartupOut,
    StartupPatch,
)
from app.services import startup_service

router = APIRouter(prefix="/startups", tags=["startups"])


@router.get("", response_model=Page[StartupListItem])
def list_startups(
    stage: str | None = Query(default=None),
    hiring_status: str | None = Query(default=None),
    tags: list[str] | None = Query(default=None),
    source: str | None = Query(default=None),
    q: str | None = Query(default=None),
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=25, ge=1, le=100),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    data, total, next_page = startup_service.list_workspace(
        db, user, stage, hiring_status, tags, source, q, page, limit
    )
    return {
        "data": data,
        "next_cursor": str(next_page) if next_page else None,
        "total": total,
    }


@router.post("", response_model=StartupOut, status_code=status.HTTP_201_CREATED)
def create_startup(
    body: StartupCreate,
    x_idempotency_key: str | None = Header(default=None, alias="Idempotency-Key"),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict | JSONResponse:
    if x_idempotency_key:
        cached = idempotency_store.get(str(user.id), x_idempotency_key)
        if cached:
            return JSONResponse(status_code=cached["status"], content=cached["body"])
    payload = startup_service.create_and_enrich(db, user, body)
    if x_idempotency_key:
        idempotency_store.set(str(user.id), x_idempotency_key, {"status": 201, "body": payload})
    return payload


@router.get("/{startup_id}", response_model=StartupDetail)
def get_startup(
    startup_id: uuid.UUID,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> StartupDetail:
    return startup_service.get_detail_for_user(db, user, startup_id)


@router.patch("/{startup_id}", response_model=StartupOut)
def patch_startup(
    startup_id: uuid.UUID,
    body: StartupPatch,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> Startup:
    return startup_service.patch_startup(db, user, startup_id, body)


@router.delete("/{startup_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_startup(
    startup_id: uuid.UUID,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> Response:
    startup_service.unsave(db, user, startup_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/{startup_id}/enrich", status_code=status.HTTP_202_ACCEPTED, response_model=EnrichmentJobOut)
def trigger_enrich(
    startup_id: uuid.UUID,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> EnrichmentJobOut:
    job = startup_service.trigger_enrich(db, user, startup_id)
    return EnrichmentJobOut.model_validate(job)


@router.get("/{startup_id}/enrichment-status", response_model=EnrichmentJobOut)
def enrichment_status(
    startup_id: uuid.UUID,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> EnrichmentJobOut:
    job = startup_service.enrichment_status(db, startup_id)
    if job is None:
        from app.core.errors import ScoutError

        raise ScoutError(
            "ENRICHMENT_NOT_FOUND", "No enrichment has been run for this startup.", status_code=404
        )
    return EnrichmentJobOut.model_validate(job)


@router.get("/{startup_id}/founders", response_model=list[FounderOut])
def list_founders(
    startup_id: uuid.UUID,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> list[Founder]:
    startup_service.get_detail(db, user, startup_id)
    return startup_service.list_founders(db, startup_id)


@router.post("/{startup_id}/founders", response_model=FounderOut, status_code=status.HTTP_201_CREATED)
def add_founder(
    startup_id: uuid.UUID,
    body: FounderCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> Founder:
    startup_service.get_detail(db, user, startup_id)
    return startup_service.add_founder(db, startup_id, body)


@router.get("/{startup_id}/jobs", response_model=list[JobOut])
def list_jobs(
    startup_id: uuid.UUID,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> list[Job]:
    startup_service.get_detail(db, user, startup_id)
    return startup_service.list_jobs(db, startup_id)


@router.post("/{startup_id}/jobs", response_model=JobOut, status_code=status.HTTP_201_CREATED)
def add_job(
    startup_id: uuid.UUID,
    body: JobCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> Job:
    startup_service.get_detail(db, user, startup_id)
    return startup_service.add_job(db, startup_id, body)


@router.post("/{startup_id}/notes", response_model=NoteOut, status_code=status.HTTP_201_CREATED)
def add_note(
    startup_id: uuid.UUID,
    body: NoteCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> Note:
    startup_service.get_detail(db, user, startup_id)
    return startup_service.add_note(db, user, startup_id, body.body, body.founder_id)