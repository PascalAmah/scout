from adapters.base import BaseAdapter, SourceContent
from adapters.generic_careers_page import GenericCareersPageAdapter
from adapters.producthunt import ProductHuntAdapter
from adapters.techstars import TechstarsAdapter
from adapters.yc import YCAdapter

ADAPTERS: dict[str, BaseAdapter] = {
    YCAdapter.source: YCAdapter(),
    GenericCareersPageAdapter.source: GenericCareersPageAdapter(),
    TechstarsAdapter.source: TechstarsAdapter(),
    ProductHuntAdapter.source: ProductHuntAdapter(),
}


def get_adapter(source: str) -> BaseAdapter | None:
    return ADAPTERS.get(source)


__all__ = ["ADAPTERS", "BaseAdapter", "SourceContent", "get_adapter"]