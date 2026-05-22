from decimal import Decimal

from apps.catalog.models import Item


def default_monthly_amount_for_student(student) -> Decimal:
    """
    To'lov summasi (prioritet):
    1. student.metadata.monthly_fee
    2. guruh kursi narxi
    3. o'quvchi kursi narxi
    """
    meta = getattr(student, "metadata", None) or {}
    if isinstance(meta, dict):
        fee = meta.get("monthly_fee")
        if fee is not None and str(fee).strip() != "":
            try:
                return Decimal(str(fee))
            except Exception:
                pass

    group = getattr(student, "group", None)
    if group and group.course_id:
        course = getattr(group, "course", None)
        if course and course.price is not None:
            return Decimal(course.price)

    if student.course_id:
        course = getattr(student, "course", None)
        if course and course.price is not None:
            return Decimal(course.price)

    return Decimal("0")


def effective_payment_status(record) -> str:
    from .models import StudentMonthlyPayment

    if record is None:
        return StudentMonthlyPayment.Status.UNPAID
    return record.status
