from django.db.models import Count
from django.db.models.functions import TruncDate
from rest_framework import permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

from apps.accounts.models import User
from apps.businesses.models import Business
from apps.businesses.services import accessible_business_ids, can_edit_business
from apps.catalog.models import Item
from apps.customers.models import TelegramCustomer
from apps.leads.models import Lead
from apps.service_categories.models import ServiceCategory
from apps.subscriptions.models import BusinessSubscription
from apps.subscriptions.services import get_plan_for_business

from .models import AIUsage
from .serializers import AIUsageSerializer


@api_view(["GET"])
@permission_classes([permissions.IsAuthenticated])
def platform_analytics_view(request):
    if request.user.role != User.Role.SUPER_ADMIN:
        return Response({"detail": "Faqat platforma admini."}, status=403)
    from apps.city.models import City

    leads_by_day = (
        Lead.objects.annotate(d=TruncDate("created_at"))
        .values("d")
        .annotate(c=Count("id"))
        .order_by("d")[:30]
    )
    by_cat = (
        Business.objects.values("category__name")
        .annotate(c=Count("id"))
        .order_by("-c")[:12]
    )
    return Response(
        {
            "businesses_total": Business.objects.count(),
            "categories_total": ServiceCategory.objects.count(),
            "leads_total": Lead.objects.count(),
            "customers_total": TelegramCustomer.objects.count(),
            "subscriptions_active": BusinessSubscription.objects.filter(
                status=BusinessSubscription.Status.ACTIVE
            ).count(),
            "leads_by_day": list(leads_by_day),
            "businesses_by_category": list(by_cat),
            "items_total": Item.objects.count(),
        }
    )


@api_view(["GET"])
@permission_classes([permissions.IsAuthenticated])
def business_analytics_view(request, business_id):
    business = Business.objects.filter(pk=business_id).first()
    if not business:
        return Response({"detail": "Topilmadi."}, status=404)
    if not can_edit_business(request.user, business) and request.user.role != User.Role.SUPER_ADMIN:
        return Response({"detail": "Ruxsat yo‘q."}, status=403)
    if request.user.role != User.Role.SUPER_ADMIN:
        pl = get_plan_for_business(business.id)
        if not pl or not pl.has_analytics:
            return Response(
                {"detail": "Biznes analitikasi joriy tarifda yo‘q. Billing sahifasidan tarifni yangilang."},
                status=403,
            )
    return Response(
        {
            "leads_total": Lead.objects.filter(business=business).count(),
            "leads_new": Lead.objects.filter(business=business, status=Lead.Status.NEW).count(),
            "items_active": Item.objects.filter(business=business, status=Item.Status.ACTIVE).count(),
            "ai_messages_month": AIUsage.objects.filter(business=business).count(),
        }
    )


@api_view(["GET"])
@permission_classes([permissions.IsAuthenticated])
def ai_usage_list_view(request):
    qs = AIUsage.objects.select_related("city", "business").all()
    business_id = request.query_params.get("business_id")
    if business_id:
        qs = qs.filter(business_id=business_id)
    if request.user.role != User.Role.SUPER_ADMIN:
        ids = accessible_business_ids(request.user)
        if ids is not None:
            qs = qs.filter(business_id__in=ids)
    qs = qs.order_by("-created_at")[:200]
    return Response(AIUsageSerializer(qs, many=True).data)
