import hashlib

import redis as redis_lib

from app.config import settings


class TokenRevocationStore:
    """Revoked refresh tokens. Redis-backed with an in-memory fallback for dev."""

    def __init__(self) -> None:
        self._memory: set[str] = set()
        self._redis: redis_lib.Redis | None = None
        self._tried = False

    def _connect(self) -> redis_lib.Redis | None:
        if self._redis is None:
            if self._tried:
                return None
            self._tried = True
            try:
                client = redis_lib.from_url(settings.redis_url)
                client.ping()
                self._redis = client
            except Exception:
                return None
        return self._redis

    @staticmethod
    def _key(token: str) -> str:
        return "revoked:" + hashlib.sha256(token.encode()).hexdigest()

    def revoke(self, token: str, ttl_seconds: int) -> None:
        redis = self._connect()
        if redis is not None:
            try:
                redis.set(self._key(token), "1", ex=ttl_seconds)
                return
            except Exception:
                pass
        self._memory.add(token)

    def is_revoked(self, token: str) -> bool:
        redis = self._connect()
        if redis is not None:
            try:
                return bool(redis.exists(self._key(token)))
            except Exception:
                pass
        return token in self._memory


revocations = TokenRevocationStore()
