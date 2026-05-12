"""Telegram orqali biznes admin va mijozga bron haqida xabarlar."""

from __future__ import annotations

import json
import logging
import os
from typing import Optional
from urllib import error as urllib_error
from urllib import parse as urllib_parse
from urllib import request as urllib_request

from .models import Booking

logger = logging.getLogger(__name__)

STATUS_LABEL_UZ = {
    Booking.Status.NEW: "Yangi",
    Booking.Status.CONFIRMED: "Tasdiqlandi",
    Booking.Status.REJECTED: "Rad etildi",
    Booking.Status.COMPLETED: "Bajarildi",
    Booking.Status.CANCELLED: "Bekor qilindi",
    Booking.Status.CONTACTED: "Bog‘lanildi",
}

BOOKING_TYPE_LABEL_UZ = {
    Booking.BookingType.APPOINTMENT: "Navbat / uchrashuv",
    Booking.BookingType.TEST_DRIVE: "Test drive",
    Booking.BookingType.TRIAL_LESSON: "Sinov darsi",
    Booking.BookingType.TABLE_BOOKING: "Stol bron",
    Booking.BookingType.SERVICE_BOOKING: "Xizmat buyurtmasi",
    Booking.BookingType.CONSULTATION: "Konsultatsiya",
}


def _bot_token() -> str:
    return (os.getenv("TELEGRAM_BOT_TOKEN") or "").strip()


def _send_telegram(chat_id: str, text: str, reply_markup: Optional[dict] = None) -> bool:
    token = _bot_token()
    if not token:
        logger.warning("TELEGRAM_BOT_TOKEN topilmadi, xabar yuborilmadi.")
        return False
    if not chat_id:
        return False
    payload = {
        "chat_id": str(chat_id),
        "text": text,
        "parse_mode": "HTML",
        "disable_web_page_preview": True,
    }
    if reply_markup is not None:
        payload["reply_markup"] = json.dumps(reply_markup, ensure_ascii=False)
    url = f"https://api.telegram.org/bot{token}/sendMessage"
    data = urllib_parse.urlencode(payload).encode("utf-8")
    req = urllib_request.Request(url, data=data)
    try:
        with urllib_request.urlopen(req, timeout=10) as resp:
            body = resp.read().decode("utf-8", errors="ignore")
            if resp.status >= 300:
                logger.warning("Telegram javobi %s: %s", resp.status, body)
                return False
            return True
    except urllib_error.URLError as exc:
        logger.warning("Telegram so‘rovi muvaffaqiyatsiz: %s", exc)
        return False


def _admin_booking_keyboard(booking_id: int, booking: Booking) -> dict:
    rows = [
        [
            {"text": "✅ Tasdiqlash", "callback_data": f"booking_confirm:{booking_id}"},
            {"text": "❌ Rad etish", "callback_data": f"booking_reject:{booking_id}"},
        ],
    ]
    if booking.booking_type == Booking.BookingType.TABLE_BOOKING:
        rows.append(
            [
                {"text": "☎️ Bog‘lanildi", "callback_data": f"contacted_booking:{booking_id}"},
                {"text": "✅ Bajarildi", "callback_data": f"booking_complete:{booking_id}"},
            ]
        )
    else:
        rows.append([{"text": "✅ Bajarildi", "callback_data": f"booking_complete:{booking_id}"}])
    return {"inline_keyboard": rows}


def _item_title(booking: Booking) -> str:
    if booking.item_id and booking.item:
        return booking.item.title
    return "—"


