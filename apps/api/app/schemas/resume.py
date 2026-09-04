import uuid
from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class ResumeCreate(BaseModel):
    title: str = "My Resume"
    content: dict[str, Any] | None = None


class ResumePatch(BaseModel):
    title: str | None = None
    content: dict[str, Any] | None = None


class ResumeOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    user_id: uuid.UUID
    title: str
    is_base: bool
    content: dict[str, Any] | None = None
    created_at: datetime
    updated_at: datetime


class ResumeGenerateRequest(BaseModel):
    application_id: uuid.UUID | None = None
    job_id: uuid.UUID | None = None
    tone: str = "concise"
    emphasize: list[str] = Field(default_factory=list)


class ResumeGenerateAccepted(BaseModel):
    job_id: uuid.UUID
    status: str


class ResumeVersionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    resume_id: uuid.UUID
    application_id: uuid.UUID | None = None
    content: dict[str, Any] | None = None
    generated_by_model: str | None = None
    reviewed_at: datetime | None = None
    created_at: datetime