from aiogram import F, Router
from aiogram.enums import ParseMode
from aiogram.fsm.context import FSMContext
from aiogram.fsm.state import State, StatesGroup
from aiogram.types import Message

from services import session as session_svc

router = Router()


class LeadForm(StatesGroup):
    name = State()
    phone = State()
    message = State()


@router.message(F.text == "☎️ Telefon qoldirish")
async def lead_start(message: Message, state: FSMContext) -> None:
    await state.set_state(LeadForm.name)
    await message.answer("Ismingizni yozing:")


@router.message(LeadForm.name)
async def lead_name(message: Message, state: FSMContext) -> None:
    await state.update_data(name=message.text)
    await state.set_state(LeadForm.phone)
    await message.answer("Telefon raqamingizni yuboring (+998 …):")


@router.message(LeadForm.phone)
async def lead_phone(message: Message, state: FSMContext) -> None:
    await state.update_data(phone=message.text)
    await state.set_state(LeadForm.message)
    await message.answer("Qisqa xabar yozing (nima kerakligi):")


@router.message(LeadForm.message)
async def lead_done(message: Message, state: FSMContext) -> None:
    data = await state.get_data()
    await state.clear()
    ok, detail = await session_svc.create_lead(
        telegram_user=message.from_user,
        name=data.get("name", ""),
        phone=data.get("phone", ""),
        msg=message.text,
    )
    if ok:
        await message.answer("✅ So‘rovingiz qabul qilindi. Tez orada aloqaga chiqamiz.")
        if detail:
            try:
                await message.bot.send_message(
                    chat_id=detail,
                    parse_mode=ParseMode.HTML,
                    text=(
                        "🔔 <b>Yangi mijoz so‘rovi</b>\n"
                        f"Ism: {data.get('name')}\n"
                        f"Tel: {data.get('phone')}\n"
                        f"Xabar: {message.text}\n"
                        "Manba: Telegram bot"
                    ),
                )
            except Exception:
                pass
    else:
        await message.answer(f"❌ {detail}")
