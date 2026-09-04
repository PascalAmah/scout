"""robots.txt gate for ``permitted_crawl`` sources (ARCHITECTURE.md).

Server-initiated crawls of permitted sources must be gated on a per-domain
robots.txt check, rate-limited, and identified with a real User-Agent. This
module is the gate: ``robots_allows(url)`` returns False when the target
domain's robots.txt disallows the path. An unreachable or missing robots.txt
is treated as "no rules" (allow), which is the standard interpretation.
"""

import logging
from urllib.parse import urlparse
from urllib.robotparser import RobotFileParser

import httpx

logger = logging.getLogger(__name__)

# Must identify the client, not hide it (ARCHITECTURE.md: permitted_crawl).
ROBOTS_USER_AGENT = "ScoutBot/1.0 (+https://api.scout.app)"
_CACHE: dict[str, RobotFileParser] = {}
_TIMEOUT = 10.0


def _fetch_robots_txt(robots_url: str) -> str:
    try:
        with httpx.Client(timeout=_TIMEOUT, follow_redirects=True) as client:
            resp = client.get(robots_url)
            return resp.text if resp.status_code == 200 else ""
    except Exception:
        logger.warning("robots.txt unreachable at %s; treating as no rules", robots_url)
        return ""


def robots_allows(url: str) -> bool:
    """True when the domain's robots.txt permits fetching ``url``.

    Per-domain parsers are cached for the lifetime of the worker process.
    """
    parsed = urlparse(url)
    if not parsed.scheme or not parsed.netloc:
        return False
    parser = _CACHE.get(parsed.netloc)
    if parser is None:
        parser = RobotFileParser()
        parser.parse(_fetch_robots_txt(f"{parsed.scheme}://{parsed.netloc}/robots.txt").splitlines())
        _CACHE[parsed.netloc] = parser
    return parser.can_fetch(ROBOTS_USER_AGENT, url)
