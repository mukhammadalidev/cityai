"""Ota-onaga davomat bo‘yicha Telegram xabarlari."""

from __future__ import annotations

import html
import logging
import os
from typing import Optional
from urllib import error as urllib_error
from urllib import parse as urllib_parse
from urllib import request as urllib_request

from apps.accounts.models import User

from .models import StudentAttendance

logger = logging.getLogger(__name__)


def _bot_token() -> str:
    return (os.getenv("TELEGRAM_BOT_TOKEN") or "").strip()


def _send_telegram(chat_id: str, text: str) -> bool:
    token = _bot_token()
    if not token or not chat_id:
        return False
    payload = {
        "chat_id": str(chat_id).strip(),
        "text": text,
        "parse_mode": "HTML",
        "disable_web_page_preview": True,
    }
    url = f"https://api.telegram.org/bot{token}/sendMessage"
    data = urllib_parse.urlencode(payload).encode("utf-8")
    req = urllib_request.Request(url, data=data)
    try:
        with urllib_request.urlopen(req, timeout=10) as resp:
            return resp.status < 300
    except urllib_error.URLError as exc:
        logger.warning("Telegram yuborishda xato (chat_id=%s): %s", chat_id, exc)
        return False


STATUS_INTRO_UZ = {
    StudentAttendance.Status.PRESENT: ("✅", "darsga <b>keldi</b>"),
    StudentAttendance.Status.LATE: ("⏰", "darsga <b>kechikib keldi</b>"),
    StudentAttendance.Status.ABSENT: ("❌", "bugun darsga <b>kelmadi</b>"),
    StudentAttendance.Status.EXCUSED: ("📋", "<b>sababli</b> qoldirildi (kelmadi)"),
}


def _format_attendance_message(record: StudentAttendance) -> str:
    st = record.student
    biz = st.business
    biz_name = html.escape(biz.name or "O‘quv markaz")
    raw_name = (st.name or "").strip()
    parts = raw_name.split(None, 1)
    if len(parts) >= 2:
        child_name = f"<b>{html.escape(parts[0])}</b> <b>{html.escape(parts[1])}</b>"
    else:
        child_name = f"<b>{html.escape(raw_name or 'O‘quvchi')}</b>"
    d_str = record.date.strftime("%d.%m.%Y")
    emoji, line = STATUS_INTRO_UZ.get(record.status, ("ℹ️", f"holat: <code>{html.escape(record.status)}</code>"))
    note = (record.note or "").strip()
    note_html = f"\n\n📝 <i>{html.escape(note)}</i>" if note else ""

    return (
        f"{emoji} <b>Davomat</b>\n\n"
        f"🏫 {biz_name}\n"
        f"👤 Farzandingiz: {child_name}\n"
        f"📅 Sana: <b>{d_str}</b>\n\n"
        f"Holat: {line}.{note_html}"
    )


def notify_parents_student_attendance(
    record: StudentAttendance,
    previous_status: Optional[str] = None,
) -> int:
    """
    Ota-ona kabineti (EDU_PARENT) va telegram_id bo‘lgan foydalanuvchilarga xabar.
    previous_status avvalgi holat; yangi yozuvda None. Holat o‘zgarmagan bo‘lsa yuborilmaydi.
    """
    if previous_status is not None and previous_status == record.status:
        return 0

    parents = User.objects.filter(
        portal_parent_id=record.student_id,
        role=User.Role.EDU_PARENT,
        is_active=True,
    ).exclude(telegram_id__exact="")

    if not parents.exists():
        return 0

    text = _format_attendance_message(record)
    sent = 0
    for user in parents:
        tid = (user.telegram_id or "").strip()
        if not tid:
            continue
        if _send_telegram(tid, text):
            sent += 1
    return sent
