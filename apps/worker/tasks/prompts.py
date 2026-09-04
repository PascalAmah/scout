"""Central prompt loader for worker LLM tasks.

Resolves prompt files from the repo-root ``packages/prompts`` (v1) or
``packages/promptsV2`` (v2) directory, selected by the ``PROMPTS_VERSION`` env
var (default ``v2``). Tasks call ``load_prompt("match_score")`` with the base
name and the version suffix is appended from the configured version, so
switching prompt versions is a single env change, never a code edit.

``PROMPTS_VERSION`` values:
- ``v1`` → packages/prompts/<name>.v1.txt
- ``v2`` → packages/promptsV2/<name>.v2.txt
- anything else → treated as a directory path (repo-root relative unless
  absolute), resolved as <dir>/<name>.txt (for future versions like a
  promptsV3 directory).
"""

import os
from pathlib import Path

_ROOT = Path(__file__).resolve().parents[3] / "packages"
_DIRS = {
    "v1": "prompts",
    "v2": "promptsV2",
}
_DEFAULT_VERSION = "v2"


def _version() -> str:
    return os.getenv("PROMPTS_VERSION", _DEFAULT_VERSION).strip().lower()


def _prompts_root() -> Path:
    version = _version()
    if version in _DIRS:
        return _ROOT / _DIRS[version]
    candidate = Path(version)
    if candidate.is_absolute() or candidate.exists():
        return candidate
    return _ROOT / candidate


def _filename(name: str) -> str:
    version = _version()
    suffix = f".{version}" if version in _DIRS else ""
    return f"{name}{suffix}.txt"


def load_prompt(name: str) -> str:
    """Read a prompt file for the configured version (base name, no suffix)."""
    return (_prompts_root() / _filename(name)).read_text(encoding="utf-8")


def prompt_path(name: str) -> Path:
    return _prompts_root() / _filename(name)
