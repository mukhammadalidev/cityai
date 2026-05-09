from datetime import date

from rest_framework import status, viewsets
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from businesses.models import Business
from billing.models import Invoice

from .models import BusinessSubscription, Plan
from .serializers import BusinessSubscriptionSerializer, PlanSerializer


class PlanViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Plan.objects.filter(is_active=True).order_by("monthly_price")
    serializer_class = PlanSerializer
    permission_classes = [IsAuthenticated]


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def current_subscription_view(request):
    business_id = request.query_params.get("business_id")
    if not business_id:
        return Response({"detail": "business_id kerak."}, status=400)
    sub = BusinessSubscription.objects.filter(business_id=business_id).select_related("plan").first()
    if not sub:
        return Response({"detail": "Subscription topilmadi."}, status=404)
    return Response(BusinessSubscriptionSerializer(sub).data)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def upgrade_subscription_view(request):
    business_id = request.data.get("business_id")
    plan_id = request.data.get("plan_id")
    if not business_id or not plan_id:
        return Response({"detail": "business_id va plan_id majburiy."}, status=400)

    business = Business.objects.filter(id=business_id).first()
    plan = Plan.objects.filter(id=plan_id, is_active=True).first()
    if not business or not plan:
        return Response({"detail": "Business yoki plan topilmadi."}, status=404)

    sub, _ = BusinessSubscription.objects.get_or_create(
        business=business,
        defaults={"plan": plan, "status": BusinessSubscription.Status.TRIAL, "start_date": date.today()},
    )
    sub.plan = plan
    sub.status = BusinessSubscription.Status.ACTIVE
    sub.save()

    Invoice.objects.create(
        business=business,
        subscription=sub,
        amount=plan.setup_price,
        invoice_type=Invoice.InvoiceType.SETUP,
        due_date=date.today(),
        note=f"{plan.name} tarifiga o'tish so'rovi",
    )
    return Response({"message": "Tarif yangilash so'rovi qabul qilindi."}, status=status.HTTP_201_CREATED)
from django.shortcuts import render

# Create your views here.
