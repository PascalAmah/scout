import uuid

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import settings
from app.core.errors import ScoutError
from app.core.revocation import revocations
from app.core.security import (
    create_access_token,
    create_refresh_token,
    create_reset_token,
    decode_refresh_token,
    decode_reset_token,
    hash_password,
    verify_password,
)
from app.models import User
from app.schemas.auth import TokenResponse, UserOut
from app.services.email import reset_password_html, send_email, welcome_email_html


def user_out(user: User) -> UserOut:
    return UserOut(
        id=user.id,
        email=user.email,
        full_name=user.full_name,
        role=user.role,
        email_reminders_enabled=user.email_reminders_enabled,
        created_at=user.created_at,
    )


def _token_response(user: User) -> TokenResponse:
    return TokenResponse(
        access_token=create_access_token(str(user.id)),
        refresh_token=create_refresh_token(str(user.id)),
        expires_in=settings.access_token_expire_minutes * 60,
        user=user_out(user),
    )


def register(db: Session, email: str, password: str, full_name: str | None) -> TokenResponse:
    email = email.lower()
    existing = db.scalar(select(User).where(User.email == email))
    if existing:
        raise ScoutError("EMAIL_TAKEN", "An account with this email already exists.", status_code=409)
    user = User(email=email, password_hash=hash_password(password), full_name=full_name)
    db.add(user)
    db.commit()
    db.refresh(user)
    send_email(user.email, "Welcome to Scout", welcome_email_html(user.full_name))
    return _token_response(user)


def login(db: Session, email: str, password: str) -> TokenResponse:
    user = db.scalar(select(User).where(User.email == email.lower()))
    if not user or not verify_password(password, user.password_hash):
        raise ScoutError("INVALID_CREDENTIALS", "Invalid email or password.", status_code=401)
    return _token_response(user)


def refresh(db: Session, refresh_token: str) -> TokenResponse:
    if revocations.is_revoked(refresh_token):
        raise ScoutError("INVALID_TOKEN", "Refresh token has been revoked.", status_code=401)
    user_id = decode_refresh_token(refresh_token)
    user = db.get(User, uuid.UUID(user_id))
    if not user:
        raise ScoutError("USER_NOT_FOUND", "User no longer exists.", status_code=401)
    return _token_response(user)


def logout(refresh_token: str) -> None:
    if revocations.is_revoked(refresh_token):
        raise ScoutError("INVALID_TOKEN", "Refresh token has been revoked.", status_code=401)
    revocations.revoke(refresh_token, settings.refresh_token_expire_days * 86400)


def request_password_reset(db: Session, email: str) -> None:
    user = db.scalar(select(User).where(User.email == email.lower()))
    if not user:
        # Do not reveal whether an account exists; always succeed.
        return
    token = create_reset_token(str(user.id))
    reset_url = f"{settings.web_app_url}/password-reset/confirm?token={token}"
    send_email(user.email, "Reset your Scout password", reset_password_html(reset_url))


def reset_password(db: Session, token: str, password: str) -> None:
    user_id = decode_reset_token(token)
    user = db.get(User, uuid.UUID(user_id))
    if not user:
        raise ScoutError("USER_NOT_FOUND", "User no longer exists.", status_code=400)
    user.password_hash = hash_password(password)
    db.commit()
