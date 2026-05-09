from django.utils import timezone
from rest_framework import permissions, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from apps.accounts.models import User
from apps.businesses.services import accessible_business_ids, can_edit_business

from .models import Invoice
from .serializers import InvoiceSerializer


class InvoiceViewSet(viewsets.ModelViewSet):
    serializer_class = InvoiceSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        qs = Invoice.objects.select_related("business").all()
        business_id = self.request.query_params.get("business_id")
        if business_id:
            qs = qs.filter(business_id=business_id)
        if self.request.user.role != User.Role.SUPER_ADMIN:
            ids = accessible_business_ids(self.request.user)
            if ids is not None:
                qs = qs.filter(business_id__in=ids)
        return qs.order_by("-created_at")

    def perform_create(self, serializer):
        if self.request.user.role != User.Role.SUPER_ADMIN:
            from rest_framework.exceptions import PermissionDenied

            raise PermissionDenied("Faqat admin hisob yarata oladi.")
        serializer.save()

    @action(detail=True, methods=["post"])
    def mark_paid(self, request, pk=None):
        inv = self.get_object()
        if not can_edit_business(request.user, inv.business) and request.user.role != User.Role.SUPER_ADMIN:
            return Response({"detail": "Ruxsat yo‘q."}, status=403)
        inv.status = Invoice.Status.PAID
        inv.paid_at = timezone.now()
        inv.save(update_fields=["status", "paid_at"])
        return Response(InvoiceSerializer(inv).data)
