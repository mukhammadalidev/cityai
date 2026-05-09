from __future__ import annotations

import asyncio
import datetime as dt
import html
import logging
from typing import Any

from aiogram.fsm.context import FSMContext
from aiogram.types import (
    InlineKeyboardButton,
    InlineKeyboardMarkup,
    KeyboardButton,
    Message,
    ReplyKeyboardMarkup,
)
from asgiref.sync import sync_to_async

from apps.bookings.models import Booking
from apps.bookings.notifications import notify_admin_new_booking
from apps.businesses.models import Business
from apps.leads.models import Lead
from apps.leads.notifications import notify_admin_new_lead
from apps.orders.models import Order
from apps.orders.notifications import notify_admin_new_order

from botapp.bot_states import Flow
from botapp.category_flows.keyboards import category_reply_keyboard
from botapp.repository import fetch_items_for_business, get_business_contact_row, get_item_row
from botapp.telegram_utils import (
    CANCEL_BOOKING_BUTTON,
    SHARE_PHONE_BUTTON,
    is_cancel,
    parse_date,
    parse_phone,
    parse_time,
    strip_or_none,
)

logger = logging.getLogger(__name__)


def cancel_kb() -> ReplyKeyboardMarkup:
    return ReplyKeyboardMarkup(
        keyboard=[[KeyboardButton(text=CANCEL_BOOKING_BUTTON)]],
        resize_keyboard=True,
    )


def phone_kb() -> ReplyKeyboardMarkup:
    return ReplyKeyboardMarkup(
        keyboard=[
            [KeyboardButton(text=SHARE_PHONE_BUTTON, request_contact=True)],
            [KeyboardButton(text=CANCEL_BOOKING_BUTTON)],
        ],
        resize_keyboard=True,
        one_time_keyboard=True,
    )


def format_item_short(it: dict, btype: str) -> str:
    title = html.escape(str(it.get("title") or ""))
    price = it.get("price")
    cur = it.get("currency") or "UZS"
    p = int(price) if price is not None else 0
    price_s = f"{p:,}".replace(",", " ") + f" {cur}"
    meta = it.get("metadata") or {}
    extra = ""
    if isinstance(meta, dict):
        if btype == Business.BusinessType.AUTO_SALON:
            bits = [meta.get("year"), meta.get("mileage"), meta.get("fuel_type")]
            extra = " ".join(str(x) for x in bits if x)
        elif btype == Business.BusinessType.EDUCATION_CENTER:
            extra = str(meta.get("teacher") or meta.get("duration") or "")
    suf = f"\n   <i>{html.escape(extra)}</i>" if extra else ""
    return f"▫️ <b>{title}</b> — {price_s}{suf}"


def item_inline(business_id: int, item_id: int, actions: list[tuple[str, str]]) -> InlineKeyboardMarkup:
    row = [InlineKeyboardButton(text=t, callback_data=f"i:{business_id}:{item_id}:{cb}") for t, cb in actions]
    return InlineKeyboardMarkup(inline_keyboard=[row])