def _format_admin_new_booking(booking: Booking) -> str:
    meta = booking.metadata if isinstance(booking.metadata, dict) else {}
    note = booking.note or "—"
    bname = booking.business.name if booking.business_id else "—"
    base = (
        f"👤 Ism: {booking.name}\n"
        f"📞 Telefon: {booking.phone}\n"
        f"📅 Sana: {booking.preferred_date}\n"
        f"🕒 Vaqt: {booking.preferred_time}\n"
        f"📝 Izoh: {note}\n"
    )
    bt = booking.booking_type
    if bt == Booking.BookingType.TABLE_BOOKING:
        return (
            "🍽 <b>Yangi stol bron arizasi!</b>\n\n"
            f"🏢 Restoran: {bname}\n"
            f"{base}"
            f"👥 Kishi soni: {booking.guests_count or '—'}\n"
        )
    if bt == Booking.BookingType.TEST_DRIVE:
        return (
            "🧪 <b>Yangi test drive arizasi!</b>\n\n"
            f"🏢 Avtosalon: {bname}\n"
            f"{base}"
            f"🚘 Mashina: {_item_title(booking)}\n"
        )
    if bt == Booking.BookingType.TRIAL_LESSON:
        if meta.get("source") == "fitness_trial":
            return (
                "🏋️ <b>Yangi sinov mashg‘ulot arizasi!</b>\n\n"
                f"🏢 Fitness zal: {bname}\n"
                f"{base}"
                f"🏋️ Yo‘nalish: {meta.get('training_type', '—')}\n"
            )
        return (
            "🧪 <b>Yangi sinov dars arizasi!</b>\n\n"
            f"🏢 Markaz: {bname}\n"
            f"{base}"
            f"📚 Kurs: {_item_title(booking)}\n"
        )
    if bt == Booking.BookingType.CONSULTATION:
        topic = meta.get("legal_topic") or "—"
        if meta.get("legal_topic"):
            return (
                "⚖️ <b>Yangi yuridik konsultatsiya arizasi!</b>\n\n"
                f"🏢: {bname}\n"
                f"{base}"
                f"⚖️ Mavzu: {topic}\n"
                f"📋 Xizmat: {_item_title(booking)}\n"
            )
        return (
            "🏥 <b>Yangi qabul arizasi!</b>\n\n"
            f"🏢: {bname}\n"
            f"{base}"
            f"👨‍⚕️ Xizmat: {_item_title(booking)}\n"
        )
    if bt == Booking.BookingType.SERVICE_BOOKING:
        st = meta.get("service_type") or ""
        if st == "taxi":
            return (
                "🚕 <b>Yangi taxi so‘rovi!</b>\n\n"
                f"{base}"
                f"📍 Qayerdan: {meta.get('from_address', '—')}\n"
                f"📍 Qayerga: {meta.get('to_address', '—')}\n"
            )
        if st == "delivery":
            return (
                "📦 <b>Yangi yetkazib berish arizasi!</b>\n\n"
                f"🏢: {bname}\n"
                f"{base}"
                f"📍 Olib ketish: {meta.get('pickup_address', '—')}\n"
                f"📍 Yetkazish: {meta.get('delivery_address', '—')}\n"
                f"📦 Izoh: {meta.get('package_note', '—')}\n"
            )
        return (
            "🛠 <b>Yangi xizmat buyurtmasi!</b>\n\n"
            f"🏢: {bname}\n"
            f"{base}"
            f"🛠 Xizmat: {_item_title(booking)}\n"
            f"📍 Manzil: {meta.get('address', '—')}\n"
            f"🔧 Muammo: {meta.get('problem_description', '—')}\n"
        )
    if bt == Booking.BookingType.APPOINTMENT:
        return (
            "💇 <b>Yangi navbat / uchrashuv arizasi!</b>\n\n"
            f"🏢: {bname}\n"
            f"{base}"
            f"💇 Xizmat: {_item_title(booking)}\n"
            f"👩‍🎨 Usta: {meta.get('master_name', '—')}\n"
        )
    label = BOOKING_TYPE_LABEL_UZ.get(bt, bt)
    return (
        f"📋 <b>Yangi bron ({label})</b>\n\n"
        f"🏢: {bname}\n"
        f"{base}"
        f"Pozitsiya: {_item_title(booking)}\n"
    )


def notify_admin_new_booking(booking: Booking) -> bool:
    chat_id = (booking.business.telegram_admin_chat_id or "").strip() if booking.business_id else ""
    if not chat_id:
        logger.warning(
            "telegram_admin_chat_id bo‘sh (booking_id=%s, business_id=%s)",
            booking.id,
            booking.business_id,
        )
        return False
    return _send_telegram(chat_id, _format_admin_new_booking(booking), _admin_booking_keyboard(booking.id, booking))


def notify_customer_status_change(booking: Booking, prev_status: str) -> bool:
    if not booking.customer or not booking.customer.telegram_id:
        return False
    btype_uz = BOOKING_TYPE_LABEL_UZ.get(booking.booking_type, "Bron")
    if booking.status == Booking.Status.CONFIRMED:
        text = (
            f"✅ <b>{btype_uz} tasdiqlandi!</b>\n\n"
            f"📅 Sana: {booking.preferred_date}\n"
            f"🕒 Vaqt: {booking.preferred_time}\n"
        )
        if booking.booking_type == Booking.BookingType.TABLE_BOOKING:
            text += f"👥 Kishi soni: {booking.guests_count or '—'}"
    elif booking.status == Booking.Status.REJECTED:
        text = f"❌ <b>{btype_uz} rad etildi.</b>\n\nOperator bilan bog‘lanishingiz mumkin."
    elif booking.status == Booking.Status.CANCELLED:
        text = f"ℹ️ {btype_uz} bekor qilindi."
    elif booking.status == Booking.Status.COMPLETED:
        text = f"🎉 <b>{btype_uz} yakunlandi.</b> Rahmat!"
    elif booking.status == Booking.Status.CONTACTED:
        text = f"☎️ {btype_uz} bo‘yicha operator siz bilan bog‘lanadi."
    else:
        return False
    return _send_telegram(booking.customer.telegram_id, text)


def notify_admin_status_change(booking: Booking, admin_chat_id: str) -> bool:
    label = STATUS_LABEL_UZ.get(booking.status, booking.status)
    if booking.status == Booking.Status.CONFIRMED:
        text = "✅ Bron tasdiqlandi."
    elif booking.status == Booking.Status.REJECTED:
        text = "❌ Bron rad etildi."
    elif booking.status == Booking.Status.CONTACTED:
        text = "☎️ Mijoz bilan bog‘lanildi."
    elif booking.status == Booking.Status.COMPLETED:
        text = "✅ Bron bajarildi."
    else:
        text = f"ℹ️ Bron holati: {label}."
    return _send_telegram(admin_chat_id, text)
