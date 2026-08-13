from pydantic import BaseModel


class Page[T](BaseModel):
    data: list[T]
    next_cursor: str | None = None