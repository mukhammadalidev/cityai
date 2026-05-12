import asyncio
import datetime as dt
import html
import logging
import os
import re
from decimal import Decimal
from pathlib import Path

from aiogram import Bot, Dispatcher, F
from aiogram.client.default import DefaultBotProperties
from aiogram.enums import ParseMode
from aiogram.filters import Command, CommandStart
from aiogram.fsm.context import FSMContext
from aiogram.fsm.state import State, StatesGroup
from aiogram.fsm.storage.memory import MemoryStorage
from aiogram.types import (
    CallbackQuery,
    InlineKeyboardButton,
    InlineKeyboardMarkup,
    KeyboardButton,
    Message,
    ReplyKeyboardMarkup,
    ReplyKeyboardRemove,
)
from asgiref.sync import sync_to_async
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parents[2]
load_dotenv(BASE_DIR / ".env")
load_dotenv(BASE_DIR / "backend" / ".env")

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
import django  # noqa: E402

django.setup()

from apps.bookings.models import Booking  # noqa: E402
from apps.bookings.notifications import (  # noqa: E402
    notify_admin_new_booking,
    notify_admin_status_change,
    notify_customer_status_change,
)
from apps.businesses.models import Business  # noqa: E402
from apps.catalog.models import Item  # noqa: E402
from apps.customers.models import TelegramCustomer  # noqa: E402
from apps.leads.models import Lead  # noqa: E402
from apps.leads.notifications import (  # noqa: E402
    notify_admin_lead_status_line,
    notify_customer_lead_status,
)
from apps.orders.models import Order  # noqa: E402
from apps.orders.notifications import (  # noqa: E402
    notify_admin_order_status_line,
    notify_customer_order_status,
)
from apps.knowledge.models import KnowledgeBase  # noqa: E402
from botapp.bot_constants import AI_ASSIST_BUTTON, ALL_REPLY_MENU_LABELS  # noqa: E402
from botapp.bot_states import AiAssistStates, Flow  # noqa: E402
from botapp.category_flows import (  # noqa: E402
    category_intro_extra,
    category_reply_keyboard,
    register_category_flows,
)
from apps.analytics.services import save_ai_usage_record  # noqa: E402
from botapp.repository import ensure_customer  # noqa: E402
from botapp.services.ai_service import chat_complete  # noqa: E402

logger = logging.getLogger(__name__)

# --- Biznes turi tugmalari (apps.businesses.BusinessType bilan mos) ---
TYPE_LABELS = {
    Business.BusinessType.AUTO_SALON: "🚗 Avtosalon",
    Business.BusinessType.EDUCATION_CENTER: "🎓 O‘quv markaz",
    Business.BusinessType.SHOP: "🛒 Do‘kon",
    Business.BusinessType.RESTAURANT: "🍽 Restoran",
    Business.BusinessType.CLINIC: "🏥 Klinika",
    Business.BusinessType.BEAUTY_SALON: "💇 Go‘zallik saloni",
    Business.BusinessType.REPAIR_SERVICE: "🔧 Usta xizmatlari",
    Business.BusinessType.REAL_ESTATE: "🏠 Ko‘chmas mulk",
    Business.BusinessType.TAXI_DELIVERY: "🚕 Taxi / yetkazib berish",
    Business.BusinessType.FITNESS: "💪 Fitnes",
    Business.BusinessType.FITNESS_CENTER: "🏋️ Fitness zal",
    Business.BusinessType.LEGAL_SERVICE: "⚖️ Yuridik xizmat",
    Business.BusinessType.PHOTO_VIDEO: "📷 Foto / video",
    Business.BusinessType.CUSTOM: "📌 Boshqa",
}

ITEMS_BUTTON = "📋 Xizmatlar va narxlar"
ADDRESS_BUTTON = "📍 Manzil va ish vaqti"
OPERATOR_BUTTON = "☎️ Operator bilan bog‘lanish"
CHANGE_SALON_BUTTON = "🔄 Boshqa salon tanlash"
HOME_BUTTON = "🏠 Bosh menyu (biznes tanlash)"

# Restoran-specific menu (apps.businesses.BusinessType.RESTAURANT uchun)
R_MENU_BUTTON = "🍔 Menyu"
R_BOOK_BUTTON = "🍽 Stol bron qilish"
R_DELIVERY_BUTTON = "🚚 Yetkazib berish"
R_PROMO_BUTTON = "🔥 Aksiyalar"
R_ADDRESS_BUTTON = "📍 Manzil"
R_OPERATOR_BUTTON = "☎️ Operator"
CANCEL_BOOKING_BUTTON = "❌ Bekor qilish"
SHARE_PHONE_BUTTON = "📱 Raqamni yuborish"


class BookFlow(StatesGroup):
    name = State()
    phone = State()
    guests = State()
    date = State()
    time = State()
    note = State()


def _build_ai_system_prompt(business_block: str, knowledge_block: str) -> str:
    lines = [
        "Sen ushbu biznes uchun Telegram-bot yordamchisisan. Javoblar o‘zbek tilida, qisqa va muloyim bo‘lsin.",
        "Faqat pastdagi biznes ma’lumoti va bilim bazasiga tayan. Yetarli bo‘lmasa, aniq aytib, "
        "mijozni operator yoki bron/admin orqali bog‘lanishga yo‘naltir.",
        "Tibbiy tashxis, dori tavsiyasi yoki yakuniy yuridik maslahat bermagin.",
        "",
        "=== Biznes ===",
        business_block or "Ma’lumot yo‘q.",
    ]
    if knowledge_block:
        lines.extend(["", "=== Bilim bazasi (FAQ va qoidalar) ===", knowledge_block])
    return "\n".join(lines)


