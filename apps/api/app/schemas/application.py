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
    tags: list[str] | None = None
    resume_version_id: uuid.UUID | None = None


class BulkApplicationRequest(BaseModel):
    """Bulk pipeline actions (Phase 6.3). ``status`` is limited to ``archived``
    — it's the only transition valid from every state in the state machine;
    ``tags`` replaces the tags on every listed application."""

    application_ids: list[uuid.UUID]
    status: str | None = None
    tags: list[str] | None = None


class BulkApplicationOut(BaseModel):
    updated: int


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
    tags: list[str] | None = None
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


class FollowUpOut(BaseModel):
    application_id: uuid.UUID
    startup_name: str | None = None
    job_title: str | None = None
    applied_at: datetime | None = None
    days_since: int = 0
    last_outreach_status: str | None = None


class FollowUpAccepted(BaseModel):
    job_id: uuid.UUID
    status: str