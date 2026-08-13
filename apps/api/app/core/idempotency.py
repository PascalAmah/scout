import json
import time
from typing import Any

import redis as redis_lib

from app.config import settings


class IdempotencyStore:
    """Idempotency-key store for mutating endpoints the extension may retry.

    Keys live 24h. Redis-backed with an in-memory fallback so the app still
    functions when Redis is down (dev resilience, not a production choice).
    """

    TTL_SECONDS = 60 * 60 * 24

    def __init__(self) -> None:
        self._redis: redis_lib.Redis | None = None
        self._redis_ok = False
        self._tried = False
        self._memory: dict[str, tuple[float, dict[str, Any]]] = {}

    def _connect(self) -> redis_lib.Redis | None:
        if not self._tried:
            self._tried = True
            try:
                client = redis_lib.from_url(settings.redis_url)
                client.ping()
                self._redis = client
                self._redis_ok = True
            except Exception:
                self._redis_ok = False
        return self._redis if self._redis_ok else None

    @staticmethod
    def _key(namespace: str, key: str) -> str:
        return f"idem:{namespace}:{key}"

    def get(self, namespace: str, key: str) -> dict[str, Any] | None:
        redis = self._connect()
        if redis is not None:
            try:
                raw = redis.get(self._key(namespace, key))
                if raw:
                    return json.loads(raw)
            except Exception:
                pass
        entry = self._memory.get(self._key(namespace, key))
        if entry:
            expires_at, payload = entry
            if time.time() < expires_at:
                return payload
            del self._memory[self._key(namespace, key)]
        return None

    def set(self, namespace: str, key: str, payload: dict[str, Any]) -> None:
        redis = self._connect()
        storage_key = self._key(namespace, key)
        if redis is not None:
            try:
                redis.set(storage_key, json.dumps(payload), ex=self.TTL_SECONDS)
                return
            except Exception:
                pass
        self._memory[storage_key] = (time.time() + self.TTL_SECONDS, payload)


idempotency_store = IdempotencyStore()