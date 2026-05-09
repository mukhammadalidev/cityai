from django.db.models import Count
from django.utils import timezone
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from leads.models import Lead
from usage.models import AIUsage


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def analytics_dashboard_view(request):
    business_id = request.query_params.get("business_id")
    month = timezone.now().strftime("%Y-%m")
    leads = Lead.objects.filter(business_id=business_id)
    ai_count = AIUsage.objects.filter(business_id=business_id, created_at__startswith=month).count()
    return Response(
        {
            "today_leads": leads.filter(created_at__date=timezone.localdate()).count(),
            "monthly_leads": leads.filter(created_at__startswith=month).count(),
            "ai_usage": ai_count,
            "won_leads": leads.filter(status__in=["won", "sold"]).count(),
            "lost_leads": leads.filter(status__in=["lost", "cancelled"]).count(),
        }
    )


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def analytics_managers_view(request):
    business_id = request.query_params.get("business_id")
    rows = (
        Lead.objects.filter(business_id=business_id, assigned_to__isnull=False)
        .values("assigned_to__id", "assigned_to__full_name")
        .annotate(total=Count("id"))
    )
    return Response(list(rows))


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def analytics_conversion_view(request):
    business_id = request.query_params.get("business_id")
    total = Lead.objects.filter(business_id=business_id).count()
    won = Lead.objects.filter(business_id=business_id, status__in=["won", "sold"]).count()
    percent = int((won / total) * 100) if total else 0
    return Response({"total": total, "won": won, "conversion_percent": percent})
from django.shortcuts import render

# Create your views here.
