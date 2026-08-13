from datetime import UTC, datetime, timedelta

import jwt
from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError

from app.config import settings
from app.core.errors import ScoutError

ACCESS_TOKEN_TYPE = "access"
REFRESH_TOKEN_TYPE = "refresh"
RESET_TOKEN_TYPE = "password_reset"

RESET_TOKEN_EXPIRE_HOURS = 1

_hasher = PasswordHasher()


def hash_password(password: str) -> str:
    return _hasher.hash(password)


def verify_password(password: str, password_hash: str) -> bool:
    try:
        return _hasher.verify(password_hash, password)
    except VerifyMismatchError:
        return False

def _create_token(subject: str, token_type: str, secret: str, expires_delta: timedelta) -> str:
    now = datetime.now(UTC)
    payload = {
        "sub": subject,
        "type": token_type,
        "iat": now,
        "exp": now + expires_delta,
    }
    return jwt.encode(payload, secret, algorithm="HS256")


def create_access_token(user_id: str) -> str:
    return _create_token(
        user_id,
        ACCESS_TOKEN_TYPE,
        settings.jwt_access_secret,
        timedelta(minutes=settings.access_token_expire_minutes),
    )


def create_refresh_token(user_id: str) -> str:
    return _create_token(
        user_id,
        REFRESH_TOKEN_TYPE,
        settings.jwt_refresh_secret,
        timedelta(days=settings.refresh_token_expire_days),
    )


def create_reset_token(user_id: str) -> str:
    return _create_token(
        user_id,
        RESET_TOKEN_TYPE,
        settings.jwt_access_secret,
        timedelta(hours=RESET_TOKEN_EXPIRE_HOURS),
    )


def _decode(token: str, secret: str, expected_type: str, status_code: int) -> str:
    try:
        payload = jwt.decode(token, secret, algorithms=["HS256"])
    except jwt.ExpiredSignatureError:
        raise ScoutError("TOKEN_EXPIRED", "Token has expired.", status_code=status_code) from None
    except jwt.PyJWTError:
        raise ScoutError("INVALID_TOKEN", "Invalid token.", status_code=status_code) from None
    if payload.get("type") != expected_type:
        raise ScoutError("INVALID_TOKEN", "Invalid token type.", status_code=status_code) from None
    return payload["sub"]


def decode_access_token(token: str) -> str:
    return _decode(token, settings.jwt_access_secret, ACCESS_TOKEN_TYPE, 401)


def decode_refresh_token(token: str) -> str:
    return _decode(token, settings.jwt_refresh_secret, REFRESH_TOKEN_TYPE, 401)


def decode_reset_token(token: str) -> str:
    return _decode(token, settings.jwt_access_secret, RESET_TOKEN_TYPE, 400)
