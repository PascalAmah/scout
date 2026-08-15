"""Product Hunt adapter — classified ``direct_api`` (ARCHITECTURE.md).

Uses the Product Hunt v2 GraphQL API with a developer token from the
``PRODUCTHUNT_API_TOKEN`` env var. Without a token the adapter refuses
loudly (``NotConfigured``) rather than falling back to scraping — a
``direct_api`` tier means the API is the acquisition path.
"""

import os
from datetime import UTC, datetime, timedelta

import httpx

from adapters.base import BaseAdapter, SourceContent

API_URL = "https://api.producthunt.com/v2/api/graphql"
WEB_BASE = "https://www.producthunt.com"

_POST_BY_SLUG = """
query PostBySlug($slug: String!) {
  post(slug: $slug) {
    name
    tagline
    description
    website
    url
  }
}
"""

_TOP_POSTS = """
query TopPosts($postedAfter: DateTime!) {
  posts(order: VOTES, postedAfter: $postedAfter, first: 20) {
    edges {
      node {
        name
        slug
        tagline
        url
      }
    }
  }
}
"""


class NotConfiguredError(Exception):
    """Raised when a direct_api source is missing its credentials."""


def _token() -> str:
    token = os.environ.get("PRODUCTHUNT_API_TOKEN", "")
    if not token:
        raise NotConfiguredError("PRODUCTHUNT_API_TOKEN is not set — Product Hunt sync is disabled")
    return token


class ProductHuntAdapter(BaseAdapter):
    source = "producthunt"
    compliance_tier = "direct_api"

    def _query(self, query: str, variables: dict) -> dict:
        resp = httpx.post(
            API_URL,
            json={"query": query, "variables": variables},
            headers={
                "Authorization": f"Bearer {_token()}",
                "Accept": "application/json",
                "Content-Type": "application/json",
            },
            timeout=20.0,
        )
        resp.raise_for_status()
        body = resp.json()
        if "errors" in body:
            raise RuntimeError(f"Product Hunt API error: {body['errors']}")
        return body.get("data") or {}

    def fetch(self, url: str) -> SourceContent:
        slug = url.rstrip("/").rsplit("/", 1)[-1]
        data = self._query(_POST_BY_SLUG, {"slug": slug})
        post = data.get("post")
        if post is None:
            raise RuntimeError(f"Product Hunt post not found for {url}")
        text = "\n".join(
            part
            for part in (post.get("name"), post.get("tagline"), post.get("description"))
            if part
        )
        return SourceContent(
            url=post.get("url") or url,
            source=self.source,
            raw_text=text,
            title=post.get("name"),
        )

    def discover(self) -> list[dict]:
        posted_after = (datetime.now(UTC) - timedelta(days=1)).isoformat()
        data = self._query(_TOP_POSTS, {"postedAfter": posted_after})
        items: list[dict] = []
        for edge in data.get("posts", {}).get("edges", []):
            node = edge.get("node") or {}
            slug = node.get("slug")
            if not slug:
                continue
            items.append(
                {
                    "url": node.get("url") or f"{WEB_BASE}/posts/{slug}",
                    "name": node.get("name"),
                }
            )
        return items
