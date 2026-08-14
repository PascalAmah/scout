"""Local file store — key-based object storage behind the R2 contract.

``ARCHITECTURE.md`` designates Cloudflare R2 as the production object store:
objects are referenced by key in Postgres and never treated as source of truth
for metadata. This module is the dev/local implementation of that same
key → bytes contract, persisting under ``settings.file_store_dir``. Swap the
``write_bytes`` / ``read_bytes`` / ``exists`` helpers for an R2 client later
without touching callers.
"""

from pathlib import Path

from app.config import settings


def _root() -> Path:
    root = Path(settings.file_store_dir)
    root.mkdir(parents=True, exist_ok=True)
    return root


def resolve_path(key: str) -> Path:
    """On-disk path for ``key``, rejecting path traversal outside the root."""
    root = _root().resolve()
    target = (root / key.lstrip("/")).resolve()
    if not target.is_relative_to(root):
        raise ValueError("invalid file key")
    return target


def exists(key: str) -> bool:
    return resolve_path(key).is_file()


def write_bytes(key: str, data: bytes) -> None:
    target = resolve_path(key)
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_bytes(data)


def read_bytes(key: str) -> bytes:
    return resolve_path(key).read_bytes()
