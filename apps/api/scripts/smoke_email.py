"""Smoke-test that transactional email actually sends via Sendlib.

Usage:
    uv run python scripts/smoke_email.py --to you@example.com

Reads SENDLIB_API_KEY + EMAIL_FROM from the .env files (via app.config), so
set them first. Sends a test message through the exact same send_email() path
that welcome / password-reset emails use.
"""

import argparse

from app.config import settings
from app.services import email


def main() -> None:
    parser = argparse.ArgumentParser(description="Send a Sendlib test email")
    parser.add_argument("--to", required=True, help="Recipient email address")
    args = parser.parse_args()

    if not settings.sendlib_api_key:
        raise SystemExit(
            "SENDLIB_API_KEY is not set. Add it to apps/api/.env (or repo-root .env) "
            "before running this script."
        )

    html = email.welcome_email_html("there")
    print(f"Sending from configured EMAIL_FROM ... to {args.to}")
    email.send_email(args.to, "Scout — Sendlib test", html)
    print("send_email() returned. (Check your inbox/spam. Errors are logged above.)")


if __name__ == "__main__":
    main()
