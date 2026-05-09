"""AI ishlatish yozuvlari."""

from decimal import Decimal

from apps.analytics.models import AIUsage


def save_ai_usage_record(
    *,
    city_id: int,
    business_id: int,
    customer_id: int | None,
    message: str,
    response: str,
    prompt_tokens: int,
    completion_tokens: int,
    total_tokens: int,
    estimated_cost_usd: Decimal,
) -> None:
    AIUsage.objects.create(
        city_id=city_id,
        business_id=business_id,
        customer_id=customer_id,
        message=(message or "")[:8000],
        response=(response or "")[:8000],
        prompt_tokens=max(0, int(prompt_tokens or 0)),
        completion_tokens=max(0, int(completion_tokens or 0)),
        total_tokens=max(0, int(total_tokens or 0)),
        estimated_cost=estimated_cost_usd,
    )
