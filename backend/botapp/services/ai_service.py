import logging
import os

from openai import OpenAI

logger = logging.getLogger(__name__)


def generate_ai_reply(system_prompt: str, user_message: str) -> str:
    """
    OpenAI Chat Completions orqali javob (Telegram bot AI tugmasi).
    OPENAI_API_KEY va ixtiyoriy OPENAI_MODEL (default: gpt-4o-mini).
    """
    api_key = (os.getenv("OPENAI_API_KEY") or "").strip()
    if not api_key:
        return (
            "⚠️ OpenAI kaliti sozlanmagan. Admin `.env` faylida `OPENAI_API_KEY=sk-...` qo‘shishi kerak."
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
        return text or "Javob bo‘sh keldi. Operator bilan bog‘laning."
    except Exception as exc:
        logger.exception("OpenAI chat.completions xato: %s", exc)
        return (
            "⚠️ AI xizmatiga ulanib bo‘lmadi (kalit, limit yoki tarmoq). "
            "Keyinroq urinib ko‘ring yoki operator bilan bog‘laning."
        )