async def send_item_catalog(message: Message, state: FSMContext, btype: str, title: str) -> None:
    data = await state.get_data()
    bid = data.get("business_id")
    if not bid:
        return
    items = await sync_to_async(fetch_items_for_business, thread_sensitive=True)(int(bid), None)
    if not items:
        await message.answer("Hozircha ro‘yxat bo‘sh.")
        return
    for it in items[:25]:
        text = format_item_short(it, btype)
        iid = int(it["id"])
        actions: list[tuple[str, str]] = [("📄 Batafsil", "d")]
        if btype == Business.BusinessType.AUTO_SALON:
            actions += [("💳 Kredit", "cr"), ("🧪 Test drive", "td"), ("☎️ Bog‘lanish", "lc")]
        elif btype == Business.BusinessType.EDUCATION_CENTER:
            actions += [("📝 Yozilish", "reg"), ("🧪 Sinov", "trl")]
        elif btype == Business.BusinessType.SHOP:
            actions += [("🛒 Buyurtma", "ord")]
        elif btype == Business.BusinessType.RESTAURANT:
            actions += [("🍔 Buyurtma", "food")]
        elif btype == Business.BusinessType.CLINIC:
            actions += [("📅 Qabul", "cc")]
        elif btype == Business.BusinessType.BEAUTY_SALON:
            actions += [("📅 Navbat", "ap")]
        elif btype == Business.BusinessType.REPAIR_SERVICE:
            actions += [("📅 Buyurtma", "sb")]
        elif btype == Business.BusinessType.REAL_ESTATE:
            actions += [("☎️ So‘rov", "pi"), ("📅 Ko‘rish", "rv")]
        elif btype == Business.BusinessType.LEGAL_SERVICE:
            actions += [("📅 Konsultatsiya", "lg")]
        elif btype == Business.BusinessType.PHOTO_VIDEO:
            actions += [("📅 Buyurtma", "ph")]
        else:
            actions += [("☎️ Bog‘lanish", "lc")]
        await message.answer(text, reply_markup=item_inline(int(bid), iid, actions))
    await message.answer(f"✅ {title} — tugmalardan foydalaning.")


async def answer_address(message: Message, business_id: int) -> None:
    row = await sync_to_async(get_business_contact_row, thread_sensitive=True)(business_id)
    if not row:
        await message.answer("Ma’lumot topilmadi.")
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


async def answer_operator(message: Message, business_id: int) -> None:
    row = await sync_to_async(get_business_contact_row, thread_sensitive=True)(business_id)
    phone = html.escape(str((row or {}).get("phone") or "telefon kiritilmagan"))
    await message.answer(
        f"Operator bilan bog‘lanish: <b>{phone}</b>\n\n"
        "Yoki o‘zingizning raqamingizni yuboring — qayta aloqaga chiqamiz.",
    )


async def flow_cancel(message: Message, state: FSMContext) -> bool:
    if not is_cancel(message.text):
        return False
    data = await state.get_data()
    await state.set_state(Flow.browsing)
    await message.answer(
        "Bekor qilindi.",
        reply_markup=category_reply_keyboard(data.get("business_type") or ""),
    )
    return True


async def need_business(message: Message, state: FSMContext) -> dict[str, Any] | None:
    data = await state.get_data()
    if not data.get("business_id"):
        await message.answer("Avval biznesni tanlang — /start")
        return None
    return data


async def notify_lead_saved(lead: Lead | None) -> None:
    if not lead:
        return
    try:
        full = await sync_to_async(
            lambda: Lead.objects.select_related("business", "item").get(pk=lead.pk),
            thread_sensitive=True,
        )()
        await asyncio.to_thread(notify_admin_new_lead, full)
    except Exception:
        logger.exception("notify lead")


async def notify_booking_saved(booking: Booking | None) -> None:
    if not booking:
        return
    try:
        b = await sync_to_async(
            Booking.objects.select_related("business", "customer", "item").get,
            thread_sensitive=True,
        )(pk=booking.pk)
        await asyncio.to_thread(notify_admin_new_booking, b)
    except Exception:
        logger.exception("notify booking")


async def notify_order_saved(order: Order | None) -> None:
    if not order:
        return
    try:
        o = await sync_to_async(
            lambda: Order.objects.prefetch_related("lines__item").select_related("business").get(pk=order.pk),
            thread_sensitive=True,
        )()
        await asyncio.to_thread(notify_admin_new_order, o)
    except Exception:
        logger.exception("notify order")


def parse_date_loose(text: str) -> dt.date | None:
    """O‘tgan sanalarni ham qabul qilish (taxi / eski reja)."""
    s = strip_or_none(text)
    if not s:
        return None
    for fmt in ("%Y-%m-%d", "%d.%m.%Y", "%d-%m-%Y", "%d/%m/%Y"):
        try:
            return dt.datetime.strptime(s, fmt).date()
        except ValueError:
            continue
    return None