@sync_to_async
def _ai_context_for_business(business_id: int) -> tuple[str, str]:
    row = (
        Business.objects.filter(pk=business_id)
        .values("name", "business_type", "description", "address", "phone", "working_hours")
        .first()
    )
    if not row:
        return "", ""
    type_label = dict(Business.BusinessType.choices).get(row["business_type"], row["business_type"])
    biz_lines = [
        f"Nomi: {row['name']}",
        f"Tur: {type_label}",
    ]
    if row.get("description"):
        biz_lines.append(f"Tavsif: {row['description'][:2000]}")
    if row.get("address"):
        biz_lines.append(f"Manzil: {row['address']}")
    if row.get("phone"):
        biz_lines.append(f"Telefon: {row['phone']}")
    if row.get("working_hours"):
        biz_lines.append(f"Ish vaqti: {row['working_hours']}")
    biz_block = "\n".join(biz_lines)
    kb_chunks: list[str] = []
    for entry in KnowledgeBase.objects.filter(business_id=business_id, is_active=True).order_by(
        "-updated_at"
    )[:25]:
        kb_chunks.append(f"## {entry.title}\n{entry.content}")
    return biz_block, "\n\n".join(kb_chunks)


def business_type_keyboard() -> InlineKeyboardMarkup:
    rows = []
    for key, label in TYPE_LABELS.items():
        rows.append([InlineKeyboardButton(text=label, callback_data=f"t:{key}")])
    return InlineKeyboardMarkup(inline_keyboard=rows)


@sync_to_async
def list_businesses_by_type(business_type: str):
    return list(
        Business.objects.filter(business_type=business_type, status=Business.Status.ACTIVE)
        .order_by("name")
        .values("id", "name", "business_type")
    )


def salon_keyboard(businesses: list) -> InlineKeyboardMarkup:
    rows = []
    row = []
    for b in businesses:
        row.append(InlineKeyboardButton(text=b["name"][:58], callback_data=f"b:{b['id']}"))
        if len(row) == 2:
            rows.append(row)
            row = []
    if row:
        rows.append(row)
    rows.append([InlineKeyboardButton(text="⬅️ Orqaga (tur tanlash)", callback_data="t:back")])
    return InlineKeyboardMarkup(inline_keyboard=rows)


@sync_to_async
def get_business_row(business_id: int):
    """Slug bo‘sh bo‘lsa, model save orqali to‘ldiriladi."""
    b = Business.objects.filter(id=business_id, status=Business.Status.ACTIVE).first()
    if not b:
        return None
    if not (b.slug or "").strip():
        b.save()
    return Business.objects.filter(pk=b.pk).values().first()


@sync_to_async
def list_categories(business_id: int):
    """Item.category_name bo‘yicha bo‘limlar (1-based id tugmalar uchun)."""
    names = sorted(
        set(
            Item.objects.filter(business_id=business_id, status=Item.Status.ACTIVE)
            .exclude(category_name="")
            .values_list("category_name", flat=True)
        )
    )
    return [{"id": i + 1, "name": n} for i, n in enumerate(names)]


@sync_to_async
def list_items(business_id: int, category_idx: int | None):
    qs = Item.objects.filter(business_id=business_id, status=Item.Status.ACTIVE)
    if category_idx:
        names = sorted(
            set(
                Item.objects.filter(business_id=business_id, status=Item.Status.ACTIVE)
                .exclude(category_name="")
                .values_list("category_name", flat=True)
            )
        )
        if 0 < category_idx <= len(names):
            qs = qs.filter(category_name=names[category_idx - 1])
    return list(
        qs.order_by("title")[:40].values(
            "id",
            "title",
            "price",
            "currency",
            "description",
            "metadata",
            "category_name",
        )
    )


@sync_to_async
def log_ai_usage_from_bot(
    business_id: int,
    telegram_user,
    user_message: str,
    reply_text: str,
    prompt_tokens: int,
    completion_tokens: int,
    total_tokens: int,
    estimated_cost_usd: Decimal,
) -> None:
    biz = Business.objects.filter(pk=business_id).select_related("city").first()
    if not biz:
        return
    cust = ensure_customer(
        business_id,
        telegram_user.id,
        username=telegram_user.username or "",
        first_name=telegram_user.first_name or "",
        last_name=telegram_user.last_name or "",
    )
    save_ai_usage_record(
        city_id=biz.city_id,
        business_id=business_id,
        customer_id=cust.pk if cust else None,
        message=user_message,
        response=reply_text,
        prompt_tokens=prompt_tokens,
        completion_tokens=completion_tokens,
        total_tokens=total_tokens,
        estimated_cost_usd=estimated_cost_usd,
    )


@sync_to_async
def touch_customer(business_id: int, user) -> None:
    city_id = Business.objects.filter(pk=business_id).values_list("city_id", flat=True).first()
    if not city_id:
        return
    TelegramCustomer.objects.update_or_create(
        city_id=city_id,
        telegram_id=str(user.id),
        defaults={
            "username": user.username or "",
            "first_name": user.first_name or "",
            "last_name": user.last_name or "",
        },
    )


def category_keyboard(categories: list, business_id: int) -> InlineKeyboardMarkup:
    rows = []
    rows.append(
        [InlineKeyboardButton(text="📦 Barcha xizmatlar / mahsulotlar", callback_data=f"c:{business_id}:0")]
    )
    row = []
    for cat in categories:
        row.append(
            InlineKeyboardButton(
                text=cat["name"][:24],
                callback_data=f"c:{business_id}:{cat['id']}",
            )
        )
        if len(row) == 2:
            rows.append(row)
            row = []
    if row:
        rows.append(row)
    rows.append([InlineKeyboardButton(text="⬅️ Salon tanlash", callback_data="nav:salons")])
    return InlineKeyboardMarkup(inline_keyboard=rows)


