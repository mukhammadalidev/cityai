from aiogram import F, Router
from aiogram.filters import StateFilter
from aiogram.fsm.state import default_state
from aiogram.types import Message

from services import ai as ai_svc
from services import session as session_svc

router = Router()


@router.message(F.text, StateFilter(default_state))
async def free_text(message: Message) -> None:
    if message.text.startswith("/"):
        return
    try:
        ctx = await session_svc.build_ai_context(message.from_user.id)
    except Exception:
        await message.answer("Kontekst yuklanmadi. /start orqali qayta boshlang.")
        return
    if not ctx:
        await message.answer("Iltimos, avval xizmat kategoriyasi va provayderni tanlang (/start).")
        return
    try:
        reply = await ai_svc.ask_openai(ctx, message.text)
    except Exception:
        await message.answer("AI javobini olishda xatolik. Keyinroq urinib ko‘ring yoki provayder telefonidan foydalaning.")
        return
    await message.answer(reply[:4000])
    try:
        await session_svc.log_ai_message(
            city_id=ctx["city_id"],
            business_id=ctx.get("business_id"),
            customer_id=ctx.get("customer_id"),
            user_text=message.text,
            reply=reply,
        )
    except Exception:
        pass
