"""O'quv markazi — jamlangan hisobotlar va eksport (CSV/Excel/PDF)."""

from __future__ import annotations

import calendar
import csv
import io
from datetime import date
from decimal import Decimal

from django.http import HttpResponse
from django.utils import timezone
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.businesses.models import Business
from apps.students.monthly_payment_views import (
    _ensure_business_access,
    _ensure_education_business,
    _filtered_students,
)
from apps.students.models import Student, StudentAttendance, StudentGroup, StudentMonthlyPayment
from apps.students.monthly_payment_utils import default_monthly_amount_for_student, effective_payment_status

STATUS_UZ = {
    StudentMonthlyPayment.Status.PAID: "To'langan",
    StudentMonthlyPayment.Status.UNPAID: "To'lanmagan",
    StudentMonthlyPayment.Status.PARTIAL: "Qisman",
    StudentMonthlyPayment.Status.DEBT: "Qarzdor",
}


def _parse_month(month_str: str | None) -> tuple[int, int, date, date]:
    if not month_str:
        today = timezone.localdate()
        month_str = f"{today.year:04d}-{today.month:02d}"
    try:
        y_s, m_s = month_str.split("-", 1)
        y, m = int(y_s), int(m_s)
    except ValueError as e:
        raise ValidationError({"month": "Format: YYYY-MM"}) from e
    if m < 1 or m > 12:
        raise ValidationError({"month": "Oy 1–12 orasida bo'lishi kerak."})
    first = date(y, m, 1)
    last_day = calendar.monthrange(y, m)[1]
    last = date(y, m, last_day)
    return y, m, first, last


def _month_payment_rows(business_id: int, year: int, month: int, group_id=None, course_id=None):
    students = list(_filtered_students(business_id, group_id, course_id))
    student_ids = [s.id for s in students]
    mp_by_student = {
        p.student_id: p
        for p in StudentMonthlyPayment.objects.filter(
            business_id=business_id, year=year, month=month, student_id__in=student_ids
        ).select_related("group", "course")
    }
    rows = []
    for s in students:
        amt = default_monthly_amount_for_student(s)
        rec = mp_by_student.get(s.id)
        st = effective_payment_status(rec)
        paid = rec.paid_amount if rec else Decimal("0")
        expected = rec.amount if rec else amt
        debt = max(Decimal("0"), expected - paid) if st in (
            StudentMonthlyPayment.Status.PARTIAL,
            StudentMonthlyPayment.Status.DEBT,
            StudentMonthlyPayment.Status.UNPAID,
        ) else Decimal("0")
        if st == StudentMonthlyPayment.Status.PAID:
            debt = Decimal("0")
        rows.append(
            {
                "student_id": s.id,
                "name": s.name,
                "phone": s.phone or "",
                "group": s.group.name if s.group_id else "",
                "course": s.course.title if s.course_id else "",
                "expected_amount": str(expected),
                "paid_amount": str(paid if st != StudentMonthlyPayment.Status.UNPAID else Decimal("0")),
                "debt_amount": str(debt),
                "status": st,
                "status_label": STATUS_UZ.get(st, st),
                "note": (rec.note if rec else "") or "",
            }
        )
    return rows, students


def _aggregate_summary(rows: list[dict], student_count: int) -> dict:
    paid_c = partial_c = debt_c = unpaid_c = 0
    expected = paid_sum = debt_sum = Decimal("0")
    for r in rows:
        expected += Decimal(r["expected_amount"])
        paid_sum += Decimal(r["paid_amount"])
        debt_sum += Decimal(r["debt_amount"])
        st = r["status"]
        if st == StudentMonthlyPayment.Status.PAID:
            paid_c += 1
        elif st == StudentMonthlyPayment.Status.PARTIAL:
            partial_c += 1
        elif st == StudentMonthlyPayment.Status.DEBT:
            debt_c += 1
        else:
            unpaid_c += 1
    return {
        "total_students": student_count,
        "paid_count": paid_c,
        "partial_count": partial_c,
        "debt_count": debt_c,
        "unpaid_count": unpaid_c,
        "expected_amount": str(expected),
        "paid_amount": str(paid_sum),
        "month_income": str(paid_sum),
        "remaining_debt": str(debt_sum),
    }


def _monthly_income_series(business_id: int, months: int = 6) -> list[dict]:
    today = timezone.localdate()
    out = []
    y, m = today.year, today.month
    for _ in range(months):
        rows, students = _month_payment_rows(business_id, y, m)
        summary = _aggregate_summary(rows, len(students))
        out.append(
            {
                "month": f"{y:04d}-{m:02d}",
                "income": summary["month_income"],
                "students": summary["total_students"],
                "paid_count": summary["paid_count"],
            }
        )
        m -= 1
        if m < 1:
            m = 12
            y -= 1
    out.reverse()
    return out


