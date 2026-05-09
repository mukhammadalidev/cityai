"""Bot uchun umumiy yordamchilar (import tsiklini oldini olish)."""

from __future__ import annotations

import datetime as dt
import re

CANCEL_BOOKING_BUTTON = "❌ Bekor qilish"
SHARE_PHONE_BUTTON = "📱 Raqamni yuborish"


def strip_or_none(value: str | None) -> str:
    return (value or "").strip()


def is_cancel(text: str | None) -> bool:
    s = strip_or_none(text).lower()
    return s in {
        CANCEL_BOOKING_BUTTON.lower(),
        "/cancel",
        "bekor",
        "bekor qilish",
    }


def parse_phone(text: str) -> str | None:
    if not text:
        return None
    cleaned = re.sub(r"[^\d+]", "", text)
    digits = re.sub(r"\D", "", cleaned)
    if len(digits) < 9 or len(digits) > 15:
        return None
    return cleaned


def parse_date(text: str) -> dt.date | None:
    s = strip_or_none(text)
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


def parse_time(text: str) -> dt.time | None:
    s = strip_or_none(text)
    if not s:
        return None
    s = s.replace(".", ":")
    for fmt in ("%H:%M", "%H"):
        try:
            return dt.datetime.strptime(s, fmt).time()
        except ValueError:
            continue
    return None