def booking_phone_keyboard() -> ReplyKeyboardMarkup:
    return ReplyKeyboardMarkup(
        keyboard=[
            [KeyboardButton(text=SHARE_PHONE_BUTTON, request_contact=True)],
            [KeyboardButton(text=CANCEL_BOOKING_BUTTON)],
        ],
        resize_keyboard=True,
        one_time_keyboard=True,
    )


def booking_cancel_keyboard() -> ReplyKeyboardMarkup:
    return ReplyKeyboardMarkup(
        keyboard=[[KeyboardButton(text=CANCEL_BOOKING_BUTTON)]],
        resize_keyboard=True,
        one_time_keyboard=False,
    )


def _format_price(price, currency: str) -> str:
    if price is None:
        return "—"
    if isinstance(price, Decimal):
        p = int(price)
    else:
        p = int(price)
    return f"{p:,}".replace(",", " ") + f" {currency or 'UZS'}"


def _format_item_line(it: dict, business_type: str) -> str:
    title = html.escape(str(it.get("title") or ""))
    lines = [f"▫️ <b>{title}</b>", f"💰 {_format_price(it['price'], it['currency'])}"]
    if it.get("category_name"):
        lines.append(f"📂 {html.escape(str(it['category_name']))}")
    if it.get("description"):
        raw = str(it["description"])
        desc = html.escape(raw[:400])
        lines.append(desc + ("…" if len(raw) > 400 else ""))
    meta = it.get("metadata") or {}
    if isinstance(meta, dict) and meta:
        parts = []
        if business_type == Business.BusinessType.AUTO_SALON:
            for k in ("brand", "model", "year", "fuel_type"):
                if meta.get(k):
                    parts.append(f"{k}: {html.escape(str(meta[k]))}")
        elif business_type == Business.BusinessType.EDUCATION_CENTER:
            for k in ("duration", "level", "teacher", "format"):
                if meta.get(k):
                    parts.append(f"{k}: {html.escape(str(meta[k]))}")
        else:
            for k, v in list(meta.items())[:4]:
                parts.append(f"{html.escape(str(k))}: {html.escape(str(v))}")
        if parts:
            lines.append(" · ".join(parts))
    return "\n".join(lines)


storage = MemoryStorage()
dp = Dispatcher(storage=storage)
register_category_flows(dp)


@dp.message(CommandStart())
@dp.message(Command("menu"))
async def start_handler(message: Message, state: FSMContext) -> None:
    await state.clear()
    text = (
        "Assalomu alaykum! 👋\n\n"
        "<b>1-qadam:</b> biznes turini tanlang.\n"
        "<b>2-qadam:</b> biznesni tanlang.\n"
        "<b>3-qadam:</b> bo‘limni tanlab, narxlar ro‘yxatini ko‘ring.\n\n"
        "Pastdagi tugmalardan boshlang:"
    )
    await message.answer(text, reply_markup=business_type_keyboard())


@dp.message(AiAssistStates.waiting_question, F.text)
async def ai_assist_question(message: Message, state: FSMContext) -> None:
    text = (message.text or "").strip()
    if not text:
        return
    data = await state.get_data()
    btype = data.get("business_type") or ""
    reply_kb = category_reply_keyboard(btype)

    if text in ALL_REPLY_MENU_LABELS:
        await state.set_state(Flow.browsing)
        await message.answer("Menyuga qaytdingiz.", reply_markup=reply_kb)
        return

    if text == AI_ASSIST_BUTTON:
        await message.answer(
            "Savolingizni yozing. Chiqish uchun menyudagi boshqa tugmani bosing.",
            reply_markup=reply_kb,
        )
        return

    bid = data.get("business_id")
    if not bid:
        await state.set_state(Flow.browsing)
        await message.answer("Avval salon tanlang — /start.", reply_markup=business_type_keyboard())
        return

    biz_ctx, know_ctx = await _ai_context_for_business(int(bid))
    system = _build_ai_system_prompt(biz_ctx, know_ctx)
    completion = await asyncio.to_thread(chat_complete, system, text)
    reply_text = completion.text
    if completion.should_persist:
        await log_ai_usage_from_bot(
            int(bid),
            message.from_user,
            text,
            reply_text,
            completion.prompt_tokens,
            completion.completion_tokens,
            completion.total_tokens,
            completion.estimated_cost_usd,
        )
    await state.set_state(Flow.browsing)
    await message.answer(reply_text, parse_mode=None, reply_markup=reply_kb)


@dp.message(F.text == AI_ASSIST_BUTTON)
async def ai_assist_tap(message: Message, state: FSMContext) -> None:
    st = await state.get_state()
    if st is not None and "BookFlow" in str(st):
        await message.answer(
            "Bron jarayonidasiz. AI yordamchidan foydalanish uchun avval «Bekor qilish» "
            "yoki bronni yakunlang."
        )
        return
    data = await state.get_data()
    bid = data.get("business_id")
    if not bid:
        await message.answer(
            "Avval salon tanlang: /start",
            reply_markup=business_type_keyboard(),
        )
        return
    btype = data.get("business_type") or ""
    reply_kb = category_reply_keyboard(btype)
    if not (os.getenv("OPENAI_API_KEY") or "").strip():
        await message.answer(
            "⚠️ AI hozircha ulanmagan: serverda <code>OPENAI_API_KEY</code> yo‘q. "
            "Admin sozlagach, qayta urinib ko‘ring.",
            reply_markup=reply_kb,
        )
        return
    await state.set_state(AiAssistStates.waiting_question)
    await message.answer(
        "🤖 <b>AI yordamchi</b>\n\nSavolingizni yozing (matn). Chiqish uchun pastdagi menyudan "
        "boshqa tugmani bosing.",
        reply_markup=reply_kb,
    )


