"""YC company page adapter.

YC company pages are server-rendered; we fetch the company HTML and return the
cleaned text for LLM extraction. No structured parsing of the YC API in Phase 1.
"""

from adapters.base import BaseAdapter, SourceContent, clean_html, fetch_html


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
        return SourceContent(url=url, source=self.source, raw_text=text, title=title)