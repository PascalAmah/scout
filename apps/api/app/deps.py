import uuid

from fastapi import Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.core.errors import ScoutError
from app.core.security import decode_access_token
from app.db.session import get_db
from app.models import User

bearer_scheme = HTTPBearer(auto_error=False)


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> User:
    if credentials is None:
        raise ScoutError("AUTH_REQUIRED", "Authentication required.", status_code=401)
    user_id = decode_access_token(credentials.credentials)
    user = db.get(User, uuid.UUID(user_id))
    if not user:
        raise ScoutError("USER_NOT_FOUND", "User no longer exists.", status_code=401)
    return user
