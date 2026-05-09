from rest_framework import permissions, viewsets

from apps.accounts.models import User
from apps.common.permissions import IsSuperAdmin

from .models import TelegramCustomer
from .serializers import TelegramCustomerSerializer


class TelegramCustomerViewSet(viewsets.ModelViewSet):
    queryset = TelegramCustomer.objects.select_related("city").all()
    serializer_class = TelegramCustomerSerializer

    def get_permissions(self):
        return [permissions.IsAuthenticated(), IsSuperAdmin()]

    def get_queryset(self):
        qs = super().get_queryset()
        city_id = self.request.query_params.get("city_id")
        if city_id:
            qs = qs.filter(city_id=city_id)
        return qs.order_by("-last_seen")
