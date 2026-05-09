import logging

from django.db.models import Q
from rest_framework import permissions, viewsets

from apps.accounts.models import User
from apps.businesses.services import accessible_business_ids

from .models import Lead
from .notifications import notify_admin_new_lead, notify_customer_lead_status
from .serializers import LeadSerializer

logger = logging.getLogger(__name__)


class LeadViewSet(viewsets.ModelViewSet):
    queryset = Lead.objects.select_related("business", "city", "customer", "item").all()
    serializer_class = LeadSerializer

    def get_permissions(self):
        if self.action == "create":
            return [permissions.AllowAny()]
        return [permissions.IsAuthenticated()]

    def get_queryset(self):
        qs = super().get_queryset()
        business_id = self.request.query_params.get("business_id")
        city_id = self.request.query_params.get("city_id")
        lead_type = self.request.query_params.get("lead_type")
        status_param = self.request.query_params.get("status")
        if business_id:
            qs = qs.filter(business_id=business_id)
        if city_id:
            qs = qs.filter(city_id=city_id)
        if lead_type:
            qs = qs.filter(lead_type=lead_type)
        if status_param:
            qs = qs.filter(status=status_param)
        search = self.request.query_params.get("search")
        if search:
            qs = qs.filter(Q(name__icontains=search) | Q(phone__icontains=search))
        user = self.request.user
        if user.is_authenticated and user.role != User.Role.SUPER_ADMIN:
            ids = accessible_business_ids(user)
            if ids is not None:
                qs = qs.filter(business_id__in=ids)
        return qs.order_by("-created_at")

    def perform_create(self, serializer):
        lead = serializer.save()
        if lead.source == Lead.Source.TELEGRAM_BOT:
            try:
                notify_admin_new_lead(Lead.objects.select_related("business", "item").get(pk=lead.pk))
            except Exception:
                logger.exception("Adminga lid xabari (lead_id=%s)", lead.id)

    def perform_update(self, serializer):
        prev = serializer.instance.status
        lead = serializer.save()
        if prev != lead.status:
            try:
                notify_customer_lead_status(lead)
            except Exception:
                logger.exception("Mijozga lid holati (lead_id=%s)", lead.id)
