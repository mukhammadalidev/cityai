import json
import os
from typing import Any

from asgiref.sync import sync_to_async


def _build_prompt(ctx: dict[str, Any], user_message: str) -> str:
    clinic = ctx["business_type"] == "clinic"
    legal = ctx["business_type"] == "legal_service"
    extra = ""
    if clinic:
        extra += "\nMUHIM: Tibbiy tashxis qo‘ymang, faqat xizmatlar, narxlar, qabul va manzil haqida javob bering.\n"
    if legal:
        extra += "\nMUHIM: Yakuniy yuridik maslahat bermang, konsultatsiyaga yo‘naltiring.\n"
    items_txt = json.dumps(ctx.get("items") or [], ensure_ascii=False)
    kn_txt = json.dumps(ctx.get("knowledge_base") or [], ensure_ascii=False)
    return f"""Siz shahar xizmatlari platformasining yordamchisisiz. Faqat berilgan ma’lumot asosida javob bering.

Biznes turi: {ctx['business_type']}
Biznes: {ctx['business_name']}
Ma’lumot:
{ctx['business_info']}

Mahsulot/xizmatlar (qisqa): {items_txt}
Bilim bazasi: {kn_txt}
{extra}
Qoidalar:
1. Narx, mavjudlik, chegirma o‘ylab topmang — yo‘q bo‘lsa telefon so‘rang.
2. Qisqa, xushmuomala, sotuvga yo‘naltirilgan o‘zbek tilida javob bering (foydalanuvchi ruscha yozsa, ruscha).
3. Xarid qiziqishi bo‘lsa telefon raqamini qoldirishni taklif qiling.

Foydalanuvchi xabari: {user_message}
"""


@sync_to_async
def ask_openai(ctx: dict[str, Any], user_message: str) -> str:
    prompt = _build_prompt(ctx, user_message)
    api_key = os.getenv("OPENAI_API_KEY", "").strip()
    if not api_key:
        return (
            "[Demo rejim: OpenAI kaliti yo‘q] Savolingiz qabul qilindi. "
            "Aniq ma’lumot uchun provayder telefonidan foydalaning yoki «Telefon qoldirish» tugmasini bosing."
        )
    try:
        from openai import OpenAI

        client = OpenAI(api_key=api_key)
        r = client.chat.completions.create(
            model=os.getenv("OPENAI_MODEL", "gpt-4o-mini"),
            messages=[{"role": "user", "content": prompt}],
            max_tokens=600,
        )
        return (r.choices[0].message.content or "").strip() or "Javob bo‘sh qaytdi."
    except Exception as e:
        return f"AI xizmatida xatolik: {e!s}"
