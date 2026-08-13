import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict


class NotificationOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    type: str
    entity_type: str | None
    entity_id: uuid.UUID | None
    title: str
    body: str | None
    read_at: datetime | None
    created_at: datetime


class UnreadCountOut(BaseModel):
    count: int