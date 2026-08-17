"""CV profile service — parse uploaded CVs and persist the matching anchor.

Per the build plan, parsing is heuristic-first: it stores the raw text and a
``structured_data`` (skills / roles / years) payload so the Stage 1 retrieval in
``matching_service`` has something to compare against even when no LLM key is
configured. The LLM parse path is a Phase 3+ refinement, not an MVP dependency.
"""

import io
import re
import uuid
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

# --- Name / experience extraction (heuristic, same spirit as skills/roles) ---
_EXPERIENCE_HEADER_RE = re.compile(
    r"^(professional|work|employment|relevant|career)?\s*(experience|work history|employment history)\s*$",
    re.I,
)
_SKIP_SECTION_RE = re.compile(
    r"^(education|projects?|skills|technical skills|summary|objective|profile|interests?|languages|certifications?|awards?|honors?|publications?|activities?|volunteer|leadership|contact|references|additional|extracurricular)",
    re.I,
)
_MONTH = r"(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)"
_DATE_RANGE_RE = re.compile(
    rf"^(?:\(?\)?)?(?:{_MONTH}\.?\s+)?(?:19|20)\d{{2}}\s*(?:[-–—/]|to)?\s*(?:(?:{_MONTH}\.?\s+)?(?:19|20)\d{{2}}|present|current|now)?\)?\s*$",
    re.I,
)
_BULLET_RE = re.compile(r"^\s*(?:[•·◦▪●]|\*|-|–|—|\d+[.)])\s+")
_NAME_SKIP_RE = re.compile(
    r"^(resume|curriculum vitae|cv|profile|personal|contact|summary|objective|about|experience|education|skills?|portfolio|references)",
    re.I,
)
# Split "Name — Role", "Name | Role", "Name, Role", "Name - Role",
# "Name—Role" etc. off a header line. En/em dashes split even without spaces
# (never part of a name); a plain hyphen only splits with surrounding space so
# hyphenated names like "Jean-Luc" stay intact.
_NAME_SEPARATOR_RE = re.compile(
    r"\s*[–—]\s*" r"|\s+[-|/:]\s*" r"|,\s+"
)
_HONORIFIC_RE = re.compile(r"^(?:dr|mr|mrs|ms|prof|sir)\b\.?\s*", re.I)
_LATIN = r"A-Za-zÀ-ÖØ-öø-ÿ"
_NAME_TOKEN_RE = re.compile(rf"^[{_LATIN}][{_LATIN}'.\-]*$")
_ROLE_WORD_RE = re.compile(
    r"engineer|developer|manager|designer|analyst|scientist|founder|consultant|architect|director|lead|officer|specialist|strategist|writer|editor|intern",
    re.I,
)


def _extract_name(lines: list[str]) -> str | None:
    """Best-effort person-name from the CV header. Scans the first few non-empty
    lines (the header zone) and accepts the first segment that looks like a
    name — handles "Name — Role", "Name | Role", initials ("John Q. Public")
    and accented characters."""
    header_lines = 0
    for ln in lines:
        ln = ln.strip()
        if not ln:
            continue
        header_lines += 1
        if header_lines > 3:
            break
        if len(ln) > 80 or re.search(r"\d", ln) or "@" in ln or "http" in ln:
            continue
        if _NAME_SKIP_RE.match(ln):
            continue
        candidate = _NAME_SEPARATOR_RE.split(ln, maxsplit=1)[0].strip()
        candidate = _HONORIFIC_RE.sub("", candidate).strip()
        if not candidate or _ROLE_WORD_RE.search(candidate):
            continue
        words = candidate.split()
        if not (2 <= len(words) <= 5):
            continue
        if not all(_NAME_TOKEN_RE.match(w) for w in words):
            continue
        if any(w[:1].isupper() for w in words if w[:1].isalpha()):
            return candidate
    return None


