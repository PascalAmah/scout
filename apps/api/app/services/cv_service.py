"""CV profile service — parse uploaded CVs and persist the matching anchor.

Per the build plan, parsing is heuristic-first: it stores the raw text and a
``structured_data`` (skills / roles / years) payload so the Stage 1 retrieval in
``matching_service`` has something to compare against even when no LLM key is
configured. The LLM parse path is a Phase 3+ refinement, not an MVP dependency.
"""

import io
import re
from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.errors import ScoutError
from app.models import CVEmbedding, CVProfile, User
from app.services import job_queue

SKILL_PATTERNS: list[tuple[re.Pattern[str], str]] = [
    (re.compile(r"\bpython\b", re.I), "Python"),
    (re.compile(r"\btypescript\b", re.I), "TypeScript"),
    (re.compile(r"\bjavascript\b", re.I), "JavaScript"),
    (re.compile(r"\bgo\b|\bgolang\b", re.I), "Go"),
    (re.compile(r"\brust\b", re.I), "Rust"),
    (re.compile(r"\breact\b", re.I), "React"),
    (re.compile(r"\bvue(\.js)?\b", re.I), "Vue"),
    (re.compile(r"\bangular\b", re.I), "Angular"),
    (re.compile(r"\bnode(\.js)?\b", re.I), "Node.js"),
    (re.compile(r"\bexpress(\.js)?\b", re.I), "Express"),
    (re.compile(r"\bdjango\b", re.I), "Django"),
    (re.compile(r"\bflask\b", re.I), "Flask"),
    (re.compile(r"\bfastapi\b", re.I), "FastAPI"),
    (re.compile(r"\bspring( boot)?\b", re.I), "Spring"),
    (re.compile(r"\bjava\b", re.I), "Java"),
    (re.compile(r"\bkotlin\b", re.I), "Kotlin"),
    (re.compile(r"\bc#\b|c\s*sharp", re.I), "C#"),
    (re.compile(r"\b\.net\b|dotnet", re.I), ".NET"),
    (re.compile(r"\bc\+\+\b", re.I), "C++"),
    (re.compile(r"\bswift\b", re.I), "Swift"),
    (re.compile(r"\bsql\b", re.I), "SQL"),
    (re.compile(r"\bpostgres(ql)?\b", re.I), "PostgreSQL"),
    (re.compile(r"\bmysql\b", re.I), "MySQL"),
    (re.compile(r"\bmongodb\b", re.I), "MongoDB"),
    (re.compile(r"\bredis\b", re.I), "Redis"),
    (re.compile(r"\bdocker\b", re.I), "Docker"),
    (re.compile(r"\bkubernetes\b|\bk8s\b", re.I), "Kubernetes"),
    (re.compile(r"\bterraform\b", re.I), "Terraform"),
    (re.compile(r"\baws\b", re.I), "AWS"),
    (re.compile(r"\bgcp\b|google cloud", re.I), "Google Cloud"),
    (re.compile(r"\bazure\b", re.I), "Azure"),
    (re.compile(r"\bgraphql\b", re.I), "GraphQL"),
    (re.compile(r"\brest(ful)?\b", re.I), "REST"),
    (re.compile(r"\bhtml5?\b", re.I), "HTML"),
    (re.compile(r"\bcss\b", re.I), "CSS"),
    (re.compile(r"\btailwind\b", re.I), "Tailwind CSS"),
    (re.compile(r"\bnext(\.js)?\b", re.I), "Next.js"),
    (re.compile(r"\bsaas\b", re.I), "SaaS"),
    (re.compile(r"\bgit\b", re.I), "Git"),
    (re.compile(r"\bci/cd\b|\bgithub actions\b", re.I), "CI/CD"),
    (re.compile(r"\bpandas\b", re.I), "Pandas"),
    (re.compile(r"\bnumpy\b", re.I), "NumPy"),
    (re.compile(r"\bsqlalchemy\b", re.I), "SQLAlchemy"),
    (re.compile(r"\billm\b|large language model", re.I), "LLMs"),
    (re.compile(r"\bmachine learning\b|\bml\b", re.I), "Machine Learning"),
    (re.compile(r"\bdeep learning\b", re.I), "Deep Learning"),
    (re.compile(r"\bdata science\b", re.I), "Data Science"),
    (re.compile(r"\btensorflow\b", re.I), "TensorFlow"),
    (re.compile(r"\bpytorch\b", re.I), "PyTorch"),
    (re.compile(r"\bfigma\b", re.I), "Figma"),
]

ROLE_PATTERNS: list[tuple[re.Pattern[str], str]] = [
    (re.compile(r"backend( engineer| developer)?", re.I), "Backend Engineer"),
    (re.compile(r"frontend|front end", re.I), "Frontend Engineer"),
    (re.compile(r"full[- ]stack", re.I), "Full-Stack Engineer"),
    (re.compile(r"software (engineer|developer)", re.I), "Software Engineer"),
    (re.compile(r"\bsre\b|site reliability", re.I), "Site Reliability Engineer"),
    (re.compile(r"devops", re.I), "DevOps Engineer"),
    (re.compile(r"data scientist", re.I), "Data Scientist"),
    (re.compile(r"data (analyst|engineer)", re.I), "Data Engineer"),
    (re.compile(r"product manager", re.I), "Product Manager"),
    (re.compile(r"product designer|\bdesigner\b", re.I), "Product Designer"),
    (re.compile(r"engineering (manager|lead)", re.I), "Engineering Manager"),
    (re.compile(r"machine learning engineer|ml engineer", re.I), "ML Engineer"),
    (re.compile(r"mobile (engineer|developer)", re.I), "Mobile Engineer"),
    (re.compile(r"\bqa\b|quality assurance", re.I), "QA Engineer"),
    (re.compile(r"technical (co-?founder|lead)", re.I), "Technical Lead"),
    (re.compile(r"\bcto\b|chief technology", re.I), "CTO"),
    (re.compile(r"\bceo\b|chief executive", re.I), "CEO"),
    (re.compile(r"co-?founder", re.I), "Co-founder"),
    (re.compile(r"analytics engineer", re.I), "Analytics Engineer"),
]

