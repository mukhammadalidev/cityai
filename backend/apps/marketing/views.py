from rest_framework import permissions, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

from apps.businesses.services import accessible_business_ids, can_edit_business
from apps.accounts.models import User
from apps.subscriptions.services import get_plan_for_business

from .models import MarketingContentRequest
from .serializers import MarketingContentRequestSerializer


@api_view(["POST"])
@permission_classes([permissions.IsAuthenticated])
def marketing_generate_view(request):
    business_id = request.data.get("business_id")
    from apps.businesses.models import Business

    business = Business.objects.filter(pk=business_id).first()
    if not business or not can_edit_business(request.user, business):
        return Response({"detail": "Ruxsat yo‘q."}, status=status.HTTP_403_FORBIDDEN)
    if request.user.role != User.Role.SUPER_ADMIN:
        pl = get_plan_for_business(business.id)
        if not pl or not pl.has_marketing_generator:
            return Response(
                {"detail": "Marketing generator joriy tarifda yo‘q. Billing sahifasidan tarifni yangilang."},
                status=status.HTTP_403_FORBIDDEN,
            )
    prompt = request.data.get("prompt", "")
    ctype = request.data.get("content_type", "post")
    # MVP: mock generation (OpenAI can be wired via env)
    result = f"[Demo] {business.name} uchun {ctype}: {prompt[:200] or 'matn'}"
    row = MarketingContentRequest.objects.create(
        business=business,
        user=request.user,
        content_type=ctype,
        prompt=prompt,
        result=result,
    )
    return Response(MarketingContentRequestSerializer(row).data, status=status.HTTP_201_CREATED)


@api_view(["GET"])
@permission_classes([permissions.IsAuthenticated])
def marketing_history_view(request):
    qs = MarketingContentRequest.objects.select_related("business").all()
    business_id = request.query_params.get("business_id")
    if business_id:
        qs = qs.filter(business_id=business_id)

    if request.user.role != User.Role.SUPER_ADMIN:
        ids = accessible_business_ids(request.user)
        if ids is not None:
            qs = qs.filter(business_id__in=ids)
    qs = qs.order_by("-created_at")[:100]
    return Response(MarketingContentRequestSerializer(qs, many=True).data)
