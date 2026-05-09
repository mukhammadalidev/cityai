from rest_framework import filters, viewsets

from .models import Car
from .serializers import CarSerializer


class CarViewSet(viewsets.ModelViewSet):
    queryset = Car.objects.all().order_by("-created_at")
    serializer_class = CarSerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ["brand", "model", "body_type", "fuel_type"]
    ordering_fields = ["created_at", "price", "year"]

    def get_queryset(self):
        queryset = super().get_queryset()
        params = self.request.query_params
        if brand := params.get("brand"):
            queryset = queryset.filter(brand__icontains=brand)
        if model := params.get("model"):
            queryset = queryset.filter(model__icontains=model)
        if min_price := params.get("min_price"):
            queryset = queryset.filter(price__gte=min_price)
        if max_price := params.get("max_price"):
            queryset = queryset.filter(price__lte=max_price)
        if condition := params.get("condition"):
            queryset = queryset.filter(condition=condition)
        if status := params.get("status"):
            queryset = queryset.filter(status=status)
        return queryset
