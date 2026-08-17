from fastapi import APIRouter, Depends
from openai import (
    APIConnectionError,
    APIError,
    AuthenticationError,
    BadRequestError,
    RateLimitError,
)
from sqlalchemy.orm import Session

from app.core.errors import ScoutError
from app.db.session import get_db
from app.deps import get_current_user
from app.models import User
from app.schemas.assistant import AssistantChatRequest, AssistantChatResponse
from app.services import assistant_service


def _brief(message: str, limit: int = 200) -> str:
    """Trim a provider error string to something UI-safe."""
    return (message or "unknown provider error").strip()[:limit]

router = APIRouter(prefix="/assistant", tags=["ai"])


@router.post("/chat", response_model=AssistantChatResponse)
def chat(
    body: AssistantChatRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> AssistantChatResponse:
    """Read-only conversational agent over the user's own saved data.

    The model decides which tools to call; every tool is executed with the
    authenticated user's ID injected server-side, so retrieval can never cross
    user boundaries. No write actions in v3 scope."""
    try:
        return assistant_service.chat(db, user, body)
    except ValueError as exc:
        raise ScoutError("ASSISTANT_NOT_CONFIGURED", str(exc), status_code=503) from exc
    except AuthenticationError:
        raise ScoutError(
            "AI_AUTH_FAILED",
            "The AI provider rejected the configured API key. Check AI_API_KEY in the repo-root .env (and unset any stale AI_API_KEY env var).",
            status_code=503,
        ) from None
    except RateLimitError:
        raise ScoutError(
            "AI_RATE_LIMITED",
            "The AI provider rate-limited the request. Try again in a minute.",
            status_code=429,
        ) from None
    except BadRequestError as exc:
        raise ScoutError(
            "AI_BAD_REQUEST",
            f"The AI provider rejected the request: {_brief(str(exc))}",
            status_code=502,
        ) from exc
    except APIConnectionError:
        raise ScoutError(
            "AI_UNREACHABLE",
            "Could not reach the AI provider. Check your network connection and AI_BASE_URL.",
            status_code=503,
        ) from None
    except APIError as exc:
        raise ScoutError(
            "AI_ERROR",
            f"AI provider error: {_brief(str(exc))}",
            status_code=502,
        ) from exc
