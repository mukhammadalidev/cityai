"""Fitness CRM hisobotlari va kengaytirilgan dashboard."""

from __future__ import annotations

import calendar
import csv
import io
from datetime import date, timedelta
from decimal import Decimal

from django.db.models import Count, F, Q, Sum
from django.http import HttpResponse
from django.utils import timezone
from rest_framework.exceptions import NotFound, ValidationError
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.businesses.models import Business

from .models import (
    BusinessClient,
    ClientAttendance,
    ClientMembership,
    ClientPayment,
    FitnessClassSession,
    FitnessTrainer,
)
from .views import _ensure_business_access, _parse_month


def _month_series(business_id: int, months: int = 6) -> list[dict]:
    today = timezone.localdate()
    out = []
    y, m = today.year, today.month
    for _ in range(months):
        first = date(y, m, 1)
        last_day = calendar.monthrange(y, m)[1]
        last = date(y, m, last_day)
        paid = (
            ClientPayment.objects.filter(
                business_id=business_id,
                payment_date__gte=first,
                payment_date__lte=last,
            ).aggregate(s=Sum("amount"))["s"]
            or Decimal("0")
        )
        members = BusinessClient.objects.filter(
            business_id=business_id, joined_date__lte=last
        ).count()
        out.append({"month": f"{y:04d}-{m:02d}", "income": str(paid), "members": members})
        m -= 1
        if m < 1:
            m = 12
            y -= 1
    out.reverse()
    return out


class FitnessDashboardReportView(APIView):
    """GET /api/reports/dashboard/ — kengaytirilgan fitness dashboard."""

    def get(self, request):
        business_id = request.query_params.get("business_id")
        month = request.query_params.get("month")
        if not business_id:
            raise ValidationError({"business_id": "business_id majburiy."})
        business_id_i = int(business_id)
        _ensure_business_access(request, business_id_i)
        if not Business.objects.filter(pk=business_id_i).exists():
            raise NotFound("Biznes topilmadi.")

        first, last = _parse_month(month)
        today = timezone.localdate()

        clients_qs = BusinessClient.objects.filter(business_id=business_id_i)
        active_members = clients_qs.filter(status=BusinessClient.Status.ACTIVE).count()
        inactive_members = clients_qs.exclude(status=BusinessClient.Status.ACTIVE).count()

        memberships_qs = ClientMembership.objects.filter(business_id=business_id_i)
        active_subs = memberships_qs.filter(
            status__in=[ClientMembership.Status.ACTIVE, ClientMembership.Status.EXPIRING]
        ).count()
        expiring_soon = memberships_qs.filter(
            status__in=[ClientMembership.Status.ACTIVE, ClientMembership.Status.EXPIRING],
            end_date__isnull=False,
            end_date__gte=today,
            end_date__lte=today + timedelta(days=7),
        ).count()
        expired_subs = memberships_qs.filter(status=ClientMembership.Status.EXPIRED).count()

        debt_qs = memberships_qs.filter(expected_amount__gt=F("paid_amount"))
        debtors_count = debt_qs.count()
        debt_total = debt_qs.aggregate(s=Sum(F("expected_amount") - F("paid_amount")))["s"] or Decimal("0")

        today_payments = ClientPayment.objects.filter(business_id=business_id_i, payment_date=today)
        today_income = today_payments.aggregate(s=Sum("amount"))["s"] or Decimal("0")

        month_payments = ClientPayment.objects.filter(
            business_id=business_id_i, payment_date__gte=first, payment_date__lte=last
        )
        month_income = month_payments.aggregate(s=Sum("amount"))["s"] or Decimal("0")

        today_checkins = ClientAttendance.objects.filter(
            business_id=business_id_i, visit_date=today, status=ClientAttendance.Status.PRESENT
        ).count()

        active_trainers = FitnessTrainer.objects.filter(
            business_id=business_id_i, status=FitnessTrainer.Status.ACTIVE
        ).count()

        today_sessions = FitnessClassSession.objects.filter(
            business_id=business_id_i, session_date=today, status=FitnessClassSession.Status.SCHEDULED
        ).select_related("trainer")[:20]

        payment_by_status = month_payments.values("status").annotate(c=Count("id"), total=Sum("amount"))
        attendance_month = ClientAttendance.objects.filter(
            business_id=business_id_i,
            visit_date__gte=first,
            visit_date__lte=last,
            status=ClientAttendance.Status.PRESENT,
        ).count()

        debtors = debt_qs.select_related("client").order_by("-id")[:15]
        expiring = memberships_qs.filter(
            end_date__isnull=False,
            end_date__gte=today,
            end_date__lte=today + timedelta(days=7),
        ).select_related("client").order_by("end_date")[:15]

        return Response(
            {
                "business_id": business_id_i,
                "month": f"{first.year:04d}-{first.month:02d}",
                "today": today.isoformat(),
                "cards": {
                    "members_total": clients_qs.count(),
                    "members_active": active_members,
                    "members_inactive": inactive_members,
                    "today_checkins": today_checkins,
                    "today_income": str(today_income),
                    "month_income": str(month_income),
                    "debtors_count": debtors_count,
                    "debt_total": str(debt_total),
                    "expiring_subscriptions": expiring_soon,
                    "expired_subscriptions": expired_subs,
                    "active_subscriptions": active_subs,
                    "active_trainers": active_trainers,
                    "today_sessions_count": today_sessions.count() if hasattr(today_sessions, "count") else len(list(today_sessions)),
                },
                "debtors": [
                    {
                        "member_id": m.client_id,
                        "membership_id": m.id,
                        "member_name": m.client.full_name,
                        "phone": m.client.phone,
                        "plan_name": m.display_title,
                        "total_amount": str(m.expected_amount),
                        "paid_amount": str(m.paid_amount),
                        "debt_amount": str(m.debt_amount),
                        "due_date": m.end_date.isoformat() if m.end_date else None,
                        "status": m.payment_status,
                    }
                    for m in debtors
                ],
                "expiring_subscriptions_list": [
                    {
                        "membership_id": m.id,
                        "member_name": m.client.full_name,
                        "plan_name": m.display_title,
                        "end_date": m.end_date.isoformat() if m.end_date else None,
                        "remaining_days": m.remaining_days,
                    }
                    for m in expiring
                ],
                "today_sessions": [
                    {
                        "id": s.id,
                        "title": s.title,
                        "trainer_name": s.trainer.full_name if s.trainer_id else "",
                        "start_time": s.start_time.isoformat(),
                        "end_time": s.end_time.isoformat(),
                        "current_members": s.current_members,
                        "max_members": s.max_members,
                    }
                    for s in today_sessions
                ],
                "charts": {
                    "monthly_income": _month_series(business_id_i, 6),
                    "members_growth": _month_series(business_id_i, 6),
                    "payment_status": list(payment_by_status),
                    "attendance_month": attendance_month,
                },
            }
        )


