"""embedding — request-time query embedding for hybrid search.

Mirrors ``apps/worker/tasks/embedding.py`` so query vectors are comparable to
the ``startup_embeddings`` rows the worker wrote (same provider/model/dim, and
the same deterministic pseudo-vector fallback when no key is configured). Never
raises — degraded to a unit-norm hash vector so search works end to end even
without an API key.
"""

import hashlib
import logging
import math
import re

from app.config import settings

logger = logging.getLogger(__name__)

_MAX_INPUT_CHARS = 8000


def _pseudo_embedding(text: str, dim: int) -> list[float]:
    """Deterministic single-word + bigram hashing → unit vector (same as worker)."""
    tokens = re.findall(r"[a-z0-9]+", (text or "").lower())
    vec = [0.0] * dim
    for i, token in enumerate(tokens):
        parts = [token]
        if i + 1 < len(tokens):
            parts.append(f"{token} {tokens[i + 1]}")
        for part in parts:
            digest = hashlib.blake2b(part.encode("utf-8"), digest_size=4).digest()
            vec[int.from_bytes(digest, "big") % dim] += 1.0
    norm = math.sqrt(sum(v * v for v in vec)) or 1.0
    return [v / norm for v in vec]


def _embedding_config() -> dict | None:
    """Resolve the embedding provider config, or None when unavailable."""
    from app.config import resolve_embedding_config

    return resolve_embedding_config()


def embed_query(text: str) -> tuple[list[float], str]:
    """Return ``(vector, model_label)`` for a search query. Falls back to the
    deterministic pseudo-vector when no embedding key is configured or the call
    errors, so semantic search degrades gracefully (keyword-only callers rely on
    the keyword leg anyway)."""
    dim = settings.embedding_dim
    cfg = _embedding_config()
    if cfg is not None:
        try:
            from openai import OpenAI

            kwargs: dict = {"api_key": cfg["api_key"]}
            if cfg["base_url"]:
                kwargs["base_url"] = cfg["base_url"]
            client = OpenAI(**kwargs)
            prompt = (text or "")[:_MAX_INPUT_CHARS]
            if prompt.strip():
                resp = client.embeddings.create(
                    model=cfg["model"],
                    input=[prompt],
                    dimensions=dim,
                )
                return list(resp.data[0].embedding), f"{cfg['provider']}:{cfg['model']}"
        except Exception as exc:  # pragma: no cover - depends on external service
            logger.warning("Query embedding failed (%s); using fallback", exc)
    return _pseudo_embedding(text or "", dim), f"fallback:{dim}"
