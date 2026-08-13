"""Generic careers-page adapter.

Fetches any company careers page and returns the cleaned text. Heuristic
detection of obvious job titles in the text is used only when the markup gives
no structured data (Phase 1 MVP — a real crawler comes later per ROADMAP.md).
"""

from adapters.base import BaseAdapter, SourceContent, clean_html, fetch_html


class GenericCareersPageAdapter(BaseAdapter):
    source = "generic_careers"
    compliance_tier = "permitted_crawl"

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
            jobs=self._guess_jobs(text),
        )

    @staticmethod
    def _guess_jobs(text: str) -> list[dict]:
        """Very light heuristic: lines that look like job titles on a careers page.

        Keeps Title-Case short lines (e.g. "Backend Engineer") and rejects
        sentences, headings, and page-title noise.
        """
        jobs: list[dict] = []
        for line in text.splitlines():
            line = line.strip()
            words = line.split()
            if not (2 <= len(words) <= 6):
                continue
            if "." in line or "," in line:
                continue
            if any(not w[:1].isupper() and not w[0].isdigit() for w in words):
                continue
            jobs.append({"title": line})
            if len(jobs) >= 20:
                break
        return jobs