import html
import os

from aiogram import F, Router
from aiogram.filters import Command, CommandStart
from aiogram.types import CallbackQuery, InlineKeyboardButton, InlineKeyboardMarkup, Message
from aiogram.fsm.context import FSMContext
from asgiref.sync import sync_to_async

from services import session as session_svc

router = Router()


@sync_to_async
def _city_and_categories():
    from apps.city.models import City
    from apps.service_categories.models import ServiceCategory

    slug = os.getenv("DEFAULT_CITY_SLUG", "buxoro")
    city = City.objects.filter(slug=slug, is_active=True).first()
    if not city:
        return None, []
    cats = list(
        ServiceCategory.objects.filter(city=city, is_active=True).order_by("sort_order", "name")
    )
    return city, cats


def _categories_kb(city_id: int, cats) -> InlineKeyboardMarkup:
    rows = []
    row = []
    for c in cats:
        label = f"{c.icon} {c.name}" if c.icon else c.name
        row.append(InlineKeyboardButton(text=label[:60], callback_data=f"cat:{city_id}:{c.id}"))
        if len(row) == 2:
            rows.append(row)
            row = []
    if row:
        rows.append(row)
    return InlineKeyboardMarkup(inline_keyboard=rows)


@router.message(CommandStart())
@router.message(Command("menu"))
async def cmd_start(message: Message, state: FSMContext) -> None:
    await state.clear()
    try:
        city, cats = await _city_and_categories()
    except Exception:
        await message.answer(
            "⚠️ <b>Server bilan aloqa yo‘q.</b>\n"
            "Ma’lumotlar bazasi hozir javob bermayapti. Keyinroq urinib ko‘ring yoki administratorga murojaat qiling."
        )
        return
    if not city:
        await message.answer(
            "Shahar topilmadi. <code>DEFAULT_CITY_SLUG</code> (masalan, buxoro) va backend sozlamalarini tekshiring."
        )
        return
    text = (
        "Assalomu alaykum! Shahar xizmatlari botiga xush kelibsiz.\n"
        f"📍 <b>{html.escape(city.name)}</b>\n\n"
        "Kerakli xizmat turini tanlang:"
    )
    await message.answer(text, reply_markup=_categories_kb(city.id, cats))
    await session_svc.ensure_customer(city.id, message.from_user)


@router.callback_query(F.data.startswith("cat:"))
async def on_category(query: CallbackQuery, state: FSMContext) -> None:
    try:
        _, city_id, cat_id = query.data.split(":", 2)
        city_id, cat_id = int(city_id), int(cat_id)
    except (ValueError, IndexError):
        await query.answer("Noto‘g‘ri tanlov.", show_alert=True)
        return
    try:
        await session_svc.ensure_customer(city_id, query.from_user)
        await session_svc.set_category(query.from_user.id, city_id, cat_id)
        businesses = await session_svc.list_businesses(cat_id)
    except Exception:
        await query.answer("Ma’lumot yuklanmadi. Keyinroq urinib ko‘ring.", show_alert=True)
        return
    if not businesses:
        await query.answer("Bu yo‘nalishda hozircha provayder yo‘q.", show_alert=True)
        return
    rows = []
    row = []
    for b in businesses:
        title = f"⭐ {b['name']}" if b["is_featured"] else b["name"]
        row.append(InlineKeyboardButton(text=title[:28], callback_data=f"biz:{b['id']}"))
        if len(row) == 2:
            rows.append(row)
            row = []
    if row:
        rows.append(row)
    await query.message.answer(
        "Provayderni tanlang:",
        reply_markup=InlineKeyboardMarkup(inline_keyboard=rows),
    )
    await query.answer()
