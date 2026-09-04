import json
import sys
from html import escape
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "api"))

from adapters.workatastartup import (  # noqa: E402
    WorkAtAStartupAdapter,
    _build_text,
    _extract_data_page,
    _founders,
    _jobs,
    _salary_bounds,
)

COMPANY = {
    "name": "ProcIndex",
    "slug": "procindex",
    "batch": "S25",
    "description": "AI-powered accounting automation for construction and manufacturing",
    "url": "https://procindex.com/",
    "location": "San Francisco",
    "teamSize": 4,
    "industry": "B2B -> Finance and Accounting",
    "founders": [
        {
            "name": "Neha Suresh",
            "bio": "Co-founder & CEO @Procindex | Engineer | CMU alum",
            "linkedin": "https://linkedin.com/in/nehasuresh1904",
        },
        {
            "name": "Akash Thakur",
            "bio": "Building Procindex | Ex-Apple",
            "linkedin": "https://www.linkedin.com/in/akashthakur1203",
        },
    ],
    "jobs": [
        {
            "id": 92622,
            "title": "Software engineer - 2",
            "location": "IN / Remote (IN)",
            "jobType": "Full-time",
            "salaryRange": "₹1.5M - ₹2M INR",
            "equityRange": None,
            "sponsorsVisa": "US citizenship/visa not required",
            "minExperience": "3+ years",
        },
        {
            "id": 92977,
            "title": "Founding Sales Development Representative",
            "location": "San Francisco, CA, US",
            "jobType": "Full-time",
            "salaryRange": "$80K - $180K",
            "equityRange": None,
            "sponsorsVisa": "US citizen/visa only",
            "minExperience": "1+ years",
        },
    ],
}

PAGE = {"component": "jobs/public/pages/CompanyPage", "props": {"company": COMPANY}, "url": "/companies/procindex"}


def _html_for(page: dict) -> str:
    encoded = escape(json.dumps(page), quote=True)
    return f'<html><body><div data-page="{encoded}" id="app"></div></body></html>'


class TestExtractDataPage:
    def test_recovers_company_payload(self) -> None:
        page = _extract_data_page(_html_for(PAGE))
        assert page is not None
        assert page["props"]["company"]["name"] == "ProcIndex"

    def test_missing_attribute_returns_none(self) -> None:
        assert _extract_data_page("<html><body>no data-page</body></html>") is None


class TestSalaryBounds:
    def test_usd_k_range(self) -> None:
        assert _salary_bounds("$80K - $180K") == (80000.0, 180000.0)

    def test_inr_m_range(self) -> None:
        assert _salary_bounds("₹1.5M - ₹2M INR") == (1_500_000.0, 2_000_000.0)

    def test_no_range_returns_none(self) -> None:
        assert _salary_bounds("$80K") == (None, None)
        assert _salary_bounds(None) == (None, None)


class TestJobs:
    def test_parses_jobs_with_urls_and_salaries(self) -> None:
        jobs = _jobs(COMPANY)
        assert [j["title"] for j in jobs] == [
            "Software engineer - 2",
            "Founding Sales Development Representative",
        ]
        first = jobs[0]
        assert first["url"] == "https://www.workatastartup.com/companies/procindex/jobs/92622"
        assert first["location"] == "IN / Remote (IN)"
        assert first["employment_type"] == "Full-time"
        assert first["salary_min"] == 1_500_000.0
        assert first["salary_max"] == 2_000_000.0
        assert "3+ years" in (first["description"] or "")


class TestFounders:
    def test_parses_founders_with_linkedin(self) -> None:
        founders = _founders(COMPANY)
        assert [f["name"] for f in founders] == ["Neha Suresh", "Akash Thakur"]
        assert founders[0]["linkedin_url"] == "https://linkedin.com/in/nehasuresh1904"
        assert founders[0]["title"] == "Founder"


class TestBuildText:
    def test_includes_description_founders_and_roles(self) -> None:
        text = _build_text(COMPANY)
        assert "AI-powered accounting automation" in text
        assert "Neha Suresh" in text
        assert "Software engineer - 2" in text


class TestAdapterFetch:
    def test_fetch_builds_structured_content(self, monkeypatch) -> None:
        import adapters.workatastartup as waas

        monkeypatch.setattr(waas, "fetch_html", lambda url: _html_for(PAGE))
        adapter = WorkAtAStartupAdapter()
        content = adapter.fetch("https://www.workatastartup.com/companies/procindex")
        assert content.source == "workatastartup"
        assert content.title == "ProcIndex"
        assert len(content.jobs) == 2
        assert len(content.founders) == 2
        assert "ProcIndex" in content.raw_text

    def test_fetch_falls_back_to_cleaned_text(self, monkeypatch) -> None:
        import adapters.workatastartup as waas

        monkeypatch.setattr(waas, "fetch_html", lambda url: "<html><body><h1>Hello</h1></body></html>")
        adapter = WorkAtAStartupAdapter()
        content = adapter.fetch("https://www.workatastartup.com/companies/unknown")
        assert content.jobs == []
        assert content.founders == []
        assert "Hello" in content.raw_text
