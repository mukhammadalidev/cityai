"""Fitness CRM Telegram eslatmalari (Uzbek)."""

from __future__ import annotations

import logging
import os
from decimal import Decimal

import requests
from django.conf import settings

logger = logging.getLogger(__name__)


def _bot_token() -> str:
    return os.getenv("TELEGRAM_BOT_TOKEN", "") or getattr(settings, "TELEGRAM_BOT_TOKEN", "") or ""


def _admin_chat_ids(business) -> list[str]:
    ids: list[str] = []
    owner = getattr(business, "owner", None)
    if owner and getattr(owner, "telegram_chat_id", None):
        ids.append(str(owner.telegram_chat_id))
    meta = business.metadata or {}
    for cid in meta.get("admin_telegram_chat_ids") or meta.get("notify_chat_ids") or []:
        ids.append(str(cid))
    extra = os.getenv("FITNESS_ADMIN_CHAT_IDS", "")
    if extra:
        ids.extend(x.strip() for x in extra.split(",") if x.strip())
    return list(dict.fromkeys(ids))


def send_telegram_message(chat_id: str, text: str) -> bool:
    token = _bot_token()
    if not token or not chat_id:
        return False
    try:
        r = requests.post(
            f"https://api.telegram.org/bot{token}/sendMessage",
            json={"chat_id": chat_id, "text": text},
            timeout=12,
        )
        return r.ok
    except Exception:
        logger.exception("Telegram xabar yuborilmadi")
        return False


def notify_fitness_admins(business, text: str) -> None:
    for chat_id in _admin_chat_ids(business):
        send_telegram_message(chat_id, text)


def notify_member_created(client) -> None:
    biz = client.business
    text = (
        f"🆕 Yangi a'zo qo'shildi\n"
        f"Zal: {biz.name}\n"
        f"Ism: {client.full_name}\n"
        f"Telefon: {client.phone or '—'}\n"
        f"Holat: {client.get_status_display()}"
    )
    notify_fitness_admins(biz, text)


def notify_payment_received(payment) -> None:
    m = payment.membership
    title = m.display_title if m else "—"
    text = (
        f"✅ To'lov qabul qilindi\n"
        f"A'zo: {payment.client.full_name}\n"
        f"Abonement: {title}\n"
        f"Summa: {payment.amount:,.0f} {payment.currency}\n"
        f"Usul: {payment.get_method_display()}\n"
        f"Sana: {payment.payment_date}"
    )
    notify_fitness_admins(payment.business, text)
    chat_id = (payment.client.metadata or {}).get("telegram_chat_id")
    if chat_id:
        send_telegram_message(
            str(chat_id),
            f"✅ To'lovingiz qabul qilindi: {payment.amount:,.0f} {payment.currency}. Rahmat!",
        )


def notify_membership_expiring_soon(membership, days_left: int) -> None:
    text = (
        f"⏳ Abonement tugashiga {days_left} kun qoldi\n"
        f"A'zo: {membership.client.full_name}\n"
        f"Abonement: {membership.display_title}\n"
        f"Tugash: {membership.end_date}"
    )
    notify_fitness_admins(membership.business, text)


def notify_debtor_reminder(membership) -> None:
    debt = membership.debt_amount or Decimal("0")
    if debt <= 0:
        return
    text = (
        f"⚠️ Qarzdor eslatma\n"
        f"A'zo: {membership.client.full_name}\n"
        f"Telefon: {membership.client.phone or '—'}\n"
        f"Qarz: {debt:,.0f} {membership.currency}\n"
        f"Abonement: {membership.display_title}"
    )
    notify_fitness_admins(membership.business, text)
