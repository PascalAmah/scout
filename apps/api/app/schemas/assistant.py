from pydantic import BaseModel, ConfigDict, Field


class AssistantHistoryMessage(BaseModel):
    model_config = ConfigDict(extra="ignore")

    role: str = Field(description="user | assistant")
    content: str


class AssistantChatRequest(BaseModel):
    message: str = Field(min_length=1, max_length=2000)
    history: list[AssistantHistoryMessage] = Field(default_factory=list)


class AssistantToolCall(BaseModel):
    name: str
    arguments: dict = Field(default_factory=dict)
    result: str = ""


class AssistantReference(BaseModel):
    """An entity (startup / job / application) the assistant's answer names,
    for the frontend to render as a link."""

    type: str = Field(description="startup | job | application")
    id: str
    name: str


class AssistantChatResponse(BaseModel):
    answer: str
    references: list[AssistantReference] = Field(default_factory=list)
    tools: list[AssistantToolCall] = Field(default_factory=list)
