"""Dump the Scout API's OpenAPI schema to packages/types/openapi.json.

Run from apps/api:  python scripts/export_openapi.py
The committed JSON is the source of truth for packages/types (generated TS
types consumed by the web app's lib/api-client.ts). Regenerate whenever the
API's request/response schemas change.
"""

import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.main import app  # noqa: E402

OUT = Path(__file__).resolve().parents[3] / "packages" / "types" / "openapi.json"


def main() -> None:
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(
        json.dumps(app.openapi(), indent=2),
        encoding="utf-8",
    )
    print(f"wrote {OUT}")


if __name__ == "__main__":
    main()
