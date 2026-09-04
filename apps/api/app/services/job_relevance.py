"""Interest relevance: match job titles against a user's onboarding target roles.

Onboarding collects target roles (Software Engineer, Frontend, Backend,
Full-stack, ML / AI, ...). Enrichment saves *every* open role a company
publishes, most of which are irrelevant to the user. This scorer is a
deterministic, LLM-free classifier that annotates each job with a relevance
tier so the UI can surface interesting roles first without discarding data.

Tiers:
    high   — the title clearly names the target role (or a close alias)
    medium — the title is in the same job family (e.g. any engineering role)
    none   — no signal (sales, ops, specialist roles, ...)
"""

import re
from typing import Literal

Relevance = Literal["high", "medium", "none"]

TIER_ORDER: dict[str, int] = {"high": 0, "medium": 1, "none": 2}

_WORD_RE = re.compile(r"[^a-z0-9+# ]+")


def _normalize(text: str) -> str:
    """Lowercase and collapse separators so aliases match across spellings.

    "Full-stack" -> "full stack", "ML / AI" -> "ml ai", "Founder's" -> "founder s".
    """
    lowered = text.lower().replace("-", " ").replace("/", " ")
    return re.sub(r"\s+", " ", _WORD_RE.sub(" ", lowered)).strip()


def _contains_phrase(haystack: str, needle: str) -> bool:
    """Space-padded word-boundary substring check on normalised strings."""
    return f" {needle} " in f" {haystack} "

# Alias phrases per canonical role family. A title containing any alias is a
# strong ("high") signal for that family. Aliases are normalised (no hyphens).
_FAMILY_ALIASES: dict[str, list[str]] = {
    "software_engineer": [
        "software engineer",
        "software developer",
        "software engineering",
        "software dev",
        "swe",
        "developer",
        "programmer",
    ],
    "fullstack": [
        "fullstack",
        "full stack",
        "fullstack engineer",
        "full stack engineer",
        "fullstack developer",
    ],
    "frontend": [
        "frontend",
        "front end",
        "frontend engineer",
        "front end engineer",
        "web developer",
        "ui engineer",
        "client engineer",
    ],
    "backend": [
        "backend",
        "back end",
        "backend engineer",
        "back end engineer",
        "api engineer",
        "server engineer",
    ],
    "ml_ai": [
        "ml ai",
        "machine learning",
        "ml engineer",
        "ai engineer",
        "applied scientist",
        "research engineer",
        "ml",
        "ai",
    ],
    "data": [
        "data engineer",
        "data scientist",
        "data analyst",
        "analytics engineer",
        "data",
    ],
    "devops": [
        "devops",
        "sre",
        "site reliability",
        "platform engineer",
        "infrastructure engineer",
        "cloud engineer",
    ],
    "product": [
        "product manager",
        "product designer",
        "product",
        "technical program manager",
        "pm",
    ],
    "design": ["designer", "design", "ux", "ui designer", "product design"],
    "marketing": ["marketing", "growth", "growth engineer"],
    "founding_engineer": [
        "founding engineer",
        "founding software engineer",
        "founding ai engineer",
        "founding ml engineer",
        "founding fullstack engineer",
        "founding backend engineer",
        "founding frontend engineer",
        "founding infra engineer",
        "founding devops engineer",
    ],
}

# Generic "noun" tokens per family: a title containing one of these (but no
# strong alias) is a same-family role and lands in the "medium" tier — e.g.
# "Staff AI Engineer" for a Software Engineer user.
_FAMILY_NOUNS: dict[str, set[str]] = {
    "software_engineer": {"engineer", "engineering", "developer", "dev", "swe", "programmer"},
    "fullstack": {"engineer", "engineering", "developer", "dev"},
    "frontend": {"engineer", "engineering", "developer", "dev"},
    "backend": {"engineer", "engineering", "developer", "dev"},
    "ml_ai": {"engineer", "engineering", "scientist", "researcher", "ml", "ai"},
    "data": {"engineer", "scientist", "analyst", "analytics"},
    "devops": {"engineer", "engineering", "sre", "devops", "infrastructure"},
    "product": {"manager", "product", "pm", "owner"},
    "design": {"designer", "design"},
    "marketing": {"marketing", "growth", "manager"},
    "founding_engineer": {"engineer", "engineering", "developer", "dev", "founder", "founding"},
}

# Match a raw target role (from onboarding) to its canonical family key by
# checking aliases/keys as phrases against the normalised role string.
_ROLE_TO_FAMILY: list[tuple[str, str]] = [
    (alias, family)
    for family, aliases in _FAMILY_ALIASES.items()
    for alias in [family.replace("_", " "), *aliases]
]

# Tokens too generic to count as a meaningful overlap for custom roles.
_STOPWORD_TOKENS = {"the", "and", "for", "with", "senior", "junior", "lead", "staff", "principle"}


def _match_family(role_norm: str) -> str | None:
    best: tuple[int, str] | None = None
    for alias, family in _ROLE_TO_FAMILY:
        if _contains_phrase(role_norm, alias):
            # Longest alias wins ("founding engineer" over "engineer").
            if best is None or len(alias) > best[0]:
                best = (len(alias), family)
    return best[1] if best else None


def _score_against_role(title_norm: str, role_norm: str) -> Relevance:
    family = _match_family(role_norm)
    if family is not None:
        aliases = _FAMILY_ALIASES[family]
        if any(_contains_phrase(title_norm, alias) for alias in aliases):
            return "high"
        nouns = _FAMILY_NOUNS[family]
        title_tokens = set(title_norm.split())
        if nouns & title_tokens:
            return "medium"
        return "none"
    # Custom role not in the map: exact phrase is strong, any shared
    # meaningful token is a weak signal.
    if _contains_phrase(title_norm, role_norm):
        return "high"
    stopwordless = {t for t in role_norm.split() if len(t) > 2 and t not in _STOPWORD_TOKENS}
    if stopwordless & set(title_norm.split()):
        return "medium"
    return "none"


def score_relevance(title: str, target_roles: list[str]) -> Relevance:
    """Best relevance tier of ``title`` across all of the user's target roles."""
    title_norm = _normalize(title)
    if not title_norm or not target_roles:
        return "none"
    best: Relevance = "none"
    for role in target_roles:
        role_norm = _normalize(role)
        if not role_norm:
            continue
        tier = _score_against_role(title_norm, role_norm)
        if tier == "high":
            return "high"
        if tier == "medium":
            best = "medium"
    return best


def is_relevant(relevance: str | None) -> bool:
    """Whether a relevance tier should count as "matching the user's interests"."""
    return relevance in ("high", "medium")

