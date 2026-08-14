"""Embedding helpers — OpenAI embeddings with a deterministic offline fallback.

The fallback is a unit-norm bag-of-ngram hash vector: it is cheap, stable, and
comparable without an API key, so the save → embed → match loop runs end to end
headlessly. It mirrors the heuristic-first ethos of ``tasks/extract.py`` — when
``OPENAI_API_KEY`` is configured we use the real model, otherwise the fallback.
"""

import hashlib
import logging
import math
import os
import re

logger = logging.getLogger(__name__)

EMBEDDING_MODEL = os.getenv("EMBEDDING_MODEL", "text-embedding-3-large")
EMBEDDING_DIM = int(os.getenv("EMBEDDING_DIM", "1536"))

_MAX_INPUT_CHARS = 8000


def pseudo_embedding(text: str, dim: int = EMBEDDING_DIM) -> list[float]:
    """Deterministic single-word + bigram hashing → unit vector."""
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


def embed_text(text: str, model: str | None = None, dim: int = EMBEDDING_DIM) -> tuple[list[float], str]:
    """Return ``(vector, model_label)``. Never raises — degraded to the fallback
    when OpenAI is unavailable, so enqueue-and-forget embed steps can't wedge the
    pipeline. Partial-failure isolation happens at the caller level."""
    api_key = os.getenv("OPENAI_API_KEY")
    if api_key:
        try:
            from openai import OpenAI

            client = OpenAI(api_key=api_key)
            prompt = (text or "")[:_MAX_INPUT_CHARS]
            if prompt.strip():
                resp = client.embeddings.create(
                    model=model or EMBEDDING_MODEL,
                    input=[prompt],
                    dimensions=dim,
                )
                return list(resp.data[0].embedding), f"openai:{model or EMBEDDING_MODEL}"
        except Exception as exc:  # pragma: no cover - depends on external service
            logger.warning("OpenAI embedding failed (%s); using fallback", exc)

    return pseudo_embedding(text or "", dim), f"fallback:{dim}"