@dp.callback_query(F.data == "t:back")
async def back_to_types(query: CallbackQuery, state: FSMContext) -> None:
    await state.clear()
    try:
        await query.message.edit_reply_markup(reply_markup=None)
    except Exception:
        pass
    await query.message.answer(
        "Biznes turini tanlang:",
        reply_markup=business_type_keyboard(),
    )
    await query.answer()


@dp.callback_query(F.data.startswith("t:"))
async def type_selected(query: CallbackQuery, state: FSMContext) -> None:
    btype = query.data.split(":", 1)[1]
    if btype == "back":
        return
    businesses = await list_businesses_by_type(btype)
    if not businesses:
        await query.answer("Bu turda hozircha biznes yo‘q.", show_alert=True)
        return
    await state.update_data(business_type=btype)
    await state.set_state(Flow.choosing_salon)
    label = TYPE_LABELS.get(btype, btype)
    await query.message.answer(
        f"{label}\n\n<b>Biznesni tanlang:</b>",
        reply_markup=salon_keyboard(businesses),
    )
    await query.answer()


@dp.callback_query(F.data.startswith("b:"))
async def salon_selected(query: CallbackQuery, state: FSMContext) -> None:
    business_id = int(query.data.split(":", 1)[1])
    row = await get_business_row(business_id)
    if not row:
        await query.answer("Biznes topilmadi.", show_alert=True)
        return
    await touch_customer(business_id, query.from_user)
    await state.update_data(
        business_id=business_id,
        business_type=row["business_type"],
    )
    await state.set_state(Flow.browsing)
    cats = await list_categories(business_id)
    type_label = TYPE_LABELS.get(row["business_type"], "")
    intro = (
        f"✅ <b>{html.escape(str(row['name']))}</b>\n"
        f"{type_label}\n\n"
        "Pastdagi menyudan xizmatni tanlang."
    )
    intro += category_intro_extra(row["business_type"])
    await query.message.answer(intro, reply_markup=category_reply_keyboard(row["business_type"]))
    if row["business_type"] != Business.BusinessType.RESTAURANT:
        await query.message.answer(
            "Bo‘limni tanlang:",
            reply_markup=category_keyboard(cats, business_id),
        )
    await query.answer()


@dp.callback_query(F.data.startswith("c:"))
async def category_selected(query: CallbackQuery, state: FSMContext) -> None:
    parts = query.data.split(":")
    if len(parts) != 3:
        await query.answer()
        return
    business_id = int(parts[1])
    category_id = int(parts[2])
    data = await state.get_data()
    if data.get("business_id") != business_id:
        await query.answer("Avval biznesni qayta tanlang.", show_alert=True)
        return
    btype = data.get("business_type") or ""
    cat_idx = category_id or None
    items = await list_items(business_id, cat_idx)
    if not items:
        await query.answer("Bu bo‘limda hozircha yozuv yo‘q.", show_alert=True)
        return
    cat_title = "Barcha xizmatlar" if category_id == 0 else "Tanlangan bo‘lim"
    if btype == Business.BusinessType.RESTAURANT:
        from botapp.category_flows.tools import format_item_short, item_inline

        await query.message.answer(f"📋 <b>{cat_title}</b>")
        for it in items[:25]:
            iid = int(it["id"])
            await query.message.answer(
                format_item_short(it, btype),
                reply_markup=item_inline(
                    business_id,
                    iid,
                    [("📄 Batafsil", "d"), ("🍔 Buyurtma", "food")],
                ),
            )
    else:
        header = f"📋 <b>{cat_title}</b>\n\n"
        chunks = []
        buf = header
        for it in items:
            block = _format_item_line(it, btype) + "\n\n"
            if len(buf) + len(block) > 3800:
                chunks.append(buf)
                buf = block
            else:
                buf += block
        chunks.append(buf)
        for chunk in chunks:
            await query.message.answer(chunk)
    await query.answer()


@dp.callback_query(F.data == "nav:salons")
async def nav_back_salons(query: CallbackQuery, state: FSMContext) -> None:
    data = await state.get_data()
    btype = data.get("business_type")
    if not btype:
        await query.answer()
        return
    businesses = await list_businesses_by_type(btype)
    if not businesses:
        await query.answer("Ro‘yxat bo‘sh.", show_alert=True)
        return
    await state.set_state(Flow.choosing_salon)
    label = TYPE_LABELS.get(btype, "")
    await query.message.answer(
        f"{label}\n\n<b>Boshqa biznesni tanlang:</b>",
        reply_markup=salon_keyboard(businesses),
    )
    await query.answer()


@dp.message(F.text == HOME_BUTTON)
async def home_text(message: Message, state: FSMContext) -> None:
    await start_handler(message, state)


@dp.message(F.text == CHANGE_SALON_BUTTON)
async def change_salon_text(message: Message, state: FSMContext) -> None:
    data = await state.get_data()
    btype = data.get("business_type")
    if not btype:
        await message.answer("Avval tur tanlang.", reply_markup=business_type_keyboard())
        return
    businesses = await list_businesses_by_type(btype)
    if not businesses:
        await message.answer("Bu turda biznes yo‘q.")
        return
    await state.set_state(Flow.choosing_salon)
    await message.answer(
        "Boshqa biznesni tanlang:",
        reply_markup=salon_keyboard(businesses),
    )


