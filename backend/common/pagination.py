import math
from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response


class StandardPagination(PageNumberPagination):
    """
    Standard pagination class returning structured metadata:
    {
      "success": true,
      "data": [...],
      "pagination": {
        "page": 1,
        "page_size": 20,
        "total_count": 150,
        "total_pages": 8,
        "has_next": true,
        "has_previous": false
      }
    }
    """
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 100

    def get_paginated_response(self, data):
        total_count = self.page.paginator.count
        page_size = self.get_page_size(self.request) or self.page_size
        total_pages = math.ceil(total_count / page_size) if page_size else 1

        return Response({
            "success": True,
            "data": data,
            "pagination": {
                "page": self.page.number,
                "page_size": page_size,
                "total_count": total_count,
                "total_pages": total_pages,
                "has_next": self.page.has_next(),
                "has_previous": self.page.has_previous(),
            }
        })