class FitnessMonthlyIncomeReportView(APIView):
    def get(self, request):
        business_id = request.query_params.get("business_id")
        if not business_id:
            raise ValidationError({"business_id": "business_id majburiy."})
        business_id_i = int(business_id)
        _ensure_business_access(request, business_id_i)
        return Response({"series": _month_series(business_id_i, 12)})


class FitnessDebtorsReportView(APIView):
    def get(self, request):
        business_id = request.query_params.get("business_id")
        export = request.query_params.get("export")
        if not business_id:
            raise ValidationError({"business_id": "business_id majburiy."})
        business_id_i = int(business_id)
        _ensure_business_access(request, business_id_i)

        debt_qs = (
            ClientMembership.objects.filter(business_id=business_id_i)
            .filter(expected_amount__gt=F("paid_amount"))
            .select_related("client")
            .order_by("-id")
        )
        rows = [
            {
                "member_id": m.client_id,
                "member_name": m.client.full_name,
                "phone": m.client.phone,
                "plan_name": m.display_title,
                "total_amount": str(m.expected_amount),
                "paid_amount": str(m.paid_amount),
                "debt_amount": str(m.debt_amount),
                "due_date": m.end_date.isoformat() if m.end_date else "",
                "status": m.payment_status,
            }
            for m in debt_qs
        ]
        if export == "csv":
            buf = io.StringIO()
            w = csv.DictWriter(
                buf,
                fieldnames=[
                    "member_id",
                    "member_name",
                    "phone",
                    "plan_name",
                    "total_amount",
                    "paid_amount",
                    "debt_amount",
                    "due_date",
                    "status",
                ],
            )
            w.writeheader()
            w.writerows(rows)
            resp = HttpResponse(buf.getvalue(), content_type="text/csv; charset=utf-8")
            resp["Content-Disposition"] = 'attachment; filename="qarzdorlar.csv"'
            return resp
        return Response({"debtors": rows, "count": len(rows)})


class FitnessAttendanceReportView(APIView):
    def get(self, request):
        business_id = request.query_params.get("business_id")
        month = request.query_params.get("month")
        export = request.query_params.get("export")
        if not business_id:
            raise ValidationError({"business_id": "business_id majburiy."})
        business_id_i = int(business_id)
        _ensure_business_access(request, business_id_i)
        first, last = _parse_month(month)

        qs = ClientAttendance.objects.filter(
            business_id=business_id_i, visit_date__gte=first, visit_date__lte=last
        ).select_related("client")
        by_member = (
            qs.filter(status=ClientAttendance.Status.PRESENT)
            .values("client_id", "client__full_name")
            .annotate(visits=Count("id"))
            .order_by("-visits")
        )
        if export == "csv":
            buf = io.StringIO()
            w = csv.writer(buf)
            w.writerow(["client_id", "full_name", "visit_date", "check_in", "check_out", "status"])
            for a in qs.order_by("-visit_date"):
                w.writerow(
                    [
                        a.client_id,
                        a.client.full_name,
                        a.visit_date.isoformat(),
                        a.check_in_time.isoformat() if a.check_in_time else "",
                        a.check_out_time.isoformat() if a.check_out_time else "",
                        a.status,
                    ]
                )
            resp = HttpResponse(buf.getvalue(), content_type="text/csv; charset=utf-8")
            resp["Content-Disposition"] = 'attachment; filename="davomat.csv"'
            return resp
        return Response(
            {
                "month": f"{first.year:04d}-{first.month:02d}",
                "total_visits": qs.filter(status=ClientAttendance.Status.PRESENT).count(),
                "by_member": list(by_member),
            }
        )