@dp.message(F.text == ITEMS_BUTTON)
async def items_again(message: Message, state: FSMContext) -> None:
    data = await state.get_data()
    bid = data.get("business_id")
    if not bid:
        await message.answer("Avval biznesni tanlang — /start bosing.")
        return
    cats = await list_categories(bid)
    await message.answer("Bo‘limni tanlang:", reply_markup=category_keyboard(cats, bid))


@dp.message(F.text == ADDRESS_BUTTON)
async def address_text(message: Message, state: FSMContext) -> None:
    data = await state.get_data()
    bid = data.get("business_id")
    if not bid:
        await message.answer("Biznes tanlanmagan. /start")
        return
    row = await get_business_row(bid)
    if not row:
        await message.answer("Ma'lumot topilmadi.")
        return
    lines = [f"📍 <b>{html.escape(str(row['name']))}</b>"]
    if row.get("address"):
        lines.append(html.escape(str(row["address"])))
    if row.get("phone"):
        lines.append(f"☎️ {html.escape(str(row['phone']))}")
    if row.get("working_hours"):
        lines.append(f"🕐 {html.escape(str(row['working_hours']))}")
    if len(lines) == 1:
        lines.append("Manzil hali kiritilmagan.")
    await message.answer("\n".join(lines))


@dp.message(F.text == OPERATOR_BUTTON)
async def operator_text(message: Message, state: FSMContext) -> None:
    data = await state.get_data()
    bid = data.get("business_id")
    row = await get_business_row(bid) if bid else None
    phone = html.escape(str((row or {}).get("phone") or "telefon kiritilmagan"))
    await message.answer(
        f"Operator bilan bog‘lanish uchun telefon: <b>{phone}</b>\n\n"
        "Yoki o‘zingizning raqamingizni yuboring — qayta aloqaga chiqamiz.",
    )


# --- Restoran menyu tugmalari ---


@dp.message(F.text == R_MENU_BUTTON)
async def restaurant_menu_text(message: Message, state: FSMContext) -> None:
    data = await state.get_data()
    bid = data.get("business_id")
    if not bid:
        await message.answer("Avval restoranni tanlang — /start.")
        return
    cats = await list_categories(bid)
    if not cats:
        items = await list_items(bid, None)
        if not items:
            await message.answer("Hozircha menyu kiritilmagan.")
            return
        from botapp.category_flows.tools import format_item_short, item_inline

        btype = data.get("business_type") or Business.BusinessType.RESTAURANT
        await message.answer("📋 <b>Menyu</b>")
        for it in items[:25]:
            await message.answer(
                format_item_short(it, btype),
                reply_markup=item_inline(
                    int(bid),
                    int(it["id"]),
                    [("📄 Batafsil", "d"), ("🍔 Buyurtma", "food")],
                ),
            )
        return
    await message.answer("Bo‘limni tanlang:", reply_markup=category_keyboard(cats, bid))


@dp.message(F.text == R_PROMO_BUTTON)
async def restaurant_promo_text(message: Message, state: FSMContext) -> None:
    await message.answer(
        "🔥 <b>Aksiyalar</b>\n\nHozircha faol aksiyalar yo‘q. Tez-tez ko‘rib turing!"
    )


@dp.message(F.text == R_ADDRESS_BUTTON)
async def restaurant_address_text(message: Message, state: FSMContext) -> None:
    await address_text(message, state)


@dp.message(F.text == R_OPERATOR_BUTTON)
async def restaurant_operator_text(message: Message, state: FSMContext) -> None:
    await operator_text(message, state)


# --- Stol bron qilish wizard ---


def _strip_or_none(value: str | None) -> str:
    return (value or "").strip()


def _is_cancel(text: str | None) -> bool:
    return _strip_or_none(text).lower() in {
        CANCEL_BOOKING_BUTTON.lower(),
        "/cancel",
        "bekor",
        "bekor qilish",
    }


def _parse_phone(text: str) -> str | None:
    if not text:
        return None
    cleaned = re.sub(r"[^\d+]", "", text)
    digits = re.sub(r"\D", "", cleaned)
    if len(digits) < 9 or len(digits) > 15:
        return None
    return cleaned


def _parse_date(text: str) -> dt.date | None:
    s = _strip_or_none(text)
    if not s:
        return None
    formats = ("%Y-%m-%d", "%d.%m.%Y", "%d-%m-%Y", "%d/%m/%Y")
    for fmt in formats:
        try:
            d = dt.datetime.strptime(s, fmt).date()
            if d < dt.date.today():
                return None
            return d
        except ValueError:
            continue
    return None


def _parse_time(text: str) -> dt.time | None:
    s = _strip_or_none(text)
    if not s:
        return None
    s = s.replace(".", ":")
    formats = ("%H:%M", "%H")
    for fmt in formats:
        try:
            return dt.datetime.strptime(s, fmt).time()
        except ValueError:
            continue
    return None


@sync_to_async
def _create_table_booking(
    *,
    business_id: int,
    telegram_user_id: int,
    name: str,
    phone: str,
    guests_count: int,
    preferred_date: dt.date,
    preferred_time: dt.time,
    note: str,
):
    business = Business.objects.select_related("city").filter(pk=business_id).first()
    if not business:
        return None
    customer = (
        TelegramCustomer.objects.filter(
            city_id=business.city_id, telegram_id=str(telegram_user_id)
        ).first()
    )
    if not customer:
        customer = TelegramCustomer.objects.create(
            city_id=business.city_id, telegram_id=str(telegram_user_id)
        )
    if customer.phone != phone:
        customer.phone = phone
        customer.save(update_fields=["phone"])
    booking = Booking.objects.create(
        city_id=business.city_id,
        business_id=business.id,
        customer=customer,
        booking_type=Booking.BookingType.TABLE_BOOKING,
        name=name,
        phone=phone,
        preferred_date=preferred_date,
        preferred_time=preferred_time,
        guests_count=guests_count,
        note=note or "",
        status=Booking.Status.NEW,
    )
    return Booking.objects.select_related("business", "customer").get(pk=booking.pk)


