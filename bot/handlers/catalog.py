import html

from aiogram import F, Router
from aiogram.types import CallbackQuery, KeyboardButton, Message, ReplyKeyboardMarkup
from aiogram.fsm.context import FSMContext
from asgiref.sync import sync_to_async

from services import session as session_svc

router = Router()


@sync_to_async
def _business_menu_buttons(business_id: int):
    from apps.bot_engine.models import BotTemplate
    from apps.businesses.models import Business

    b = Business.objects.filter(pk=business_id).first()
    if not b:
        return [], None
    tpl = BotTemplate.objects.filter(category_type=b.business_type, is_active=True).first()
    buttons = []
    if tpl and tpl.menu_config:
        for row in tpl.menu_config.get("buttons", []):
            if isinstance(row, str):
                buttons.append([KeyboardButton(text=row)])
            elif isinstance(row, list):
                buttons.append([KeyboardButton(text=t) for t in row])
    if not buttons:
        buttons = [
            [KeyboardButton(text="📋 Xizmatlarni ko‘rish")],
            [KeyboardButton(text="📍 Manzil"), KeyboardButton(text="☎️ Telefon qoldirish")],
            [KeyboardButton(text="❓ Savol berish")],
            [KeyboardButton(text="🏠 Bosh menyuga")],
        ]
    return buttons, b


@router.callback_query(F.data.startswith("biz:"))
async def on_business(query: CallbackQuery, state: FSMContext) -> None:
    try:
        business_id = int(query.data.split(":", 1)[1])
    except (ValueError, IndexError):
        await query.answer("Noto‘g‘ri tanlov.", show_alert=True)
        return
    city_id = await session_svc.get_city_for_user(query.from_user.id)
    if not city_id:
        await query.answer("Avval kategoriya tanlang.", show_alert=True)
        return
    try:
        await session_svc.set_business(query.from_user.id, city_id, business_id)
        buttons, b = await _business_menu_buttons(business_id)
    except Exception:
        await query.answer("Ma’lumot saqlanmadi. Keyinroq urinib ko‘ring.", show_alert=True)
        return
    if not b:
        await query.answer("Biznes topilmadi.", show_alert=True)
        return
    kb = ReplyKeyboardMarkup(keyboard=buttons, resize_keyboard=True)
    text = (
        f"✅ <b>{html.escape(b.name)}</b>\n"
        f"{html.escape((b.description or '')[:500])}\n"
        f"⭐ Reyting: {b.rating}\n"
        f"📍 {html.escape(b.address or '—')}\n\n"
        "Pastdagi menyudan tanlang yoki matn yozing (AI javob beradi)."
    )
    await query.message.answer(text, reply_markup=kb)
    await query.answer()


@router.message(F.text == "📋 Xizmatlarni ko‘rish")
async def list_items(message: Message) -> None:
    try:
        lines = await session_svc.format_items_for_user(message.from_user.id)
    except Exception:
        await message.answer("Xizmatlar ro‘yxatini yuklab bo‘lmadi. Keyinroq urinib ko‘ring.")
        return
    if not lines:
        await message.answer("Avval provayderni tanlang yoki xizmatlar hozircha yo‘q.")
        return
    await message.answer("\n\n".join(lines)[:4000])


@router.message(F.text == "📍 Manzil")
async def show_address(message: Message) -> None:
    try:
        info = await session_svc.get_selected_business_info(message.from_user.id)
    except Exception:
        await message.answer("Manzil ma’lumotini olib bo‘lmadi. Keyinroq urinib ko‘ring.")
        return
    if not info:
        await message.answer("Provayder tanlanmagan.")
        return
    await message.answer(
        f"📍 <b>{html.escape(info['name'])}</b>\n{html.escape(info.get('address') or '—')}\n"
        f"🕐 {html.escape(info.get('working_hours') or '—')}"
    )


@router.message(F.text == "🏠 Bosh menyuga")
async def back_home(message: Message, state: FSMContext) -> None:
    from handlers.start import cmd_start

    try:
        await cmd_start(message, state)
    except Exception:
        await message.answer("Bosh menyuni ochib bo‘lmadi. /start buyrug‘ini bosing.")
