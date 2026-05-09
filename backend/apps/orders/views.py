import logging

from rest_framework import permissions, viewsets

from apps.accounts.models import User
from apps.businesses.services import accessible_business_ids

from .models import Order
from .notifications import notify_admin_new_order, notify_admin_order_status_line, notify_customer_order_status
from .serializers import OrderSerializer

logger = logging.getLogger(__name__)


class OrderViewSet(viewsets.ModelViewSet):
    queryset = Order.objects.select_related("business", "city", "customer").prefetch_related("lines__item").all()
    serializer_class = OrderSerializer

    def get_permissions(self):
        if self.action == "create":
            return [permissions.AllowAny()]
        return [permissions.IsAuthenticated()]

    def get_queryset(self):
        qs = super().get_queryset()
        business_id = self.request.query_params.get("business_id")
        status_param = self.request.query_params.get("status")
        if business_id:
            qs = qs.filter(business_id=business_id)
        if status_param:
            qs = qs.filter(status=status_param)
        user = self.request.user
        if user.is_authenticated and user.role != User.Role.SUPER_ADMIN:
            ids = accessible_business_ids(user)
            if ids is not None:
                qs = qs.filter(business_id__in=ids)
        return qs.order_by("-created_at")

    def perform_create(self, serializer):
        order = serializer.save()
        try:
            notify_admin_new_order(
                Order.objects.prefetch_related("lines__item").select_related("business").get(pk=order.pk)
            )
        except Exception:
            logger.exception("Adminga buyurtma xabari (order_id=%s)", order.id)

    def perform_update(self, serializer):
        prev = serializer.instance.status
        order = serializer.save()
        if prev != order.status:
            try:
                notify_customer_order_status(order)
            except Exception:
                logger.exception("Mijozga buyurtma holati (order_id=%s)", order.id)
