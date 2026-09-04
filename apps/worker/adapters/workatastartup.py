"""Work at a Startup (workatastartup.com) company-page adapter.

YC's "Work at a Startup" is an Inertia app whose server render serializes the
entire company payload into a ``data-page`` attribute. We parse that JSON
structurally (description, location, team size, industry, founders, jobs) so
enrichment keeps the same fields the extension showed the user, and fall back
to cleaned-text extraction when the attribute is absent or shaped differently.
"""

import json
import re
from html import unescape

from adapters.base import BaseAdapter, SourceContent, clean_html, fetch_html

_DATAPAGE_RE = re.compile(r'data-page="([^"]*)"')

_SALARY_AMOUNT_RE = re.compile(r"([\d.,]+)\s*([kKmM]?)")

_JOB_URL_BASE = "https://www.workatastartup.com"


def _extract_data_page(html: str) -> dict | None:
    """Parse the Inertia ``data-page`` JSON. The attribute value is
    HTML-entity-encoded (``&quot;`` etc.) because it sits inside a double-quoted
    attribute, so unescape before JSON-decoding."""
    match = _DATAPAGE_RE.search(html)
    if not match:
        return None
    try:
        return json.loads(unescape(match.group(1)))
    except (json.JSONDecodeError, ValueError):
        return None


def _salary_bounds(salary_range: str | None) -> tuple[float | None, float | None]:
    """Parse a salary range like ``$80K - $180K`` or ``₹1.5M - ₹2M INR``."""
    if not salary_range:
        return None, None
    amounts: list[float] = []
    for num, mult in _SALARY_AMOUNT_RE.findall(salary_range):
        try:
            value = float(num.replace(",", ""))
        except ValueError:
            continue
        m = mult.lower()
        if m == "k":
            value *= 1_000
        elif m == "m":
            value *= 1_000_000
        amounts.append(value)
    if len(amounts) < 2:
        return None, None
    return min(amounts), max(amounts)


def _jobs(company: dict) -> list[dict]:
    slug = company.get("slug") or ""
    jobs: list[dict] = []
    for item in company.get("jobs") or []:
        if not isinstance(item, dict):
            continue
        title = (item.get("title") or "").strip()
        if not title:
            continue
        job_id = item.get("id")
        salary_min, salary_max = _salary_bounds(item.get("salaryRange"))
        description = " / ".join(
            part
            for part in (
                item.get("salaryRange"),
                item.get("equityRange"),
                item.get("sponsorsVisa"),
                item.get("minExperience"),
            )
            if part
        )
        jobs.append(
            {
                "title": title,
                "url": (
                    f"{_JOB_URL_BASE}/companies/{slug}/jobs/{job_id}"
                    if slug and job_id is not None
                    else None
                ),
                "location": item.get("location"),
                "employment_type": item.get("jobType"),
                "salary_min": salary_min,
                "salary_max": salary_max,
                "description": description or None,
            }
        )
    return jobs


def _founders(company: dict) -> list[dict]:
    founders: list[dict] = []
    for item in company.get("founders") or []:
        if not isinstance(item, dict):
            continue
        name = (item.get("name") or "").strip()
        if not name:
            continue
        founders.append(
            {
                "name": name,
                "title": "Founder",
                "bio": item.get("bio"),
                "linkedin_url": item.get("linkedin"),
                "twitter_url": None,
            }
        )
    return founders


def _build_text(company: dict) -> str:
    """Compose a clean, summary-friendly text from the structured payload."""
    lines: list[str] = []
    name = (company.get("name") or "").strip()
    if name:
        lines.append(name)
    if company.get("description"):
        lines.append(str(company["description"]).strip())

    meta: list[str] = []
    if company.get("location"):
        meta.append(f"Location: {company['location']}")
    if company.get("teamSize") is not None:
        meta.append(f"Team size: {company['teamSize']}")
    if company.get("industry"):
        meta.append(f"Industry: {company['industry']}")
    if meta:
        lines.append(" / ".join(meta))

    founders = _founders(company)
    if founders:
        lines.append("Founders:")
        for founder in founders:
            entry = founder["name"]
            if founder.get("bio"):
                entry += f": {founder['bio']}"
            lines.append(entry)

    jobs = company.get("jobs") or []
    if jobs:
        lines.append("Open roles:")
        for item in jobs:
            if not isinstance(item, dict):
                continue
            bits = [str(item.get("title") or "").strip()]
            if item.get("location"):
                bits.append(str(item["location"]))
            if item.get("jobType"):
                bits.append(str(item["jobType"]))
            if item.get("salaryRange"):
                bits.append(str(item["salaryRange"]))
            lines.append(" — ".join(bits))
    return "\n".join(lines)


class WorkAtAStartupAdapter(BaseAdapter):
    source = "workatastartup"
    compliance_tier = "direct_api"

    def fetch(self, url: str) -> SourceContent:
        html = fetch_html(url)
        page = _extract_data_page(html)
        company = (page or {}).get("props", {}).get("company") if page else None

        if isinstance(company, dict) and company.get("name"):
            return SourceContent(
                url=url,
                source=self.source,
                raw_text=_build_text(company),
                title=company.get("name"),
                founders=_founders(company),
                jobs=_jobs(company),
            )

        # Unknown/edge page shape — degrade to cleaned-text extraction.
        return SourceContent(
            url=url,
            source=self.source,
            raw_text=clean_html(html),
            title=None,
        )