async def _send_items_chunks(
    message: Message, items: list[dict], business_type: str, title: str
) -> None:
    header = f"📋 <b>{title}</b>\n\n"
    chunks: list[str] = []
    buf = header
    for it in items:
        block = _format_item_line(it, business_type) + "\n\n"
        if len(buf) + len(block) > 3800:
            chunks.append(buf)
            buf = block
        else:
            buf += block
    chunks.append(buf)
    for chunk in chunks:
        await message.answer(chunk)


@dp.message(F.text == R_BOOK_BUTTON)
async def book_start(message: Message, state: FSMContext) -> None:
    data = await state.get_data()
    bid = data.get("business_id")
    if not bid or data.get("business_type") != Business.BusinessType.RESTAURANT:
        await message.answer("Avval restoranni tanlang — /start.")
        return
    await state.set_state(BookFlow.name)
    await message.answer(
        "🍽 <b>Stol bron qilish</b>\n\n1/6. <b>Ismingizni kiriting:</b>",
        reply_markup=booking_cancel_keyboard(),
    )


@dp.message(BookFlow.name)
async def book_step_name(message: Message, state: FSMContext) -> None:
    if _is_cancel(message.text):
        await _book_cancel(message, state)
        return
    name = _strip_or_none(message.text)
    if not name or len(name) < 2:
        await message.answer("Ism juda qisqa. Iltimos, ismingizni qayta kiriting:")
        return
    await state.update_data(book_name=name)
    await state.set_state(BookFlow.phone)
    await message.answer(
        "2/6. <b>Telefon raqamingizni yuboring</b> (masalan +998901234567) yoki pastdagi tugmani bosing:",
        reply_markup=booking_phone_keyboard(),
    )


@dp.message(BookFlow.phone, F.contact)
async def book_step_phone_contact(message: Message, state: FSMContext) -> None:
    phone = _parse_phone(message.contact.phone_number if message.contact else "")
    if not phone:
        await message.answer("Telefon raqamini olishda xatolik. Qo‘lda kiriting:")
        return
    await _accept_phone(message, state, phone)


@dp.message(BookFlow.phone)
async def book_step_phone_text(message: Message, state: FSMContext) -> None:
    if _is_cancel(message.text):
        await _book_cancel(message, state)
        return
    phone = _parse_phone(message.text or "")
    if not phone:
        await message.answer(
            "Telefon raqami noto‘g‘ri. Iltimos, +998 bilan kiriting yoki pastdagi tugmadan foydalaning."
        )
        return
    await _accept_phone(message, state, phone)


async def _accept_phone(message: Message, state: FSMContext, phone: str) -> None:
    await state.update_data(book_phone=phone)
    await state.set_state(BookFlow.guests)
    await message.answer(
        "3/6. <b>Necha kishilik stol kerak?</b> (raqam kiriting, masalan 4)",
        reply_markup=booking_cancel_keyboard(),
    )


@dp.message(BookFlow.guests)
async def book_step_guests(message: Message, state: FSMContext) -> None:
    if _is_cancel(message.text):
        await _book_cancel(message, state)
        return
    raw = _strip_or_none(message.text)
    try:
        guests = int(raw)
    except ValueError:
        await message.answer("Iltimos, butun raqam kiriting (masalan 4):")
        return
    if guests <= 0 or guests > 50:
        await message.answer("Kishi soni 1 dan 50 gacha bo‘lishi kerak. Qayta kiriting:")
        return
    await state.update_data(book_guests=guests)
    await state.set_state(BookFlow.date)
    today = dt.date.today().strftime("%d.%m.%Y")
    await message.answer(
        f"4/6. <b>Qaysi sana?</b>\n"
        f"Format: <code>YYYY-MM-DD</code> yoki <code>DD.MM.YYYY</code> (masalan {today})",
        reply_markup=booking_cancel_keyboard(),
    )


@dp.message(BookFlow.date)
async def book_step_date(message: Message, state: FSMContext) -> None:
    if _is_cancel(message.text):
        await _book_cancel(message, state)
        return
    date_obj = _parse_date(message.text or "")
    if not date_obj:
        await message.answer(
            "Sana noto‘g‘ri yoki o‘tib ketgan. Iltimos, qayta kiriting (masalan 2026-05-08):"
        )
        return
    await state.update_data(book_date=date_obj.isoformat())
    await state.set_state(BookFlow.time)
    await message.answer(
        "5/6. <b>Qaysi vaqt?</b> Format: <code>HH:MM</code> (masalan 19:30)",
        reply_markup=booking_cancel_keyboard(),
    )


@dp.message(BookFlow.time)
async def book_step_time(message: Message, state: FSMContext) -> None:
    if _is_cancel(message.text):
        await _book_cancel(message, state)
        return
    time_obj = _parse_time(message.text or "")
    if not time_obj:
        await message.answer("Vaqt noto‘g‘ri. Iltimos, HH:MM formatida kiriting (masalan 19:30):")
        return
    await state.update_data(book_time=time_obj.strftime("%H:%M"))
    await state.set_state(BookFlow.note)
    await message.answer(
        "6/6. <b>Qo‘shimcha izoh bormi?</b>\n«—» yuboring yoki istagan matnni kiriting:",
        reply_markup=booking_cancel_keyboard(),
    )


