import logging
import os
from dataclasses import dataclass
from decimal import Decimal

from openai import OpenAI

logger = logging.getLogger(__name__)


@dataclass
class ChatCompletionResult:
    text: str
    prompt_tokens: int = 0
    completion_tokens: int = 0
    total_tokens: int = 0
    estimated_cost_usd: Decimal = Decimal("0")
    should_persist: bool = False


def _price_per_million_usd(model: str) -> tuple[Decimal, Decimal]:
    """So‘nggi model narxlari (1M token uchun USD); .env bilan ustuvor."""
    env_in = (os.getenv("OPENAI_PRICE_INPUT_PER_1M_USD") or "").strip()
    env_out = (os.getenv("OPENAI_PRICE_OUTPUT_PER_1M_USD") or "").strip()
    if env_in and env_out:
        return Decimal(env_in), Decimal(env_out)
    key = (model or "").lower()
    defaults: dict[str, tuple[Decimal, Decimal]] = {
        "gpt-4o-mini": (Decimal("0.15"), Decimal("0.60")),
        "gpt-4o": (Decimal("2.50"), Decimal("10.00")),
        "gpt-3.5-turbo": (Decimal("0.50"), Decimal("1.50")),
    }
    for name, prices in defaults.items():
        if name in key:
            return prices
    return Decimal("0.15"), Decimal("0.60")


def estimate_openai_cost_usd(model: str, prompt_tokens: int, completion_tokens: int) -> Decimal:
    pin, pout = _price_per_million_usd(model)
    pt = Decimal(max(0, int(prompt_tokens or 0)))
    ct = Decimal(max(0, int(completion_tokens or 0)))
    usd = (pt * pin + ct * pout) / Decimal(1_000_000)
    return usd.quantize(Decimal("0.0001"))


def chat_complete(system_prompt: str, user_message: str) -> ChatCompletionResult:
    """
    OpenAI Chat Completions: matn + tokenlar + taxminiy USD sarfi.
    OPENAI_API_KEY, ixtiyoriy OPENAI_MODEL (default: gpt-4o-mini).
    """
    api_key = (os.getenv("OPENAI_API_KEY") or "").strip()
    if not api_key:
        return ChatCompletionResult(
            text=(
                "⚠️ OpenAI kaliti sozlanmagan. Admin `.env` faylida `OPENAI_API_KEY=sk-...` qo‘shishi kerak."
            ),
        )

    model = (os.getenv("OPENAI_MODEL") or "gpt-4o-mini").strip()
    client = OpenAI(api_key=api_key)
    try:
        response = client.chat.completions.create(
            model=model,
            messages=[
                {"role": "system", "content": system_prompt[:12000]},
                {"role": "user", "content": user_message[:8000]},
            ],
            max_tokens=900,
            temperature=0.4,
        )
        text = (response.choices[0].message.content or "").strip()
        out_text = text or "Javob bo‘sh keldi. Operator bilan bog‘laning."
        usage = response.usage
        pt = int(usage.prompt_tokens) if usage and usage.prompt_tokens is not None else 0
        ct = int(usage.completion_tokens) if usage and usage.completion_tokens is not None else 0
        tt = int(usage.total_tokens) if usage and usage.total_tokens is not None else pt + ct
        cost = estimate_openai_cost_usd(model, pt, ct)
        return ChatCompletionResult(
            text=out_text,
            prompt_tokens=pt,
            completion_tokens=ct,
            total_tokens=tt,
            estimated_cost_usd=cost,
            should_persist=True,
        )
    except Exception as exc:
        logger.exception("OpenAI chat.completions xato: %s", exc)
        return ChatCompletionResult(
            text=(
                "⚠️ AI xizmatiga ulanib bo‘lmadi (kalit, limit yoki tarmoq). "
                "Keyinroq urinib ko‘ring yoki operator bilan bog‘laning."
            ),
        )


def generate_ai_reply(system_prompt: str, user_message: str) -> str:
    """Faqat matn (eski chaqiruvlar uchun)."""
    return chat_complete(system_prompt, user_message).text
