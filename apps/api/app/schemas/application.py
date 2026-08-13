import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict

APPLICATION_STATUSES = frozenset(
    {"saved", "interested", "applied", "interview", "offer", "rejected", "archived"}
)


class ApplicationCreate(BaseModel):
    startup_id: uuid.UUID
    job_id: uuid.UUID | None = None
    status: str = "saved"


class ApplicationPatch(BaseModel):
    status: str | None = None


class ApplicationJob(BaseModel):
    id: uuid.UUID
    title: str


class ApplicationStartup(BaseModel):
    id: uuid.UUID
    name: str
    website: str | None = None


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


class ApplicationDetail(ApplicationOut):
    pass