@dp.message(BookFlow.note)
async def book_step_note(message: Message, state: FSMContext) -> None:
    if _is_cancel(message.text):
        await _book_cancel(message, state)
        return
    raw_note = _strip_or_none(message.text)
    note = "" if raw_note in {"", "-", "—", "yo‘q", "yoq"} else raw_note
    data = await state.get_data()
    bid = data.get("business_id")
    if not bid:
        await message.answer("Sessiya topilmadi. /start dan boshlang.")
        await state.clear()
        return
    try:
        booking = await _create_table_booking(
            business_id=int(bid),
            telegram_user_id=message.from_user.id,
            name=str(data.get("book_name") or ""),
            phone=str(data.get("book_phone") or ""),
            guests_count=int(data.get("book_guests") or 0),
            preferred_date=dt.date.fromisoformat(str(data.get("book_date"))),
            preferred_time=dt.datetime.strptime(str(data.get("book_time")), "%H:%M").time(),
            note=note,
        )
    except Exception:
        logger.exception("Stol bron yaratishda xatolik (telegram_user=%s)", message.from_user.id)
        await _book_finish_keyboard(message, state)
        await message.answer(
            "Kechirasiz, bron arizasini yuborishda xatolik yuz berdi. "
            "Iltimos, keyinroq urinib ko‘ring."
        )
        return
    if not booking:
        await _book_finish_keyboard(message, state)
        await message.answer("Restoran topilmadi. Iltimos, qayta urining.")
        return
    try:
        await asyncio.to_thread(notify_admin_new_booking, booking)
    except Exception:
        logger.exception("Adminga bron xabarini yuborishda xatolik (booking_id=%s)", booking.id)
    await state.set_state(Flow.browsing)
    await state.update_data(
        book_name=None, book_phone=None, book_guests=None, book_date=None, book_time=None
    )
    await _book_finish_keyboard(message, state, business_type=Business.BusinessType.RESTAURANT)
    await message.answer(
        "✅ <b>Bron arizangiz qabul qilindi!</b>\n\n"
        "Restoran admini tez orada siz bilan bog‘lanadi.\n\n"
        "Ma’lumotlar:\n"
        f"👤 Ism: {html.escape(booking.name)}\n"
        f"📞 Telefon: {html.escape(booking.phone)}\n"
        f"👥 Kishi soni: {booking.guests_count}\n"
        f"📅 Sana: {booking.preferred_date}\n"
        f"🕒 Vaqt: {booking.preferred_time.strftime('%H:%M')}"
    )


async def _book_cancel(message: Message, state: FSMContext) -> None:
    data = await state.get_data()
    await state.set_state(Flow.browsing)
    await _book_finish_keyboard(message, state, business_type=data.get("business_type"))
    await message.answer("Bron jarayoni bekor qilindi.")


async def _book_finish_keyboard(
    message: Message, state: FSMContext, business_type: str | None = None
) -> None:
    data = await state.get_data()
    btype = business_type or data.get("business_type") or ""
    await message.answer(
        "Asosiy menyu:",
        reply_markup=category_reply_keyboard(btype),
    )


# --- Admin inline callback handlerlari (booking statusini yangilash) ---


@sync_to_async
def _update_booking_status(booking_id: int, new_status: str):
    booking = (
        Booking.objects.select_related("business", "customer")
        .filter(pk=booking_id)
        .first()
    )
    if not booking:
        return None, None
    prev_status = booking.status
    if prev_status == new_status:
        return booking, prev_status
    booking.status = new_status
    booking.save(update_fields=["status"])
    return booking, prev_status


async def _handle_admin_status_callback(query: CallbackQuery, new_status: str) -> None:
    parts = (query.data or "").split(":", 1)
    if len(parts) != 2 or not parts[1].isdigit():
        await query.answer("Noto‘g‘ri so‘rov.", show_alert=True)
        return
    booking_id = int(parts[1])
    booking, prev_status = await _update_booking_status(booking_id, new_status)
    if not booking:
        await query.answer("Bron topilmadi.", show_alert=True)
        return
    chat_id = str(query.message.chat.id) if query.message else ""
    try:
        await asyncio.to_thread(notify_admin_status_change, booking, chat_id)
    except Exception:
        logger.exception("Adminga status xabarini yuborishda xatolik (booking_id=%s)", booking.id)
    if prev_status != booking.status:
        try:
            await asyncio.to_thread(notify_customer_status_change, booking, prev_status)
        except Exception:
            logger.exception(
                "Mijozga status xabarini yuborishda xatolik (booking_id=%s)", booking.id
            )
    try:
        await query.message.edit_reply_markup(reply_markup=None)
    except Exception:
        pass
    await query.answer("Yangilandi.")


@dp.callback_query(F.data.startswith("confirm_booking:"))
async def cb_confirm_booking(query: CallbackQuery) -> None:
    await _handle_admin_status_callback(query, Booking.Status.CONFIRMED)


@dp.callback_query(F.data.startswith("reject_booking:"))
async def cb_reject_booking(query: CallbackQuery) -> None:
    await _handle_admin_status_callback(query, Booking.Status.REJECTED)


@dp.callback_query(F.data.startswith("contacted_booking:"))
async def cb_contacted_booking(query: CallbackQuery) -> None:
    await _handle_admin_status_callback(query, Booking.Status.CONTACTED)


@dp.callback_query(F.data.startswith("booking_confirm:"))
async def cb_booking_confirm(query: CallbackQuery) -> None:
    await _handle_admin_status_callback(query, Booking.Status.CONFIRMED)


