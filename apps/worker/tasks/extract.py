"""Structured extraction for startup enrichment.

Tries the LLM path (the configured AI provider) first; falls back to a
deterministic heuristic so the save→enrich→view loop works end-to-end even
without an API key configured.
"""

import hashlib
import re
from typing import Any

_load_prompt = None  # resolved lazily to avoid import cycles

# Ordered: explicit stage mentions beat the "y combinator" hint (a YC company is
# commonly pre-seed/seed, but an explicit round in the text wins).
STAGE_KEYWORDS = [
    ("series b+", "series_b_plus"),
    ("series b", "series_b_plus"),
    ("series a", "series_a"),
    ("pre-seed", "pre-seed"),
    ("pre seed", "pre-seed"),
    ("seed", "seed"),
    ("idea stage", "idea"),
    ("y combinator", "seed"),
]

HIRING_KEYWORDS = ("we're hiring", "we are hiring", "open roles", "open positions", "jobs", "careers", "join our team")

TECH_PATTERNS = [
    (re.compile(r"\bpython\b", re.I), "Python"),
    (re.compile(r"\btypescript\b", re.I), "TypeScript"),
    (re.compile(r"\bjavascript\b", re.I), "JavaScript"),
    (re.compile(r"\bgo\b|golang", re.I), "Go"),
    (re.compile(r"\brust\b", re.I), "Rust"),
    (re.compile(r"\breact\b", re.I), "React"),
    (re.compile(r"\bvue\b", re.I), "Vue"),
    (re.compile(r"\bnode\.?js\b", re.I), "Node.js"),
    (re.compile(r"\bpostgres(ql)?\b", re.I), "PostgreSQL"),
    (re.compile(r"\bmysql\b", re.I), "MySQL"),
    (re.compile(r"\bkubernetes\b|\bk8s\b", re.I), "Kubernetes"),
    (re.compile(r"\bdocker\b", re.I), "Docker"),
    (re.compile(r"\baws\b", re.I), "AWS"),
    (re.compile(r"\bgcp\b|google cloud", re.I), "Google Cloud"),
    (re.compile(r"\bazure\b", re.I), "Azure"),
    (re.compile(r"\bgraphql\b", re.I), "GraphQL"),
    (re.compile(r"\bnext\.?js\b", re.I), "Next.js"),
    (re.compile(r"\bfastapi\b", re.I), "FastAPI"),
    (re.compile(r"\bdjango\b", re.I), "Django"),
    (re.compile(r"\bflask\b", re.I), "Flask"),
    (re.compile(r"\bredis\b", re.I), "Redis"),
    (re.compile(r"\btensorflow\b", re.I), "TensorFlow"),
    (re.compile(r"\bpytorch\b", re.I), "PyTorch"),
]

TAG_KEYWORDS = {
    "fintech": re.compile(r"\bfintech\b|\bpayments?\b|\bbanking\b", re.I),
    "ai": re.compile(r"\bai\b|\bartificial intelligence\b|\bllm\b|\bmachine learning\b", re.I),
    "saas": re.compile(r"\bsaas\b|\bsoftware as a service\b", re.I),
    "b2b": re.compile(r"\bb2b\b|\bbusiness[- ]to[- ]business\b", re.I),
    "developer-tools": re.compile(r"\bdeveloper tools?\b|\bsdk\b|\bapi\b", re.I),
    "healthcare": re.compile(r"\bhealthcare?\b|\bhealth tech\b|\bbio\b", re.I),
    "security": re.compile(r"\bsecurity\b|\bcyber\b", re.I),
    "e-commerce": re.compile(r"\be[- ]commerce\b|\bretail\b", re.I),
    "crypto": re.compile(r"\bcrypto\b|\bblockchain\b|\bweb3\b", re.I),
    "climate": re.compile(r"\bclimate\b|\benergy\b|\bsustainability\b", re.I),
}


def content_hash(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


def load_prompt() -> str:
    from tasks.prompts import load_prompt as _load

    return _load("enrich_startup")


def _heuristic_extract(text: str) -> dict[str, Any]:
    lower = text.lower()[:20000]
    lines = [ln.strip() for ln in text.splitlines() if ln.strip()]
    long_lines = [ln for ln in lines if len(ln) > 60]
    summary_lines = long_lines or lines
    summary = None
    if summary_lines:
        summary = " ".join(summary_lines[:3])[:1000]

    stage = "unknown"
    for kw, value in STAGE_KEYWORDS:
        if kw in lower:
            stage = value
            break

    hiring_signal = "hiring" if any(k in lower for k in HIRING_KEYWORDS) else "unknown"

    tech_stack = sorted({name for pattern, name in TECH_PATTERNS if pattern.search(lower)})

    tags = [tag for tag, pattern in TAG_KEYWORDS.items() if pattern.search(lower)][:6]

    return {
        "company_summary": summary,
        "tech_stack": tech_stack,
        "stage": stage,
        "hiring_signal": hiring_signal,
        "tags": tags,
    }


def _llm_extract(text: str) -> dict[str, Any] | None:
    from tasks.llm import structured_call

    result = structured_call(load_prompt(), text[:8000])
    if result is None:
        return None
    return {
        "company_summary": result.get("company_summary"),
        "tech_stack": result.get("tech_stack") or [],
        "stage": result.get("stage"),
        "hiring_signal": result.get("hiring_signal"),
        "tags": result.get("tags") or [],
    }


def extract_company(text: str) -> dict[str, Any]:
    """LLM-first extraction with deterministic heuristic fallback."""
    if not text or not text.strip():
        return {
            "company_summary": None,
            "tech_stack": [],
            "stage": "unknown",
            "hiring_signal": "unknown",
            "tags": [],
        }
    result = _llm_extract(text)
    if result is not None:
        return result
    return _heuristic_extract(text)