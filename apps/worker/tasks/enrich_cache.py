"""Content-hash cache for enrichment re-runs (AI_DESIGN.md cost controls).

The key is `enrich:hash:<startup_id>` → sha256 of the fetched source text.
Re-enrichment is skipped when the content hash is unchanged, so we never re-pay
for an LLM extraction on identical source text.
"""

import os

import redis as redis_lib

REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")


class EnrichmentCache:
    def __init__(self, url: str = REDIS_URL) -> None:
        self._redis: redis_lib.Redis | None = None
        try:
            client = redis_lib.from_url(url)
            client.ping()
            self._redis = client
        except Exception:
            self._redis = None

    @staticmethod
    def _key(startup_id: str) -> str:
        return f"enrich:hash:{startup_id}"

    def last_hash(self, startup_id: str) -> str | None:
        if self._redis is None:
            return None
        try:
            value = self._redis.get(self._key(startup_id))
            return value.decode("utf-8") if value is not None else None
        except Exception:
            return None

    def set_hash(self, startup_id: str, text_hash: str) -> None:
        if self._redis is None:
            return
        try:
            self._redis.set(self._key(startup_id), text_hash, ex=60 * 60 * 24 * 30)
        except Exception:
            pass


cache = EnrichmentCache()