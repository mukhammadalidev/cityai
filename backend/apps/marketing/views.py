from rest_framework import permissions, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

from apps.businesses.services import accessible_business_ids, can_generate_marketing
from apps.accounts.models import User
from apps.subscriptions.services import get_plan_for_business
from apps.analytics.services import save_ai_usage_record
from botapp.services.ai_service import chat_complete

from .models import MarketingContentRequest
from .serializers import MarketingContentRequestSerializer

_CONTENT_TYPE_LABELS = {
    "instagram_post": "Instagram post",
    "telegram_post": "Telegram kanal posti",
    "reels_script": "Reels / qisqa video ssenariy",
    "ad_copy": "Reklama matni (sarlavha + asosiy matn)",
    "story": "Stories matni",
    "product_desc": "Mahsulot yoki xizmat tavsifi",
}


def _build_marketing_system_prompt(business) -> str:
    parts = [
        "Sen tajribali marketing mutaxissisan. Javoblar o‘zbek tilida, tayyor nashr qilish mumkin bo‘lgan holda.",
        f"Biznes nomi: «{business.name}».",
        f"Biznes turi: {business.get_business_type_display()}.",
    ]
    desc = (business.description or "").strip()
    if desc:
        parts.append(f"Biznes haqida (qisqa): {desc[:1500]}")
    if (business.phone or "").strip():
        parts.append(f"Aloqa telefoni (agar matnga mos kelsa): {business.phone}")
    parts.append(
        "Talablar: professional, ishonchli; emoji muvozanatli; bitta aniq chaqiriq (CTA); "
        "keraksiz «biz platformamiz» kabi gaplardan qoch; matn uzunligi kontent turiga mos (odatda 400–2000 belg)."
    )
    return "\n".join(parts)


@api_view(["POST"])
@permission_classes([permissions.IsAuthenticated])
def marketing_generate_view(request):
    business_id = request.data.get("business_id")
    from apps.businesses.models import Business

    business = Business.objects.filter(pk=business_id).first()
    if not business or not can_generate_marketing(request.user, business):
        return Response({"detail": "Ruxsat yo‘q."}, status=status.HTTP_403_FORBIDDEN)
    if request.user.role != User.Role.SUPER_ADMIN:
        pl = get_plan_for_business(business.id)
        if not pl or not pl.has_marketing_generator:
            return Response(
                {"detail": "Marketing generator joriy tarifda yo‘q. Billing sahifasidan tarifni yangilang."},
                status=status.HTTP_403_FORBIDDEN,
            )
    prompt = (request.data.get("prompt") or "").strip()
    ctype = request.data.get("content_type", "post")
    ctype_label = _CONTENT_TYPE_LABELS.get(ctype, ctype)

    system = _build_marketing_system_prompt(business)
    if prompt:
        user_message = f"Kontent turi: {ctype_label}.\n\nMijoz ko‘rsatmalari va kontekst:\n{prompt}"
    else:
        user_message = (
            f"Kontent turi: {ctype_label}.\n\n"
            f"Faqat tur: {ctype_label}. Yangi, jalb qiluvchi matn yoz."
        )
    completion = chat_complete(system, user_message)
    result = completion.text
    if completion.should_persist:
        save_ai_usage_record(
            city_id=business.city_id,
            business_id=business.id,
            customer_id=None,
            message=user_message,
            response=result,
            prompt_tokens=completion.prompt_tokens,
            completion_tokens=completion.completion_tokens,
            total_tokens=completion.total_tokens,
            estimated_cost_usd=completion.estimated_cost_usd,
        )
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
