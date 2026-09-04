"""YC company page adapter.

YC company pages are server-rendered; we fetch the company HTML and return the
cleaned text for LLM extraction. The "Active Founders" section is parsed
structurally so founders (with socials for outreach) are captured reliably —
the cleaned text loses link hrefs, so it can't produce ``twitter_url`` /
``linkedin_url``.
"""

import json
import re
from html import unescape

from adapters.base import BaseAdapter, SourceContent, clean_html, fetch_html

# Every founder card opens with this wrapper; desktop + mobile markup are both
# inside it, so one card == one founder.
_CARD_SPLIT_RE = re.compile(r'<div class="flex flex-col gap-2 border-b border-gray-100')
_NAME_RE = re.compile(r'<div class="text-xl font-bold">([^<]+)</div>')
_TITLE_RE = re.compile(r'<div class="text-gray-600">([^<]+)</div>')
_BIO_RE = re.compile(r'<div class="prose max-w-full whitespace-pre-line">([^<]*)</div>')
_SOCIAL_RE = re.compile(
    r'<a\s+href="([^"]*)"[^>]*aria-label="(Twitter account|LinkedIn profile)"'
)
# YC pages embed the company's open roles as HTML-entity-encoded JSON keyed by
# ``jobPostings`` (also used to render the Jobs tab).
_JOBS_MARKER = re.compile(r'&quot;jobPostings&quot;:\[')


def _unescape(value: str | None) -> str | None:
    if value is None:
        return None
    value = unescape(value).strip()
    return value or None


def parse_founders(html: str) -> list[dict]:
    """Extract founders from a YC company page's "Active Founders" section.

    Returns ``[{name, title, bio, twitter_url, linkedin_url}, ...]``, with only
    the fields the page actually exposes. One founder per card (deduped — the
    section renders desktop and mobile blocks for the same person inside one
    card, which the split handles)."""
    marker = html.find("Active Founders")
    if marker == -1:
        return []

    # Bound the section at the next page heading (e.g. "Company Launches").
    rest = html[marker + len("Active Founders"):]
    end = rest.find("text-2xl font-bold")
    section = rest[:end] if end != -1 else rest

    founders: list[dict] = []
    for card in _CARD_SPLIT_RE.split(section):
        name = _NAME_RE.search(card)
        if not name:
            continue
        socials: dict[str, str | None] = {"twitter_url": None, "linkedin_url": None}
        for href, label in _SOCIAL_RE.findall(card):
            if label == "Twitter account":
                socials["twitter_url"] = href
            else:
                socials["linkedin_url"] = href
        title = _TITLE_RE.search(card)
        bio = _BIO_RE.search(card)
        founders.append(
            {
                "name": _unescape(name.group(1)) or "",
                "title": _unescape(title.group(1)) if title else None,
                "bio": _unescape(bio.group(1)) if bio else None,
                **socials,
            }
        )
    return [f for f in founders if f["name"]]


def _salary_bounds(salary_range: str | None) -> tuple[float | None, float | None]:
    """Parse a YC salary range like "$50K - $200K" into (min, max) floats."""
    if not salary_range:
        return None, None
    parts = re.findall(r"\$?\s*([\d.,]+)\s*[Kk]?", salary_range)
    numbers = [float(p.replace(",", "")) for p in parts]
    if len(numbers) < 2:
        return None, None
    scale = 1000.0 if re.search(r"[Kk]", salary_range) else 1.0
    return numbers[0] * scale, numbers[1] * scale


def parse_jobs(html: str) -> list[dict]:
    """Extract open roles from a YC company page's embedded ``jobPostings`` JSON.

    The array is HTML-entity-encoded inside the page; we locate its brackets and
    parse it directly (balanced-bracket scan tolerates nested arrays such as the
    ``skills`` field). Returns a list of dicts shaped for the Job model, with
    the job detail URL resolved to an absolute YC URL when it's page-relative."""
    match = _JOBS_MARKER.search(html)
    if not match:
        return []
    start = html.find("[", match.end() - 1)
    depth = 0
    end = start
    while end < len(html):
        char = html[end]
        if char == "[":
            depth += 1
        elif char == "]":
            depth -= 1
            if depth == 0:
                break
        end += 1
    if depth != 0:
        return []

    try:
        raw = unescape(html[start : end + 1])
        payload = json.loads(raw)
    except (json.JSONDecodeError, ValueError):
        return []

    jobs: list[dict] = []
    for item in payload:
        title = (item.get("title") or "").strip()
        if not title:
            continue
        url = item.get("url")
        if url and url.startswith("/"):
            url = f"https://www.ycombinator.com{url}"
        salary_min, salary_max = _salary_bounds(item.get("salaryRange"))
        description = " / ".join(
            part
            for part in (
                item.get("salaryRange"),
                item.get("equityRange"),
                item.get("minExperience"),
                item.get("visa"),
            )
            if part
        )
        jobs.append(
            {
                "title": title,
                "url": url,
                "location": item.get("location"),
                "employment_type": item.get("type"),
                "salary_min": salary_min,
                "salary_max": salary_max,
                "description": description or None,
            }
        )
    return jobs


class YCAdapter(BaseAdapter):
    source = "yc"
    compliance_tier = "direct_api"

    def fetch(self, url: str) -> SourceContent:
        html = fetch_html(url)
        text = clean_html(html)
        title = None
        for line in text.splitlines()[:5]:
            if line.strip():
                title = line.strip()[:200]
                break
        return SourceContent(
            url=url,
            source=self.source,
            raw_text=text,
            title=title,
            founders=parse_founders(html),
            jobs=parse_jobs(html),
        )