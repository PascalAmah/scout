import base64
import uuid
from datetime import datetime
from typing import Any, cast

from sqlalchemy import ColumnElement, Select, desc, tuple_
from sqlalchemy.orm import InstrumentedAttribute, Session

from app.core.errors import ScoutError


def encode_cursor(ts: datetime, entity_id: uuid.UUID) -> str:
    raw = f"{ts.isoformat()}|{entity_id}"
    return base64.urlsafe_b64encode(raw.encode()).decode()


def decode_cursor(cursor: str) -> tuple[datetime, uuid.UUID]:
    try:
        raw = base64.urlsafe_b64decode(cursor.encode()).decode()
        ts_str, id_str = raw.split("|", 1)
        return datetime.fromisoformat(ts_str), uuid.UUID(id_str)
    except Exception as exc:
        raise ScoutError("INVALID_CURSOR", "Malformed pagination cursor.", status_code=400) from exc


def cursor_page(
    db: Session,
    stmt: Select[Any],
    created_col: InstrumentedAttribute[Any],
    id_col: InstrumentedAttribute[Any],
    cursor: str | None,
    limit: int,
) -> tuple[list[Any], str | None]:
    """Apply cursor pagination to a query ordered by (created_at desc, id desc).

    Returns (rows, next_cursor). Fetches limit+1 rows to know whether more exist.
    """
    stmt = stmt.order_by(desc(created_col), desc(id_col)).limit(limit + 1)
    if cursor:
        ts, entity_id = decode_cursor(cursor)
        stmt = stmt.where(
            tuple_(created_col, id_col) < tuple_(cast(ColumnElement[Any], ts), cast(ColumnElement[Any], entity_id))
        )

    rows = list(db.scalars(stmt).all())
    has_more = len(rows) > limit
    page = rows[:limit]
    next_cursor = None
    if has_more and page:
        last = page[-1]
        next_cursor = encode_cursor(getattr(last, created_col.key), getattr(last, id_col.key))
    return page, next_cursor