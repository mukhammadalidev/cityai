from django.utils import timezone
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from subscriptions.models import BusinessSubscription

from .models import AIUsage


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def current_usage_view(request):
    business_id = request.query_params.get("business_id")
    month = timezone.now().strftime("%Y-%m")
    qs = AIUsage.objects.filter(business_id=business_id, created_at__startswith=month)
    ai_messages = qs.count()
    token_sum = sum(qs.values_list("total_tokens", flat=True))
    sub = BusinessSubscription.objects.filter(business_id=business_id).select_related("plan").first()
    limit = sub.plan.max_ai_messages_per_month if sub else 0
    remaining = max(0, limit - ai_messages)
    percent = int((ai_messages / limit) * 100) if limit else 0
    return Response(
        {
            "month": month,
            "ai_messages_used": ai_messages,
            "ai_messages_limit": limit,
            "ai_messages_remaining": remaining,
            "usage_percent": percent,
            "total_tokens": token_sum,
        }
    )


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def ai_usage_list_view(request):
    business_id = request.query_params.get("business_id")
    rows = AIUsage.objects.filter(business_id=business_id).order_by("-created_at")[:100]
    return Response(
        [
            {
                "id": row.id,
                "message": row.message,
                "total_tokens": row.total_tokens,
                "estimated_cost": str(row.estimated_cost),
                "created_at": row.created_at,
            }
            for row in rows
        ]
    )
from django.shortcuts import render

# Create your views here.
