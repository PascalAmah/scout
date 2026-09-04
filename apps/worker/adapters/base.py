"""Shared adapter interface for source scraping (ARCHITECTURE.md: Data Sourcing).

Every source adapter returns a cleaned SourceContent; enrichment then runs the
LLM extraction over raw_text. Subclasses may additionally parse structured bits
(jobs, founders) when the source exposes them reliably.
"""

import re
from dataclasses import dataclass, field
from html.parser import HTMLParser

import httpx

USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36"
)

# workatastartup.com (and some other sources) return HTTP 406 when the request
# lacks a browser-like Accept / Sec-Fetch-* set, so every fetch goes out with
# the full header set. Accept-Encoding is deliberately omitted — httpx adds it
# itself and auto-decompresses the response.
BROWSER_HEADERS = {
    "User-Agent": USER_AGENT,
    "Accept": (
        "text/html,application/xhtml+xml,application/xml;q=0.9,"
        "image/avif,image/webp,*/*;q=0.8"
    ),
    "Accept-Language": "en-US,en;q=0.9",
    "Sec-Fetch-Dest": "document",
    "Sec-Fetch-Mode": "navigate",
    "Sec-Fetch-Site": "none",
    "Sec-Fetch-User": "?1",
    "Upgrade-Insecure-Requests": "1",
}

_BLOCK_TAGS = {"p", "div", "br", "li", "h1", "h2", "h3", "h4", "h5", "h6", "section", "article"}
_SKIP_TAGS = {"script", "style", "noscript", "svg", "header", "nav", "footer"}


class _TextExtractor(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self._parts: list[str] = []
        self._skip_depth = 0

    def handle_starttag(self, tag: str, attrs) -> None:
        if tag in _SKIP_TAGS:
            self._skip_depth += 1
        elif tag in _BLOCK_TAGS and self._skip_depth == 0:
            self._parts.append("\n")

    def handle_endtag(self, tag: str) -> None:
        if tag in _SKIP_TAGS:
            self._skip_depth = max(0, self._skip_depth - 1)
        elif tag in _BLOCK_TAGS and self._skip_depth == 0:
            self._parts.append("\n")

    def handle_data(self, data: str) -> None:
        if self._skip_depth == 0:
            self._parts.append(data)

    def text(self) -> str:
        raw = " ".join(self._parts)
        raw = re.sub(r"[ \t]+", " ", raw)
        raw = re.sub(r"\n\s*\n+", "\n\n", raw)
        return raw.strip()


@dataclass
class SourceContent:
    url: str
    source: str
    raw_text: str = ""
    title: str | None = None
    jobs: list[dict] = field(default_factory=list)
    founders: list[dict] = field(default_factory=list)


def clean_html(html: str) -> str:
    parser = _TextExtractor()
    try:
        parser.feed(html)
        parser.close()
    except Exception:
        return ""
    return parser.text()


def fetch_text(url: str, *, timeout: float = 20.0) -> str:
    """Fetch a URL and return its cleaned text, or "" on any failure."""
    try:
        with httpx.Client(
            timeout=timeout, follow_redirects=True, headers=BROWSER_HEADERS
        ) as client:
            resp = client.get(url)
            resp.raise_for_status()
            return clean_html(resp.text)
    except Exception:
        return ""


def fetch_html(url: str, *, timeout: float = 20.0) -> str:
    try:
        with httpx.Client(
            timeout=timeout, follow_redirects=True, headers=BROWSER_HEADERS
        ) as client:
            resp = client.get(url)
            resp.raise_for_status()
            return resp.text
    except Exception:
        return ""


class BaseAdapter:
    source = "base"
    compliance_tier = "permitted_crawl"

    def fetch(self, url: str) -> SourceContent:
        raise NotImplementedError

    def extract_jobs(self, content: SourceContent) -> list[dict]:
        return []

    def extract_founders(self, content: SourceContent) -> list[dict]:
        return []