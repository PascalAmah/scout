from adapters.base import BaseAdapter, SourceContent
from adapters.generic_careers_page import GenericCareersPageAdapter
from adapters.yc import YCAdapter

ADAPTERS: dict[str, BaseAdapter] = {
    YCAdapter.source: YCAdapter(),
    GenericCareersPageAdapter.source: GenericCareersPageAdapter(),
}


def get_adapter(source: str) -> BaseAdapter | None:
    return ADAPTERS.get(source)


__all__ = ["ADAPTERS", "BaseAdapter", "SourceContent", "get_adapter"]