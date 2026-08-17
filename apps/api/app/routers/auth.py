from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.deps import get_current_user
from app.models import User
from app.schemas.auth import (
    LoginRequest,
    OnboardingCompleteRequest,
    RefreshRequest,
    RegisterRequest,
    ResetRequest,
    ResetRequestRequest,
    TokenResponse,
    UserOut,
    UserPatch,
)
from app.services import auth_service

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", status_code=201, response_model=TokenResponse)
def register(body: RegisterRequest, db: Session = Depends(get_db)) -> TokenResponse:
    return auth_service.register(db, body.email, body.password, body.full_name)


@router.post("/login", response_model=TokenResponse)
def login(body: LoginRequest, db: Session = Depends(get_db)) -> TokenResponse:
    return auth_service.login(db, body.email, body.password)


@router.post("/refresh", response_model=TokenResponse)
def refresh(body: RefreshRequest, db: Session = Depends(get_db)) -> TokenResponse:
    return auth_service.refresh(db, body.refresh_token)


@router.post("/logout", status_code=204)
def logout(body: RefreshRequest) -> None:
    auth_service.logout(body.refresh_token)


@router.post("/onboarding/complete", response_model=UserOut)
def complete_onboarding(
    body: OnboardingCompleteRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> UserOut:
    """Save the post-signup wizard answers and mark onboarding complete."""
    return auth_service.complete_onboarding(
        db,
        user,
        body.target_roles,
        body.remote,
        body.locations,
    )


@router.get("/me", response_model=UserOut)
def me(user: User = Depends(get_current_user)) -> UserOut:
    return auth_service.user_out(user)


@router.patch("/me", response_model=UserOut)
def patch_me(
    body: UserPatch,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> UserOut:
    if body.email_reminders_enabled is not None:
        user.email_reminders_enabled = body.email_reminders_enabled
    db.add(user)
    db.commit()
    db.refresh(user)
    return auth_service.user_out(user)


@router.post("/password/reset-request", status_code=204)
def reset_request(body: ResetRequestRequest, db: Session = Depends(get_db)) -> None:
    auth_service.request_password_reset(db, body.email)


@router.post("/password/reset", status_code=204)
def reset(body: ResetRequest, db: Session = Depends(get_db)) -> None:
    auth_service.reset_password(db, body.token, body.password)
