import uuid
from datetime import datetime
from typing import Any

from pydantic import BaseModel, EmailStr, Field


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    full_name: str | None = Field(default=None, max_length=255)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class UserOut(BaseModel):
    id: uuid.UUID
    email: EmailStr
    full_name: str | None
    role: str
    email_reminders_enabled: bool = False
    onboarding_completed_at: datetime | None = None
    preferences: dict[str, Any] | None = None
    created_at: datetime


class UserPatch(BaseModel):
    email_reminders_enabled: bool | None = None


class OnboardingCompleteRequest(BaseModel):
    """Answers from the post-signup onboarding wizard.

    Persisted to ``users.preferences``; also stamps ``onboarding_completed_at``
    server-side so a client can never backdate the marker.
    """

    target_roles: list[str] = Field(default_factory=list)
    remote: bool = False
    locations: list[str] = Field(default_factory=list)


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int
    user: UserOut


class RefreshRequest(BaseModel):
    refresh_token: str


class ResetRequestRequest(BaseModel):
    email: EmailStr


class ResetRequest(BaseModel):
    token: str
    password: str = Field(min_length=8, max_length=128)
