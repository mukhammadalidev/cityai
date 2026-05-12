"""Telegram: yangi lid va holat o‘zgarishi."""

from __future__ import annotations

import json
import logging
import os
from typing import Optional
from urllib import error as urllib_error
from urllib import parse as urllib_parse
from urllib import request as urllib_request

from .models import Lead

logger = logging.getLogger(__name__)

STATUS_LABEL_UZ = {
    Lead.Status.NEW: "Yangi",
    Lead.Status.CONTACTED: "Bog‘lanildi",
    Lead.Status.INTERESTED: "Qiziqmoqda",
    Lead.Status.WON: "Yakunlandi (g‘alaba)",
    Lead.Status.LOST: "Bekor",
}


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
            if resp.status >= 300:
                return False
            return True
    except urllib_error.URLError as exc:
        logger.warning("Telegram: %s", exc)
        return False


def _admin_lead_keyboard(lead_id: int) -> dict:
    return {
        "inline_keyboard": [
            [
                {"text": "☎️ Bog‘lanildi", "callback_data": f"lead_contacted:{lead_id}"},
                {"text": "🔥 Qiziqmoqda", "callback_data": f"lead_interested:{lead_id}"},
            ],
            [
                {"text": "✅ Yakunlandi", "callback_data": f"lead_won:{lead_id}"},
                {"text": "❌ Bekor", "callback_data": f"lead_lost:{lead_id}"},
            ],
        ]
    }


def _format_new_lead(lead: Lead) -> str:
    meta = lead.metadata if isinstance(lead.metadata, dict) else {}
    bname = lead.business.name if lead.business_id else "—"
    item_t = lead.item.title if lead.item_id and lead.item else "—"
    msg = lead.message or "—"
    lt = lead.lead_type
    if lt == Lead.LeadType.CREDIT:
        return (
            "💳 <b>Yangi kredit so‘rovi!</b>\n\n"
            f"🏢 Avtosalon: {bname}\n"
            f"👤 Ism: {lead.name}\n"
            f"📞 Telefon: {lead.phone}\n"
            f"🚘 Mashina: {item_t}\n"
            f"💵 Boshlang‘ich to‘lov: {meta.get('initial_payment', '—')}\n"
            f"📆 Muddat: {meta.get('credit_months', '—')}\n"
            f"📝 Izoh: {msg}\n"
        )
    if lt == Lead.LeadType.TRADE_IN:
        return (
            "🔁 <b>Yangi trade-in arizasi!</b>\n\n"
            f"🏢: {bname}\n"
            f"👤 Ism: {lead.name}\n"
            f"📞 Telefon: {lead.phone}\n"
            f"🚘 Mashina: {meta.get('car_brand', '')} {meta.get('car_model', '')}\n"
            f"📅 Yili: {meta.get('car_year', '—')}\n"
            f"📊 Probeg: {meta.get('mileage', '—')}\n"
            f"💰 Kutilayotgan narx: {meta.get('expected_price', '—')}\n"
            f"📝 Izoh: {msg}\n"
        )
    if lt == Lead.LeadType.COURSE_REGISTER:
        return (
            "📚 <b>Yangi kursga yozilish arizasi!</b>\n\n"
            f"🏢 Markaz: {bname}\n"
            f"👤 Ism: {lead.name}\n"
            f"📞 Telefon: {lead.phone}\n"
            f"📚 Kurs: {item_t}\n"
            f"🕒 Qulay vaqt: {meta.get('preferred_time', '—')}\n"
            f"📝 Izoh: {msg}\n"
        )
    if lt == Lead.LeadType.PROPERTY_INTEREST:
        return (
            "🏠 <b>Yangi uy bo‘yicha so‘rov!</b>\n\n"
            f"🏢 Agentlik: {bname}\n"
            f"👤 Ism: {lead.name}\n"
            f"📞 Telefon: {lead.phone}\n"
            f"🏠 Uy: {item_t}\n"
            f"💬 Xabar: {msg}\n"
            f"🕒 Aloqa vaqti: {meta.get('preferred_contact_time', '—')}\n"
        )
    if lt == Lead.LeadType.MEMBERSHIP_REQUEST:
        return (
            "💪 <b>Yangi abonement arizasi!</b>\n\n"
            f"🏢 Fitness zal: {bname}\n"
            f"👤 Ism: {lead.name}\n"
            f"📞 Telefon: {lead.phone}\n"
            f"🏋️ Abonement: {item_t}\n"
            f"📅 Boshlash sanasi: {meta.get('preferred_start_date', '—')}\n"
            f"🕒 Qulay vaqt: {meta.get('preferred_time', '—')}\n"
            f"📝 Izoh: {msg}\n"
        )
    return (
        "📩 <b>Yangi lid</b>\n\n"
        f"🏢: {bname}\n"
        f"📋 Tur: {lt}\n"
        f"👤 Ism: {lead.name}\n"
        f"📞 Telefon: {lead.phone}\n"
        f"📝 Xabar: {msg}\n"
    )


def notify_admin_new_lead(lead: Lead) -> bool:
    chat_id = (lead.business.telegram_admin_chat_id or "").strip() if lead.business_id else ""
    if not chat_id:
        logger.warning("Lead admin chat_id bo‘sh (lead_id=%s)", lead.id)
        return False
    return _send_telegram(chat_id, _format_new_lead(lead), _admin_lead_keyboard(lead.id))


def notify_customer_lead_status(lead: Lead) -> bool:
    if not lead.customer or not lead.customer.telegram_id:
        return False
    if lead.status == Lead.Status.CONTACTED:
        text = "☎️ So‘rovingiz qabul qilindi. Tez orada bog‘lanamiz."
    elif lead.status == Lead.Status.INTERESTED:
        text = "🔥 So‘rovingiz qayta ishlanmoqda."
    elif lead.status == Lead.Status.WON:
        text = "✅ Rahmat! Jarayon yakunlandi."
    elif lead.status == Lead.Status.LOST:
        text = "ℹ️ So‘rovingiz yopildi."
    else:
        return False
    return _send_telegram(lead.customer.telegram_id, text)


def notify_admin_lead_status_line(lead: Lead, admin_chat_id: str) -> bool:
    label = STATUS_LABEL_UZ.get(lead.status, lead.status)
    return _send_telegram(admin_chat_id, f"ℹ️ Lid holati: <b>{label}</b>.")
