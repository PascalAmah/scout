"""Central prompt loader for worker LLM tasks.

Resolves prompt files from the repo-root ``packages/prompts`` directory. This is
the single source of truth for prompt resolution — tasks should call
``load_prompt("match_score.v1")`` rather than hand-rolling a ``Path`` (the
original ``extract.py`` path was off by one directory, see history).
"""

from pathlib import Path

_PROMPTS_ROOT = Path(__file__).resolve().parents[3] / "packages" / "prompts"


def load_prompt(name: str) -> str:
    """Read a prompt file from ``packages/prompts/<name>.txt``."""
    return (_PROMPTS_ROOT / f"{name}.txt").read_text(encoding="utf-8")


def prompt_path(name: str) -> Path:
    return _PROMPTS_ROOT / f"{name}.txt"