@dp.callback_query(F.data.startswith("booking_reject:"))
async def cb_booking_reject(query: CallbackQuery) -> None:
    await _handle_admin_status_callback(query, Booking.Status.REJECTED)


@dp.callback_query(F.data.startswith("booking_complete:"))
async def cb_booking_complete(query: CallbackQuery) -> None:
    await _handle_admin_status_callback(query, Booking.Status.COMPLETED)


@sync_to_async
def _update_lead_status(lead_id: int, new_status: str):
    lead = Lead.objects.select_related("customer").filter(pk=lead_id).first()
    if not lead:
        return None, None
    prev = lead.status
    if prev == new_status:
        return lead, prev
    lead.status = new_status
    lead.save(update_fields=["status"])
    return lead, prev


@sync_to_async
def _update_order_status(order_id: int, new_status: str):
    order = Order.objects.select_related("customer").filter(pk=order_id).first()
    if not order:
        return None, None
    prev = order.status
    if prev == new_status:
        return order, prev
    order.status = new_status
    order.save(update_fields=["status"])
    return order, prev


async def _handle_lead_callback(query: CallbackQuery, new_status: str) -> None:
    parts = (query.data or "").split(":", 1)
    if len(parts) != 2 or not parts[1].isdigit():
        await query.answer("Noto‘g‘ri so‘rov.", show_alert=True)
        return
    lead_id = int(parts[1])
    lead, prev = await _update_lead_status(lead_id, new_status)
    if not lead:
        await query.answer("Lid topilmadi.", show_alert=True)
        return
    chat_id = str(query.message.chat.id) if query.message else ""
    try:
        await asyncio.to_thread(notify_admin_lead_status_line, lead, chat_id)
    except Exception:
        logger.exception("Lead admin xabar (lead_id=%s)", lead.id)
    if prev != lead.status:
        try:
            await asyncio.to_thread(notify_customer_lead_status, lead)
        except Exception:
            logger.exception("Lead mijoz xabar (lead_id=%s)", lead.id)
    try:
        await query.message.edit_reply_markup(reply_markup=None)
    except Exception:
        pass
    await query.answer("Yangilandi.")


async def _handle_order_callback(query: CallbackQuery, new_status: str) -> None:
    parts = (query.data or "").split(":", 1)
    if len(parts) != 2 or not parts[1].isdigit():
        await query.answer("Noto‘g‘ri so‘rov.", show_alert=True)
        return
    oid = int(parts[1])
    order, prev = await _update_order_status(oid, new_status)
    if not order:
        await query.answer("Buyurtma topilmadi.", show_alert=True)
        return
    chat_id = str(query.message.chat.id) if query.message else ""
    try:
        await asyncio.to_thread(notify_admin_order_status_line, order, chat_id)
    except Exception:
        logger.exception("Order admin xabar (order_id=%s)", order.id)
    if prev != order.status:
        try:
            await asyncio.to_thread(notify_customer_order_status, order)
        except Exception:
            logger.exception("Order mijoz xabar (order_id=%s)", order.id)
    try:
        await query.message.edit_reply_markup(reply_markup=None)
    except Exception:
        pass
    await query.answer("Yangilandi.")


@dp.callback_query(F.data.startswith("lead_contacted:"))
async def cb_lead_contacted(query: CallbackQuery) -> None:
    await _handle_lead_callback(query, Lead.Status.CONTACTED)


@dp.callback_query(F.data.startswith("lead_interested:"))
async def cb_lead_interested(query: CallbackQuery) -> None:
    await _handle_lead_callback(query, Lead.Status.INTERESTED)


@dp.callback_query(F.data.startswith("lead_won:"))
async def cb_lead_won(query: CallbackQuery) -> None:
    await _handle_lead_callback(query, Lead.Status.WON)


@dp.callback_query(F.data.startswith("lead_lost:"))
async def cb_lead_lost(query: CallbackQuery) -> None:
    await _handle_lead_callback(query, Lead.Status.LOST)


@dp.callback_query(F.data.startswith("order_accept:"))
async def cb_order_accept(query: CallbackQuery) -> None:
    await _handle_order_callback(query, Order.Status.ACCEPTED)


@dp.callback_query(F.data.startswith("order_delivering:"))
async def cb_order_delivering(query: CallbackQuery) -> None:
    await _handle_order_callback(query, Order.Status.DELIVERING)


@dp.callback_query(F.data.startswith("order_complete:"))
async def cb_order_complete(query: CallbackQuery) -> None:
    await _handle_order_callback(query, Order.Status.COMPLETED)


@dp.callback_query(F.data.startswith("order_cancel:"))
async def cb_order_cancel(query: CallbackQuery) -> None:
    await _handle_order_callback(query, Order.Status.CANCELLED)


@dp.message()
async def fallback_handler(message: Message, state: FSMContext) -> None:
    data = await state.get_data()
    if data.get("business_id"):
        btype = data.get("business_type") or ""
        await message.answer(
            "Tugmalardan foydalaning.",
            reply_markup=category_reply_keyboard(btype),
        )
        return
    await message.answer(
        "Boshlash uchun /start yoki biznes turini tanlang.",
        reply_markup=business_type_keyboard(),
    )


async def run() -> None:
    token = (os.getenv("TELEGRAM_BOT_TOKEN") or "").strip()
    if not token:
        raise RuntimeError("TELEGRAM_BOT_TOKEN .env faylida yo‘q.")
    bot = Bot(token=token, default=DefaultBotProperties(parse_mode=ParseMode.HTML))
    await dp.start_polling(bot)


if __name__ == "__main__":
    asyncio.run(run())
