import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "api"))

import pytest  # noqa: E402

from tasks.extract import content_hash, extract_company  # noqa: E402


@pytest.fixture(autouse=True)
def _no_ai_key(monkeypatch) -> None:
    """These tests assert deterministic heuristic behavior. Clear the AI key so
    extract_company never hits the live provider (which is non-deterministic)."""
    for var in ("AI_API_KEY", "AI_EMBEDDING_API_KEY", "OPENAI_API_KEY"):
        monkeypatch.delenv(var, raising=False)


class TestExtract:
    def test_content_hash_is_stable(self) -> None:
        assert content_hash("hello world") == content_hash("hello world")
        assert content_hash("hello") != content_hash("hello world")

    def test_heuristic_hiring_and_stage(self) -> None:
        text = (
            "Lumina Health builds digital care tools.\n"
            "We are hiring engineers. Python, React, PostgreSQL.\n"
            "Raised a Series A round."
        )
        result = extract_company(text)
        assert result["hiring_signal"] == "hiring"
        assert result["stage"] == "series_a"
        assert "Python" in result["tech_stack"]
        assert result["company_summary"]

    def test_empty_text(self) -> None:
        result = extract_company("")
        assert result["hiring_signal"] == "unknown"
        assert result["stage"] == "unknown"
        assert result["tech_stack"] == []

    def test_unknown_stage_defaults(self) -> None:
        result = extract_company("A company with no funding info at all here.")
        assert result["stage"] == "unknown"
