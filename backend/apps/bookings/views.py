import logging

from rest_framework import permissions, viewsets

from apps.accounts.models import User
from apps.businesses.services import accessible_business_ids

from .models import Booking
from .notifications import notify_admin_new_booking, notify_customer_status_change
from .serializers import BookingSerializer

logger = logging.getLogger(__name__)


class BookingViewSet(viewsets.ModelViewSet):
    queryset = Booking.objects.select_related("business", "city", "customer").all()
    serializer_class = BookingSerializer

    def get_permissions(self):
        if self.action == "create":
            return [permissions.AllowAny()]
        return [permissions.IsAuthenticated()]

    def get_queryset(self):
        qs = super().get_queryset()
        business_id = self.request.query_params.get("business_id")
        booking_type = self.request.query_params.get("booking_type")
        status_param = self.request.query_params.get("status")
        if business_id:
            qs = qs.filter(business_id=business_id)
        if booking_type:
            qs = qs.filter(booking_type=booking_type)
        if status_param:
            qs = qs.filter(status=status_param)
        user = self.request.user
        if user.is_authenticated and user.role != User.Role.SUPER_ADMIN:
            ids = accessible_business_ids(user)
            if ids is not None:
                qs = qs.filter(business_id__in=ids)
        return qs.order_by("-created_at")

    def perform_create(self, serializer):
        booking = serializer.save()
        try:
            notify_admin_new_booking(booking)
        except Exception:
            logger.exception("Adminga bron xabarini yuborishda xatolik (booking_id=%s)", booking.id)

    def perform_update(self, serializer):
        prev_status = serializer.instance.status
        booking = serializer.save()
        if prev_status != booking.status:
            try:
                notify_customer_status_change(booking, prev_status)
            except Exception:
                logger.exception(
                    "Mijozga status o‘zgarishi xabarini yuborishda xatolik (booking_id=%s)",
                    booking.id,
                )
