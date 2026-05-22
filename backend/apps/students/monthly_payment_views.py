from decimal import Decimal

from django.db.models import Q
from rest_framework import permissions, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.response import Response

from apps.accounts.models import User
from apps.businesses.models import Business
from apps.businesses.services import accessible_business_ids

from .models import Student, StudentMonthlyPayment
from .monthly_payment_utils import default_monthly_amount_for_student, effective_payment_status
from .serializers_monthly_payment import (
    StudentMonthlyPaymentBulkSerializer,
    StudentMonthlyPaymentSerializer,
)


def _ensure_business_access(request, business_id: int) -> None:
    user = request.user
    if not user.is_authenticated:
        raise PermissionDenied()
    if user.role == User.Role.SUPER_ADMIN:
        return
    ids = accessible_business_ids(user)
    if ids is not None and business_id not in ids:
        raise PermissionDenied()


def _ensure_education_business(business_id: int) -> None:
    biz = Business.objects.filter(pk=business_id).only("business_type").first()
    if not biz or biz.business_type != Business.BusinessType.EDUCATION_CENTER:
        raise ValidationError({"business": "Faqat o'quv markazlari uchun."})


def _filtered_students(business_id: int, group_id=None, course_id=None):
    qs = Student.objects.filter(
        business_id=business_id, status=Student.Status.ACTIVE
    ).select_related("course", "group", "group__course")
    if group_id:
        if str(group_id) in ("none", "0"):
            qs = qs.filter(group__isnull=True)
        else:
            qs = qs.filter(group_id=int(group_id))
    if course_id:
        qs = qs.filter(course_id=int(course_id))
    return qs.order_by("name", "id")


class StudentMonthlyPaymentViewSet(viewsets.ModelViewSet):
    serializer_class = StudentMonthlyPaymentSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        qs = StudentMonthlyPayment.objects.select_related(
            "student", "group", "course", "business"
        ).all()
        business_id = self.request.query_params.get("business_id")
        year = self.request.query_params.get("year")
        month = self.request.query_params.get("month")
        group_id = self.request.query_params.get("group_id")
        course_id = self.request.query_params.get("course_id")
        student_id = self.request.query_params.get("student_id")
        status = self.request.query_params.get("status")
        search = (self.request.query_params.get("search") or "").strip().lower()

        if business_id:
            qs = qs.filter(business_id=business_id)
        if year:
            qs = qs.filter(year=int(year))
        if month:
            qs = qs.filter(month=int(month))
        if group_id:
            if group_id in ("none", "0"):
                qs = qs.filter(group__isnull=True)
            else:
                qs = qs.filter(group_id=int(group_id))
        if course_id:
            qs = qs.filter(course_id=int(course_id))
        if student_id:
            qs = qs.filter(student_id=int(student_id))
        if status:
            qs = qs.filter(status=status)

        if search:
            qs = qs.filter(
                Q(student__name__icontains=search) | Q(student__phone__icontains=search)
            )

        user = self.request.user
        if user.is_authenticated and user.role != User.Role.SUPER_ADMIN:
            ids = accessible_business_ids(user)
            if ids is not None:
                qs = qs.filter(business_id__in=ids)
        return qs.order_by("student__name", "month")

    def perform_create(self, serializer):
        biz = serializer.validated_data["business"]
        _ensure_business_access(self.request, biz.id)
        _ensure_education_business(biz.id)
        serializer.save()

    def perform_update(self, serializer):
        biz = serializer.validated_data.get("business", serializer.instance.business)
        _ensure_business_access(self.request, biz.id)
        _ensure_education_business(biz.id)
        serializer.save()

    def perform_destroy(self, instance):
        _ensure_business_access(self.request, instance.business_id)
        instance.delete()

    def _quick_update_impl(self, request):
        ser = StudentMonthlyPaymentBulkSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        bid = ser.validated_data["business"]
        _ensure_business_access(request, bid)
        _ensure_education_business(bid)
        obj = ser.create_or_update()
        return Response(StudentMonthlyPaymentSerializer(obj).data)

    @action(detail=False, methods=["post"], url_path="bulk-update")
    def bulk_update(self, request):
        return self._quick_update_impl(request)

    @action(detail=False, methods=["post"], url_path="quick-update")
    def quick_update(self, request):
        return self._quick_update_impl(request)

    @action(detail=False, methods=["get"], url_path="summary")
    def summary(self, request):
        business_id = request.query_params.get("business_id")
        year = request.query_params.get("year")
        month = request.query_params.get("month")
        group_id = request.query_params.get("group_id")
        course_id = request.query_params.get("course_id")
        if not business_id or not year or not month:
            raise ValidationError({"detail": "business_id, year, month majburiy."})
        bid = int(business_id)
        y = int(year)
        m = int(month)
        _ensure_business_access(request, bid)

        students = list(_filtered_students(bid, group_id, course_id))
        student_ids = [s.id for s in students]
        mp_by_student = {
            p.student_id: p
            for p in StudentMonthlyPayment.objects.filter(
                business_id=bid, year=y, month=m, student_id__in=student_ids
            )
        }

        paid_count = partial_count = debt_count = unpaid_count = 0
        expected_amount = Decimal("0")
        paid_amount_sum = Decimal("0")
        remaining_debt = Decimal("0")

        for s in students:
            amt = default_monthly_amount_for_student(s)
            expected_amount += amt
            rec = mp_by_student.get(s.id)
            st = effective_payment_status(rec)
            if st == StudentMonthlyPayment.Status.PAID:
                paid_count += 1
                paid_amount_sum += rec.paid_amount if rec else amt
            elif st == StudentMonthlyPayment.Status.PARTIAL:
                partial_count += 1
                paid_amount_sum += rec.paid_amount if rec else Decimal("0")
                remaining_debt += max(
                    Decimal("0"),
                    (rec.amount if rec else amt) - (rec.paid_amount if rec else Decimal("0")),
                )
            elif st == StudentMonthlyPayment.Status.DEBT:
                debt_count += 1
                remaining_debt += rec.amount if rec else amt
            else:
                unpaid_count += 1
                remaining_debt += rec.amount if rec else amt

        return Response(
            {
                "year": y,
                "month": m,
                "total_students": len(students),
                "students_total": len(students),
                "paid_count": paid_count,
                "partial_count": partial_count,
                "debt_count": debt_count,
                "unpaid_count": unpaid_count,
                "expected_amount": str(expected_amount),
                "paid_amount": str(paid_amount_sum),
                "month_income": str(paid_amount_sum),
                "remaining_debt": str(remaining_debt),
                "records_count": len(mp_by_student),
            }
        )
