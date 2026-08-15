"""Techstars company-page adapter.

Classified ``permitted_crawl`` (ARCHITECTURE.md): company pages are
server-rendered and the site has no public API. Discovery reads the public
sitemap for ``/companies/<slug>`` URLs. Fetching is gated on robots.txt by
the sync dispatcher.
"""

import re

from adapters.base import BaseAdapter, SourceContent, clean_html, fetch_html

_SITEMAP_URL = "https://www.techstars.com/sitemap.xml"
_COMPANY_URL_RE = re.compile(r"<loc>\s*(https?://[^<]+/companies/[^<]+?)\s*</loc>", re.I)


class TechstarsAdapter(BaseAdapter):
    source = "techstars"
    compliance_tier = "permitted_crawl"

    def fetch(self, url: str) -> SourceContent:
        html = fetch_html(url)
        text = clean_html(html)
        title = None
        for line in text.splitlines()[:5]:
            if line.strip():
                title = line.strip()[:200]
                break
        return SourceContent(url=url, source=self.source, raw_text=text, title=title)

    def discover(self) -> list[dict]:
        sitemap = fetch_html(_SITEMAP_URL)
        if not sitemap:
            return []
        urls = sorted({match for match in _COMPANY_URL_RE.findall(sitemap)})
        return [{"url": url} for url in urls]
