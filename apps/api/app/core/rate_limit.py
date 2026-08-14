import re
import time
from collections import defaultdict
from typing import Any

import redis as redis_lib
from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse

from app.config import settings
from app.core.errors import error_body


class _Limiter:
    """Fixed-window rate limiter. Redis-backed with an in-memory fallback so the
    app boots even when Redis is down (dev resilience, not a production choice)."""

    def __init__(self, redis_url: str, limit: int, window_seconds: int) -> None:
        self.limit = limit
        self.window = window_seconds
        self._redis: redis_lib.Redis | None = None
        self._redis_ok = False
        self._tried = False
        self._memory: dict[str, tuple[int, float]] = defaultdict(lambda: (0, 0.0))

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

    def check(self, key: str) -> bool:
        redis = self._connect()
        if redis is not None:
            try:
                window_key = f"rl:{key}:{int(time.time()) // self.window}"
                count = redis.incr(window_key)
                if count == 1:
                    redis.expire(window_key, self.window * 2)
                return count <= self.limit
            except Exception:
                pass

        now = time.time()
        count, window_start = self._memory[key]
        if now - window_start >= self.window:
            self._memory[key] = (1, now)
            return True
        self._memory[key] = (count + 1, window_start)
        return count + 1 <= self.limit


_limiter = _Limiter(settings.redis_url, limit=100, window_seconds=60)
# AI-heavy endpoints get a tight budget per API_SPEC (10 req/min per user).
_ai_limiter = _Limiter(settings.redis_url, limit=10, window_seconds=60)
_AI_PATH_PATTERNS = (
    re.compile(r"^/v1/match/compute$"),
    re.compile(r"^/v1/resumes/[^/]+/generate$"),
    re.compile(r"^/v1/outreach/generate$"),
)


class RateLimitMiddleware(BaseHTTPMiddleware):
    def __init__(self, app: Any, limit: int = 100, window_seconds: int = 60) -> None:
        super().__init__(app)
        self.limit = limit
        self.window = window_seconds

    async def dispatch(self, request: Request, call_next: Any):
        if settings.rate_limit_disabled:
            return await call_next(request)
        client = request.client.host if request.client else "unknown"
        auth = request.headers.get("authorization")
        if auth:
            client = f"{client}:{auth.split(' ')[-1][:16]}"
        limiter = _limiter
        path = request.url.path
        if any(pattern.match(path) for pattern in _AI_PATH_PATTERNS):
            limiter = _ai_limiter
        if not limiter.check(client):
            return JSONResponse(
                status_code=429,
                headers={"Retry-After": str(self.window)},
                content=error_body(
                    "RATE_LIMITED",
                    f"Rate limit exceeded. Try again in {self.window}s.",
                ),
            )
        return await call_next(request)
