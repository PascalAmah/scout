import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "api"))

from tasks.enrich_cache import EnrichmentCache  # noqa: E402


class _FakeRedis:
    def __init__(self) -> None:
        self._data: dict[str, bytes] = {}

    def get(self, key: str):
        return self._data.get(key)

    def set(self, key: str, value: str, **_) -> None:
        self._data[key] = value.encode("utf-8")


class TestEnrichmentCache:
    def test_last_hash_roundtrip_decodes_bytes(self) -> None:
        cache = EnrichmentCache.__new__(EnrichmentCache)
        cache._redis = _FakeRedis()  # noqa: SLF001 -- test seam
        assert cache.last_hash("startup-1") is None
        cache.set_hash("startup-1", "aabbcc")
        assert cache.last_hash("startup-1") == "aabbcc"

    def test_cache_disabled_returns_none(self) -> None:
        cache = EnrichmentCache.__new__(EnrichmentCache)
        cache._redis = None  # noqa: SLF001 -- test seam
        assert cache.last_hash("startup-1") is None