YEAR_PATTERNS: list[re.Pattern[str]] = [
    re.compile(r"(\d+)\s*\+\s*years?", re.I),
    re.compile(r"(\d+)\s*-?\s*(\d+)\s*years?(?:\s*of)?\s*(?:professional\s+|relevant\s+)?experience", re.I),
    re.compile(r"(\d+)\s*years?(?:\s*of)?\s*(?:professional\s+|relevant\s+)?experience", re.I),
    re.compile(r"(\d{1,2})\s*(?:-|to|\+)?\s*years?(?![a-z])", re.I),
]

EDUCATION_PATTERNS: list[tuple[re.Pattern[str], str]] = [
    (re.compile(r"\bb\.?\s?sc\b|\bbsc\b", re.I), "BSc"),
    (re.compile(r"\bm\.?\s?sc\b|\bmsc\b", re.I), "MSc"),
    (re.compile(r"\bba\b|\bb\.?\s?a\b", re.I), "BA"),
    (re.compile(r"\bma\b|\bm\.?\s?a\b", re.I), "MA"),
    (re.compile(r"\bmba\b", re.I), "MBA"),
    (re.compile(r"\bph\.?\s?d\b|\bphd\b|doctoral", re.I), "PhD"),
]

def extract_text(filename: str | None, data: bytes) -> str:
    """Parse an uploaded CV into plain text. PDFs go through pypdf; anything
    else is treated as plain text (doc/docx arrive via the extension paste path
    or are passed through the text fallback in the router)."""
    name = (filename or "").lower()
    if name.endswith(".pdf") or data[:4] == b"%PDF":
        try:
            from pypdf import PdfReader  # type: ignore[import-not-found, import-untyped]

            reader = PdfReader(io.BytesIO(data))
            return "\n".join(page.extract_text() or "" for page in reader.pages).strip()
        except Exception as exc:
            raise ScoutError(
                "PDF_PARSE_FAILED", "Could not read text from that PDF.", status_code=422
            ) from exc
    try:
        return data.decode("utf-8", errors="replace").strip()
    except Exception as exc:  # pragma: no cover - decode with errors=replace rarely fails
        raise ScoutError(
            "INVALID_CV_TEXT", "Could not read text from that file.", status_code=422
        ) from exc


def parse_cv_text(raw_text: str) -> dict[str, Any]:
    """Heuristic structured parse: skills, roles, years, education, summary."""
    text = (raw_text or "").strip()[:20000]
    if not text:
        return {
            "skills": [],
            "roles": [],
            "years_of_experience": None,
            "education": [],
            "summary": None,
        }

    lower = text.lower()
    skills = sorted({label for pattern, label in SKILL_PATTERNS if pattern.search(lower)})[:40]
    roles = sorted({label for pattern, label in ROLE_PATTERNS if pattern.search(lower)})[:20]

    years: int | None = None
    for pattern in YEAR_PATTERNS:
        m = pattern.search(lower)
        if m:
            years = int(m.group(1))
            break

    education = sorted({label for pattern, label in EDUCATION_PATTERNS if pattern.search(lower)})
    lines = [ln.strip() for ln in text.splitlines() if ln.strip()]
    summary = None
    for ln in lines:
        if len(ln) > 40 and not re.search(r"(experience|skills|summary|education|project|employ|company|@|\ber:\b|email|phone)", ln, re.I):
            summary = ln[:500]
            break

    return {
        "skills": skills,
        "roles": roles,
        "years_of_experience": years,
        "education": education,
        "summary": summary,
    }


def get_cv(db: Session, user: User) -> CVProfile:
    row = db.scalar(select(CVProfile).where(CVProfile.user_id == user.id))
    if row is None:
        raise ScoutError(
            "CV_NOT_FOUND", "No CV uploaded yet. Upload one in Settings → Profile/CV.", status_code=404
        )
    return row


def upsert_cv(db: Session, user: User, raw_text: str, source_file_key: str | None = None) -> CVProfile:
    """Replace the user's active CV profile and re-queue embedding + matching."""
    if not raw_text or not raw_text.strip():
        raise ScoutError("CV_EMPTY", "Uploaded CV contains no readable text.", status_code=422)

    profile = db.scalar(select(CVProfile).where(CVProfile.user_id == user.id))
    if profile is None:
        profile = CVProfile(user_id=user.id, raw_text=raw_text, source_file_key=source_file_key)
        db.add(profile)
    else:
        profile.raw_text = raw_text
        profile.source_file_key = source_file_key or profile.source_file_key
        profile.structured_data = None  # recomputed below after flush so the id is stable
    db.flush()

    profile.structured_data = parse_cv_text(raw_text)

    # Replace any previous CV embedding — a new raw text invalidates it.
    old = db.scalar(select(CVEmbedding).where(CVEmbedding.cv_profile_id == profile.id))
    if old is not None:
        db.delete(old)

    db.commit()
    db.refresh(profile)

    job_queue.enqueue_refresh_embeddings("cv", str(profile.id))
    job_queue.enqueue_compute_match(str(user.id))

    return profile


def cv_embedding(db: Session, profile: CVProfile) -> CVEmbedding | None:
    return db.scalar(select(CVEmbedding).where(CVEmbedding.cv_profile_id == profile.id).limit(1))