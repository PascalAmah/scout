from fastapi import APIRouter, Depends, Header
from sqlalchemy.orm import Session

from app.core.idempotency import idempotency_store
from app.db.session import get_db
from app.deps import get_current_user
from app.models import User
from app.schemas.extension import DetectRequest, DetectResponse, QuickSaveRequest, QuickSaveResponse
from app.services import extension_service

router = APIRouter(prefix="/extension", tags=["extension"])


@router.post("/detect", response_model=DetectResponse)
def detect(body: DetectRequest) -> DetectResponse:
    return extension_service.detect_url(body.url)


@router.post("/quick-save", response_model=QuickSaveResponse)
def quick_save(
    body: QuickSaveRequest,
    x_idempotency_key: str | None = Header(default=None, alias="Idempotency-Key"),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> QuickSaveResponse:
    if x_idempotency_key:
        cached = idempotency_store.get(f"{user.id}:extension", x_idempotency_key)
        if cached:
            return QuickSaveResponse.model_validate(cached["body"])
    response, _used_cached = extension_service.quick_save(db, user, body)
    if x_idempotency_key:
        idempotency_store.set(
            f"{user.id}:extension", x_idempotency_key, {"status": 200, "body": response.model_dump(mode="json")}
        )
    return response