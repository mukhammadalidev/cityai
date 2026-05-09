from django.db.models import Q
from rest_framework import permissions, viewsets

from apps.accounts.models import User
from apps.common.permissions import IsSuperAdmin

from .models import ServiceCategory
from .serializers import ServiceCategorySerializer


class ServiceCategoryViewSet(viewsets.ModelViewSet):
    queryset = ServiceCategory.objects.select_related("city").all()
    serializer_class = ServiceCategorySerializer

    def get_permissions(self):
        if self.action in ("list", "retrieve"):
            return [permissions.AllowAny()]
        return [permissions.IsAuthenticated(), IsSuperAdmin()]

    def get_queryset(self):
        qs = super().get_queryset().order_by("sort_order", "name")
        city_id = self.request.query_params.get("city_id")
        if city_id:
            qs = qs.filter(city_id=city_id)
        u = self.request.user
        if not u.is_authenticated or u.role != User.Role.SUPER_ADMIN:
            qs = qs.filter(is_active=True)
        search = self.request.query_params.get("search")
        if search:
            qs = qs.filter(Q(name__icontains=search) | Q(description__icontains=search))
        return qs