def _extract_experience(text: str) -> list[dict[str, Any]]:
    """Section-based experience extraction: header → entries of
    {title, company, dates, bullets}. Conservative — never invents text, and
    returns [] when the CV has no recognizable experience section."""
    lines = [ln.strip() for ln in (text or "").splitlines()]
    start = None
    for idx, ln in enumerate(lines):
        if ln and len(ln) <= 40 and _EXPERIENCE_HEADER_RE.match(ln):
            start = idx + 1
            break
    if start is None:
        return []

    entries: list[dict[str, Any]] = []
    current: dict[str, Any] | None = None
    bullets: list[str] = []
    for ln in lines[start:]:
        if not ln:
            continue
        if len(ln) <= 40 and _SKIP_SECTION_RE.match(ln):
            break
        if _BULLET_RE.match(ln):
            if current is None:
                current = {"title": "", "company": "", "dates": "", "bullets": []}
                entries.append(current)
            text_line = _BULLET_RE.sub("", ln).strip()
            if text_line:
                bullets.append(text_line[:400])
            continue
        # Non-bullet line: ends the previous entry's bullets, then starts a new
        # entry (or fills the current one's dates/continuation).
        if bullets:
            current["bullets"] = bullets  # type: ignore[index]
            bullets = []
            current = None
        if current is None:
            is_dates = bool(_DATE_RANGE_RE.match(ln))
            current = {
                "title": "" if is_dates else ln,
                "company": "",
                "dates": ln if is_dates else "",
                "bullets": [],
            }
            entries.append(current)
        elif _DATE_RANGE_RE.match(ln) and not current["dates"]:
            current["dates"] = ln
        # Common layout "Title / Company on the next line": treat a short
        # non-date continuation as the company when the title already looks
        # like a role.
        elif (
            current["title"]
            and not current["company"]
            and len(ln) <= 50
            and "," not in ln
            and _ROLE_WORD_RE.search(current["title"])
        ):
            current["company"] = ln
        else:
            current["title"] = f"{current['title']} {ln}".strip()
    if bullets and current is not None:
        current["bullets"] = bullets

    out: list[dict[str, Any]] = []
    for e in entries:
        title = e["title"].strip()
        company = e["company"].strip()
        # "Title at Company" / "Title @ Company"
        m = re.search(r"\s+(?:at|@)\s+", title)
        if m and not company:
            company = title[m.end() :].strip()
            title = title[: m.start()].strip()
        # "Company — Title" / "Company - Title"
        if not company:
            m2 = re.search(r"\s+[-–—]\s+", title)
            if m2:
                company = title[: m2.start()].strip()
                title = title[m2.end() :].strip()
        if not title and not company:
            continue
        out.append(
            {
                "title": title[:200],
                "company": company[:200],
                "dates": e["dates"][:80],
                "bullets": e["bullets"][:20],
            }
        )
    return out[:15]

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
            "name": None,
            "experience": [],
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
        "name": _extract_name(lines),
        "experience": _extract_experience(text),
    }


DEFAULT_PROFILE_NAME = "Default"


def default_profile(db: Session, user: User) -> CVProfile | None:
    """The user's active CV profile — the anchor for matching. Prefers the
    marked default, falling back to the oldest profile when none is marked."""
    return db.scalar(
        select(CVProfile)
        .where(CVProfile.user_id == user.id)
        .order_by(CVProfile.is_default.desc(), CVProfile.created_at.asc())
        .limit(1)
    )


def get_cv(db: Session, user: User) -> CVProfile:
    profile = default_profile(db, user)
    if profile is None:
        raise ScoutError(
            "CV_NOT_FOUND", "No CV uploaded yet. Upload one in Settings → Profile/CV.", status_code=404
        )
    return profile


def _get_owned_profile(db: Session, user: User, profile_id: uuid.UUID) -> CVProfile:
    row = db.scalar(
        select(CVProfile).where(CVProfile.id == profile_id, CVProfile.user_id == user.id)
    )
    if row is None:
        raise ScoutError("CV_PROFILE_NOT_FOUND", "No CV profile found with that id.", status_code=404)
    return row


def _enqueue_for_profile(db: Session, user: User, profile: CVProfile) -> None:
    """Re-embed the profile and recompute matches (anchored to the default)."""
    job_queue.enqueue_refresh_embeddings("cv", str(profile.id))
    job_queue.enqueue_compute_match(str(user.id))


def _validate_name(name: str) -> str:
    cleaned = (name or "").strip()
    if not cleaned:
        raise ScoutError("CV_PROFILE_NAME_REQUIRED", "Profile name is required.", status_code=422)
    if len(cleaned) > 60:
        raise ScoutError("CV_PROFILE_NAME_TOO_LONG", "Profile name must be 60 characters or fewer.", status_code=422)
    return cleaned