def _csv_response(filename: str, fieldnames: list[str], rows: list[dict]) -> HttpResponse:
    buf = io.StringIO()
    buf.write("\ufeff")
    w = csv.DictWriter(buf, fieldnames=fieldnames, extrasaction="ignore")
    w.writeheader()
    w.writerows(rows)
    resp = HttpResponse(buf.getvalue(), content_type="text/csv; charset=utf-8")
    resp["Content-Disposition"] = f'attachment; filename="{filename}"'
    return resp


def _xlsx_response(filename: str, fieldnames: list[str], rows: list[dict], sheet_title: str) -> HttpResponse:
    try:
        from openpyxl import Workbook
    except ImportError as e:
        raise ValidationError(
            {"detail": "Excel eksport serverda yoqilmagan. CSV formatidan foydalaning."}
        ) from e
    wb = Workbook()
    ws = wb.active
    ws.title = sheet_title[:31]
    ws.append(fieldnames)
    for row in rows:
        ws.append([row.get(f, "") for f in fieldnames])
    buf = io.BytesIO()
    wb.save(buf)
    buf.seek(0)
    resp = HttpResponse(
        buf.getvalue(),
        content_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    )
    resp["Content-Disposition"] = f'attachment; filename="{filename}"'
    return resp


def _pdf_payments_report(
    business_name: str, month_label: str, summary: dict, rows: list[dict]
) -> HttpResponse:
    try:
        from reportlab.lib import colors
        from reportlab.lib.pagesizes import A4, landscape
        from reportlab.lib.styles import getSampleStyleSheet
        from reportlab.lib.units import cm
        from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle
    except ImportError as e:
        raise ValidationError({"detail": "PDF eksport serverda yoqilmagan."}) from e

    buf = io.BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=landscape(A4), rightMargin=1.2 * cm, leftMargin=1.2 * cm)
    styles = getSampleStyleSheet()
    story = [
        Paragraph(f"<b>CityBot CRM — To'lovlar hisoboti</b>", styles["Title"]),
        Paragraph(f"{business_name} · {month_label}", styles["Normal"]),
        Spacer(1, 12),
        Paragraph(
            f"O'quvchilar: {summary['total_students']} · "
            f"To'langan: {summary['paid_count']} · "
            f"Kutilgan: {summary['expected_amount']} so'm · "
            f"Undirilgan: {summary['paid_amount']} so'm · "
            f"Qarz: {summary['remaining_debt']} so'm",
            styles["Normal"],
        ),
        Spacer(1, 16),
    ]
    headers = ["Ism", "Telefon", "Guruh", "Kurs", "Kutilgan", "To'langan", "Qarz", "Holat"]
    data = [headers]
    for r in rows:
        data.append(
            [
                r["name"],
                r["phone"],
                r["group"],
                r["course"],
                r["expected_amount"],
                r["paid_amount"],
                r["debt_amount"],
                r["status_label"],
            ]
        )
    table = Table(data, repeatRows=1)
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#2563EB")),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("FONTSIZE", (0, 0), (-1, -1), 8),
                ("GRID", (0, 0), (-1, -1), 0.25, colors.grey),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#F1F5F9")]),
            ]
        )
    )
    story.append(table)
    doc.build(story)
    buf.seek(0)
    resp = HttpResponse(buf.getvalue(), content_type="application/pdf")
    resp["Content-Disposition"] = f'attachment; filename="tolovlar_{month_label.replace(" ", "_")}.pdf"'
    return resp


class EduReportsDashboardView(APIView):
    """GET /api/edu-reports/dashboard/"""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        business_id = request.query_params.get("business_id")
        month = request.query_params.get("month")
        group_id = request.query_params.get("group_id")
        course_id = request.query_params.get("course_id")
        if not business_id:
            raise ValidationError({"business_id": "Majburiy"})
        bid = int(business_id)
        _ensure_business_access(request, bid)
        _ensure_education_business(bid)
        biz = Business.objects.filter(pk=bid).first()
        y, m, first, last = _parse_month(month)
        rows, students = _month_payment_rows(bid, y, m, group_id, course_id)
        summary = _aggregate_summary(rows, len(students))

        active_students = Student.objects.filter(business_id=bid, status=Student.Status.ACTIVE).count()
        groups_count = StudentGroup.objects.filter(business_id=bid).count()

        attendance_summary = None
        try:
            from apps.subscriptions.services import get_plan_for_business

            plan = get_plan_for_business(bid)
            if plan and plan.has_edu_attendance:
                recs = StudentAttendance.objects.filter(
                    student__business_id=bid,
                    date__gte=first,
                    date__lte=last,
                )
                marked = recs.count()
                present = recs.filter(
                    status__in=(StudentAttendance.Status.PRESENT, StudentAttendance.Status.LATE)
                ).count()
                attendance_summary = {
                    "marked_records": marked,
                    "present_records": present,
                    "avg_rate_percent": round(100 * present / marked, 1) if marked else None,
                }
        except Exception:
            pass

        return Response(
            {
                "business_id": bid,
                "business_name": biz.name if biz else "",
                "month": f"{y:04d}-{m:02d}",
                "summary": summary,
                "cards": {
                    **summary,
                    "active_students": active_students,
                    "groups_count": groups_count,
                },
                "charts": {"monthly_income": _monthly_income_series(bid, 6)},
                "attendance": attendance_summary,
                "top_debtors": sorted(
                    [r for r in rows if Decimal(r["debt_amount"]) > 0],
                    key=lambda x: Decimal(x["debt_amount"]),
                    reverse=True,
                )[:15],
            }
        )


