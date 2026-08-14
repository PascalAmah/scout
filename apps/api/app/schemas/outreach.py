import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict

OUTREACH_CHANNELS = frozenset({"email", "linkedin_dm", "cover_letter"})
OUTREACH_STATUSES = frozenset({"draft", "sent", "replied", "no_response"})


class OutreachGenerate(BaseModel):
    application_id: uuid.UUID
    channel: str = "email"


class OutreachGenerateAccepted(BaseModel):
    job_id: uuid.UUID
    status: str


class OutreachPatch(BaseModel):
    content: str | None = None
    status: str | None = None


class OutreachOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    application_id: uuid.UUID | None = None
    channel: str
    content: str | None = None
    status: str
    sent_at: datetime | None = None
    reviewed_at: datetime | None = None
    created_at: datetime
    updated_at: datetime