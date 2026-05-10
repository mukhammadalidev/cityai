from datetime import date, timedelta

from django.shortcuts import get_object_or_404
from rest_framework import permissions, status, viewsets
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

from apps.accounts.models import User
from apps.businesses.models import Business
from apps.businesses.services import can_edit_business

from .models import BusinessSubscription, SubscriptionPlan
from .serializers import BusinessSubscriptionSerializer, SubscriptionPlanSerializer


class SubscriptionPlanViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = SubscriptionPlan.objects.filter(is_active=True)
    serializer_class = SubscriptionPlanSerializer
    permission_classes = [permissions.IsAuthenticated]


class BusinessSubscriptionViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = BusinessSubscriptionSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        qs = BusinessSubscription.objects.select_related("business", "plan").all()
        business_id = self.request.query_params.get("business_id")
        if business_id:
            qs = qs.filter(business_id=business_id)
        if self.request.user.role != User.Role.SUPER_ADMIN:
            from apps.businesses.services import accessible_business_ids

            ids = accessible_business_ids(self.request.user)
            if ids is not None:
                qs = qs.filter(business_id__in=ids)
        return qs.order_by("-created_at")


@api_view(["POST"])
@permission_classes([permissions.IsAuthenticated])
def upgrade_subscription_view(request):
    business_id = request.data.get("business_id")
    plan_code = request.data.get("plan_code")
    business = get_object_or_404(Business, pk=business_id)
    if not can_edit_business(request.user, business) and request.user.role != User.Role.SUPER_ADMIN:
        return Response({"detail": "Ruxsat yo‘q."}, status=status.HTTP_403_FORBIDDEN)
    plan = get_object_or_404(SubscriptionPlan, code=plan_code, is_active=True)
    d0 = date.today()
    trial = int(getattr(plan, "trial_days", 0) or 0)
    if plan.code == SubscriptionPlan.Code.DEMO and trial > 0:
        end = d0 + timedelta(days=trial)
        st = BusinessSubscription.Status.TRIAL
    else:
        end = d0 + timedelta(days=30)
        st = BusinessSubscription.Status.ACTIVE
    sub = BusinessSubscription.objects.create(
        business=business,
        plan=plan,
        status=st,
        start_date=d0,
        end_date=end,
        next_payment_date=end,
    )
    return Response(BusinessSubscriptionSerializer(sub).data, status=status.HTTP_201_CREATED)
