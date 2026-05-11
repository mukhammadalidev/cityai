"""O‘quvchi abonement (to‘lov muddati) — portal va CRM uchun bir xil ma’lumot."""
from __future__ import annotations

from datetime import date


def tuition_payment_summary_for_student(student) -> dict:
    """
    tuition_paid_until: shu sanadan oldin yoki shu kunda to‘langan hisoblanadi (kun oxirigacha emas — sana bo‘yicha).
    None bo‘lsa, markaz hali kiritmagan.
    """
    today = date.today()
    until = getattr(student, "tuition_paid_until", None)
    note = (getattr(student, "tuition_payment_note", None) or "").strip()
    note_out = note or None
    if until is None:
        return {
            "status": "unset",
            "label": "Kiritilmagan",
            "message": "O‘quv markazi abonement muddatini hali kiritmagan.",
            "paid_until": None,
            "note": note_out,
        }
    if until >= today:
        return {
            "status": "paid",
            "label": "To‘langan",
            "message": f"Abonement {until.strftime('%d.%m.%Y')} gacha amal qiladi.",
            "paid_until": until.isoformat(),
            "note": note_out,
        }
    return {
        "status": "unpaid",
        "label": "To‘lanmagan",
        "message": f"Oxirgi to‘lov muddati {until.strftime('%d.%m.%Y')} edi. Markaz bilan bog‘laning.",
        "paid_until": until.isoformat(),
        "note": note_out,
    }
