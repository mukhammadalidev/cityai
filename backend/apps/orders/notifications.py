"""Telegram: buyurtma bildirishnomalari."""

from __future__ import annotations

import json
import logging
import os
from typing import Optional
from urllib import error as urllib_error
from urllib import parse as urllib_parse
from urllib import request as urllib_request

from .models import Order

logger = logging.getLogger(__name__)


def _bot_token() -> str:
    return (os.getenv("TELEGRAM_BOT_TOKEN") or "").strip()


def _send_telegram(chat_id: str, text: str, reply_markup: Optional[dict] = None) -> bool:
    token = _bot_token()
    if not token or not chat_id:
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
            return resp.status < 300
    except urllib_error.URLError as exc:
        logger.warning("Telegram: %s", exc)
        return False


def _admin_order_keyboard(order_id: int) -> dict:
    return {
        "inline_keyboard": [
            [
                {"text": "✅ Qabul qilish", "callback_data": f"order_accept:{order_id}"},
                {"text": "🚚 Yetkazilmoqda", "callback_data": f"order_delivering:{order_id}"},
            ],
            [
                {"text": "✅ Bajarildi", "callback_data": f"order_complete:{order_id}"},
                {"text": "❌ Bekor qilish", "callback_data": f"order_cancel:{order_id}"},
            ],
        ]
    }


def _format_new_order(order: Order) -> str:
    meta = order.metadata if isinstance(order.metadata, dict) else {}
    bname = order.business.name if order.business_id else "—"
    lines = order.lines.all() if hasattr(order, "lines") else []
    parts = []
    for line in lines:
        try:
            parts.append(f"· {line.item.title} × {line.quantity}")
        except Exception:
            parts.append(f"· #{line.item_id} × {line.quantity}")
    lines_txt = "\n".join(parts) if parts else "—"
    kind = meta.get("order_kind", "shop")
    header = "🛒 <b>Yangi buyurtma!</b>"
    if kind == "food":
        header = "🍔 <b>Yangi taom buyurtmasi!</b>"
    return (
        f"{header}\n\n"
        f"🏢: {bname}\n"
        f"👤 Ism: {order.name}\n"
        f"📞 Telefon: {order.phone}\n"
        f"{lines_txt}\n"
        f"💰 Jami: {order.total_amount}\n"
        f"📍 Manzil: {order.address or '—'}\n"
        f"🚚 Turi: {meta.get('delivery_type', '—')}\n"
        f"📝 Izoh: {order.note or '—'}\n"
    )


def notify_admin_new_order(order: Order) -> bool:
    chat_id = (order.business.telegram_admin_chat_id or "").strip() if order.business_id else ""
    if not chat_id:
        logger.warning("Order admin chat_id bo‘sh (order_id=%s)", order.id)
        return False
    return _send_telegram(chat_id, _format_new_order(order), _admin_order_keyboard(order.id))


def notify_customer_order_status(order: Order) -> bool:
    if not order.customer or not order.customer.telegram_id:
        return False
    if order.status == Order.Status.ACCEPTED:
        text = "✅ Buyurtmangiz qabul qilindi."
    elif order.status == Order.Status.DELIVERING:
        text = "🚚 Buyurtmangiz yo‘lda."
    elif order.status == Order.Status.COMPLETED:
        text = "🎉 Buyurtma yakunlandi. Rahmat!"
    elif order.status == Order.Status.CANCELLED:
        text = "❌ Buyurtma bekor qilindi."
    else:
        return False
    return _send_telegram(order.customer.telegram_id, text)


def notify_admin_order_status_line(order: Order, admin_chat_id: str) -> bool:
    labels = {
        Order.Status.NEW: "Yangi",
        Order.Status.ACCEPTED: "Qabul qilindi",
        Order.Status.PREPARING: "Tayyorlanmoqda",
        Order.Status.DELIVERING: "Yetkazilmoqda",
        Order.Status.COMPLETED: "Yakunlandi",
        Order.Status.CANCELLED: "Bekor",
    }
    label = labels.get(order.status, order.status)
    return _send_telegram(admin_chat_id, f"ℹ️ Buyurtma holati: <b>{label}</b>.")
