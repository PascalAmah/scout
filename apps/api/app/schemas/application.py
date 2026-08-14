import uuid
from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.outreach import OutreachOut

APPLICATION_STATUSES = frozenset(
    {"saved", "interested", "applied", "interview", "offer", "rejected", "archived"}
)


class ApplicationCreate(BaseModel):
    startup_id: uuid.UUID
    job_id: uuid.UUID | None = None
    status: str = "saved"


class ApplicationPatch(BaseModel):
    status: str | None = None
    resume_version_id: uuid.UUID | None = None


class ApplicationJob(BaseModel):
    id: uuid.UUID
    title: str


class ApplicationStartup(BaseModel):
    id: uuid.UUID
    name: str
    website: str | None = None


class ResumeVersionRef(BaseModel):
    id: uuid.UUID
    created_at: datetime
    reviewed_at: datetime | None = None


class LastOutreachRef(BaseModel):
    id: uuid.UUID
    channel: str
    status: str
    sent_at: datetime | None = None


class ApplicationOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    startup_id: uuid.UUID
    job_id: uuid.UUID | None
    status: str
    applied_at: datetime | None
    created_at: datetime
    updated_at: datetime
    startup: ApplicationStartup | None = None
    job: ApplicationJob | None = None
    resume_version: ResumeVersionRef | None = None
    last_outreach: LastOutreachRef | None = None


class TimelineEvent(BaseModel):
    type: str
    title: str
    at: datetime


class ApplicationDetail(ApplicationOut):
    timeline: list[TimelineEvent] = Field(default_factory=list)
    outreach: list[OutreachOut] = Field(default_factory=list)
    resume_version: ResumeVersionRef | None = None
    resume_version_content: dict[str, Any] | None = None