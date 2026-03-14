from flask import request


DEFAULT_PAGE = 1
DEFAULT_PAGE_SIZE = 20
MAX_PAGE_SIZE = 100


def has_pagination_args() -> bool:
    return 'page' in request.args or 'page_size' in request.args


def get_pagination_params() -> tuple[int, int]:
    page = request.args.get('page', default=DEFAULT_PAGE, type=int) or DEFAULT_PAGE
    page_size = request.args.get('page_size', default=DEFAULT_PAGE_SIZE, type=int) or DEFAULT_PAGE_SIZE

    page = max(page, 1)
    page_size = max(1, min(page_size, MAX_PAGE_SIZE))
    return page, page_size


def build_paginated_response(items: list[dict], total: int, page: int, page_size: int) -> dict:
    total_pages = (total + page_size - 1) // page_size if total else 0
    return {
        'items': items,
        'pagination': {
            'page': page,
            'page_size': page_size,
            'total': total,
            'total_pages': total_pages,
            'has_next': page < total_pages,
            'has_prev': page > 1 and total_pages > 0,
        }
    }
