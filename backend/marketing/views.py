from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from subscriptions.models import BusinessSubscription, Plan

from .models import MarketingContentRequest
from .serializers import MarketingContentRequestSerializer


def _generate_marketing_text(content_type: str, prompt: str) -> str:
    return (
        f"[{content_type}] uchun AI marketing matni\n\n"
        f"Asosiy g'oya: {prompt or 'Maxsus aksiya va taklif'}\n"
        "Biznesingiz uchun jalb qiluvchi, qisqa va sotuvga yo'naltirilgan matn tayyorlandi."
    )


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def marketing_generate_view(request):
    business_id = request.data.get("business_id")
    sub = BusinessSubscription.objects.filter(business_id=business_id).select_related("plan").first()
    if not sub or sub.plan.code not in [Plan.Code.BUSINESS, Plan.Code.PREMIUM]:
        return Response({"detail": "Marketing generator faqat Business/Premium tarifda mavjud."}, status=403)

    payload = request.data.copy()
    payload["user"] = request.user.id
    payload["prompt"] = payload.get("extra_prompt", "")
    payload["result"] = _generate_marketing_text(payload.get("content_type", "post"), payload.get("extra_prompt", ""))
    serializer = MarketingContentRequestSerializer(data=payload)
    serializer.is_valid(raise_exception=True)
    obj = serializer.save()
    return Response(MarketingContentRequestSerializer(obj).data, status=status.HTTP_201_CREATED)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def marketing_history_view(request):
    business_id = request.query_params.get("business_id")
    rows = MarketingContentRequest.objects.filter(business_id=business_id).order_by("-created_at")
    return Response(MarketingContentRequestSerializer(rows, many=True).data)
from django.shortcuts import render

# Create your views here.