def _ensure_unique_name(db: Session, user: User, name: str, exclude_id: uuid.UUID | None = None) -> None:
    stmt = select(CVProfile).where(CVProfile.user_id == user.id, CVProfile.name == name)
    if exclude_id is not None:
        stmt = stmt.where(CVProfile.id != exclude_id)
    if db.scalar(stmt) is not None:
        raise ScoutError(
            "CV_PROFILE_NAME_TAKEN", f"A CV profile named '{name}' already exists.", status_code=409
        )


def upsert_cv(db: Session, user: User, raw_text: str, source_file_key: str | None = None) -> CVProfile:
    """Replace the user's default CV profile and re-queue embedding + matching."""
    if not raw_text or not raw_text.strip():
        raise ScoutError("CV_EMPTY", "Uploaded CV contains no readable text.", status_code=422)

    profile = default_profile(db, user)
    if profile is None:
        profile = CVProfile(
            user_id=user.id,
            name=DEFAULT_PROFILE_NAME,
            is_default=True,
            raw_text=raw_text,
            source_file_key=source_file_key,
        )
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
    _enqueue_for_profile(db, user, profile)
    return profile


def list_profiles(db: Session, user: User) -> list[CVProfile]:
    return list(
        db.scalars(
            select(CVProfile)
            .where(CVProfile.user_id == user.id)
            .order_by(CVProfile.is_default.desc(), CVProfile.created_at.asc())
        ).all()
    )


def create_profile(
    db: Session, user: User, name: str, raw_text: str, source_file_key: str | None = None
) -> CVProfile:
    """Create a new named CV profile. The first profile becomes the default."""
    if not raw_text or not raw_text.strip():
        raise ScoutError("CV_EMPTY", "Uploaded CV contains no readable text.", status_code=422)
    cleaned = _validate_name(name)
    _ensure_unique_name(db, user, cleaned)

    has_any = db.scalar(select(CVProfile.id).where(CVProfile.user_id == user.id).limit(1))
    profile = CVProfile(
        user_id=user.id,
        name=cleaned,
        is_default=has_any is None,
        raw_text=raw_text,
        source_file_key=source_file_key,
        structured_data=parse_cv_text(raw_text),
    )
    db.add(profile)
    db.commit()
    db.refresh(profile)
    _enqueue_for_profile(db, user, profile)
    return profile


def update_profile(
    db: Session,
    user: User,
    profile_id: uuid.UUID,
    *,
    name: str | None = None,
    is_default: bool | None = None,
) -> CVProfile:
    profile = _get_owned_profile(db, user, profile_id)
    if name is not None:
        cleaned = _validate_name(name)
        _ensure_unique_name(db, user, cleaned, exclude_id=profile.id)
        profile.name = cleaned
    if is_default is True and not profile.is_default:
        # Promote this profile: clear the old default and flush BEFORE setting
        # the new one, so the one-default partial index never sees two rows as
        # default within a single flush (sqlite checks per-row in executemany).
        for other in db.scalars(
            select(CVProfile).where(CVProfile.user_id == user.id, CVProfile.is_default.is_(True))
        ).all():
            other.is_default = False
        db.flush()
        profile.is_default = True
    db.commit()
    db.refresh(profile)
    if is_default is True:
        _enqueue_for_profile(db, user, profile)
    return profile


def delete_profile(db: Session, user: User, profile_id: uuid.UUID) -> None:
    """Delete a profile; if it was the default, promote the oldest remaining one."""
    profile = _get_owned_profile(db, user, profile_id)
    was_default = profile.is_default
    db.delete(profile)
    db.flush()

    if was_default:
        next_default = db.scalar(
            select(CVProfile)
            .where(CVProfile.user_id == user.id)
            .order_by(CVProfile.created_at.asc())
            .limit(1)
        )
        if next_default is not None:
            next_default.is_default = True
    db.commit()
    job_queue.enqueue_compute_match(str(user.id))


def cv_embedding(db: Session, profile: CVProfile) -> CVEmbedding | None:
    return db.scalar(select(CVEmbedding).where(CVEmbedding.cv_profile_id == profile.id).limit(1))