class EduReportsPaymentsExportView(APIView):
    """GET /api/edu-reports/payments/?export=csv|xlsx|pdf"""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        business_id = request.query_params.get("business_id")
        month = request.query_params.get("month")
        group_id = request.query_params.get("group_id")
        course_id = request.query_params.get("course_id")
        export = (request.query_params.get("export") or "json").lower()
        if not business_id:
            raise ValidationError({"business_id": "Majburiy"})
        bid = int(business_id)
        _ensure_business_access(request, bid)
        _ensure_education_business(bid)
        biz = Business.objects.filter(pk=bid).first()
        y, m, _, _ = _parse_month(month)
        rows, students = _month_payment_rows(bid, y, m, group_id, course_id)
        summary = _aggregate_summary(rows, len(students))
        month_label = f"{y:04d}-{m:02d}"

        export_rows = [
            {
                "student_id": r["student_id"],
                "name": r["name"],
                "phone": r["phone"],
                "group": r["group"],
                "course": r["course"],
                "expected_amount": r["expected_amount"],
                "paid_amount": r["paid_amount"],
                "debt_amount": r["debt_amount"],
                "status": r["status_label"],
                "note": r["note"],
            }
            for r in rows
        ]
        fields = [
            "student_id",
            "name",
            "phone",
            "group",
            "course",
            "expected_amount",
            "paid_amount",
            "debt_amount",
            "status",
            "note",
        ]

        if export == "csv":
            return _csv_response(f"tolovlar_{month_label}.csv", fields, export_rows)
        if export in ("xlsx", "excel"):
            return _xlsx_response(f"tolovlar_{month_label}.xlsx", fields, export_rows, "To'lovlar")
        if export == "pdf":
            return _pdf_payments_report(
                biz.name if biz else "O'quv markazi",
                month_label,
                summary,
                rows,
            )
        return Response({"month": month_label, "summary": summary, "rows": export_rows})


class EduReportsAttendanceExportView(APIView):
    """GET /api/edu-reports/attendance/?export=csv|xlsx|pdf"""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        from apps.students.views import _require_edu_attendance_plan

        business_id = request.query_params.get("business_id")
        month = request.query_params.get("month")
        export = (request.query_params.get("export") or "json").lower()
        if not business_id:
            raise ValidationError({"business_id": "Majburiy"})
        bid = int(business_id)
        _ensure_business_access(request, bid)
        _ensure_education_business(bid)
        _require_edu_attendance_plan(request, bid)
        y, m, first, last = _parse_month(month)
        month_label = f"{y:04d}-{m:02d}"

        students = Student.objects.filter(business_id=bid).select_related("group").order_by("name")
        export_rows = []
        for s in students:
            recs = StudentAttendance.objects.filter(student=s, date__gte=first, date__lte=last)
            marked = recs.count()
            present = recs.filter(
                status__in=(StudentAttendance.Status.PRESENT, StudentAttendance.Status.LATE)
            ).count()
            export_rows.append(
                {
                    "student_id": s.id,
                    "name": s.name,
                    "group": s.group.name if s.group_id else "",
                    "marked_days": marked,
                    "present_days": present,
                    "absent_days": recs.filter(status=StudentAttendance.Status.ABSENT).count(),
                    "rate_percent": round(100 * present / marked, 1) if marked else "",
                }
            )
        fields = ["student_id", "name", "group", "marked_days", "present_days", "absent_days", "rate_percent"]

        if export == "csv":
            return _csv_response(f"davomat_{month_label}.csv", fields, export_rows)
        if export in ("xlsx", "excel"):
            return _xlsx_response(f"davomat_{month_label}.xlsx", fields, export_rows, "Davomat")
        if export == "pdf":
            summary = {
                "total_students": students.count(),
                "paid_count": 0,
                "expected_amount": "0",
                "paid_amount": "0",
                "remaining_debt": "0",
            }
            pdf_rows = [
                {
                    "name": r["name"],
                    "phone": "",
                    "group": r["group"],
                    "course": f"{r['present_days']}/{r['marked_days']}",
                    "expected_amount": str(r["marked_days"]),
                    "paid_amount": str(r["present_days"]),
                    "debt_amount": str(r["absent_days"]),
                    "status_label": f"{r['rate_percent']}%",
                }
                for r in export_rows
            ]
            biz = Business.objects.filter(pk=bid).first()
            return _pdf_payments_report(
                biz.name if biz else "O'quv markazi",
                f"Davomat {month_label}",
                summary,
                pdf_rows,
            )
        return Response({"month": month_label, "rows": export_rows})
