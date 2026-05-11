import calendar
from datetime import date

from django.db import transaction
from django.db.models import Avg, Count, OuterRef, Subquery
from rest_framework import permissions, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.response import Response

from apps.accounts.models import User
from apps.businesses.models import Business
from apps.businesses.services import accessible_business_ids
from apps.subscriptions.services import get_plan_for_business
from apps.teachers.models import Teacher

from .models import Student, StudentAttendance, StudentGroup, StudentRating
from .payment_utils import tuition_payment_summary_for_student
from .notifications import notify_parents_student_attendance
from .serializers import (
    StudentAttendanceSerializer,
    StudentGroupSerializer,
    StudentRatingSerializer,
    StudentSerializer,
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


def _ensure_student_crm_access(request, student: Student) -> None:
    """Biznes a’zolari yoki shu o‘quvchining guruhidagi ustoz (kabinet)."""
    user = request.user
    if not user.is_authenticated:
        raise PermissionDenied()
    if user.role == User.Role.SUPER_ADMIN:
        return
    if user.role == User.Role.EDU_TEACHER and getattr(user, "portal_teacher_id", None):
        teacher = Teacher.objects.filter(pk=user.portal_teacher_id).first()
        if (
            teacher
            and student.business_id == teacher.business_id
            and student.group_id
            and student.group.teacher_id == teacher.id
        ):
            return
        raise PermissionDenied()
    _ensure_business_access(request, student.business_id)


def _require_edu_attendance_plan(request, business_id: int) -> None:
    biz = Business.objects.filter(pk=business_id).only("business_type").first()
    if not biz or biz.business_type != Business.BusinessType.EDUCATION_CENTER:
        return
    if request.user.role == User.Role.SUPER_ADMIN:
        return
    plan = get_plan_for_business(business_id)
    if not plan or not plan.has_edu_attendance:
        raise PermissionDenied(
            "Davomat moduli joriy tarifda yo‘q. Billing sahifasidan tarifni yangilang."
        )


class StudentGroupViewSet(viewsets.ModelViewSet):
    serializer_class = StudentGroupSerializer

    def get_queryset(self):
        qs = StudentGroup.objects.select_related("business", "course", "teacher").annotate(
            student_count=Count("students", distinct=True)
        )
        business_id = self.request.query_params.get("business_id")
        teacher_id = self.request.query_params.get("teacher_id")
        if business_id:
            qs = qs.filter(business_id=business_id)
        if teacher_id:
            qs = qs.filter(teacher_id=teacher_id)
        user = self.request.user
        if user.is_authenticated and user.role != User.Role.SUPER_ADMIN:
            ids = accessible_business_ids(user)
            if ids is not None:
                qs = qs.filter(business_id__in=ids)
        return qs.order_by("sort_order", "name", "id")

    def perform_create(self, serializer):
        biz = serializer.validated_data["business"]
        _ensure_business_access(self.request, biz.id)
        serializer.save()

    def perform_update(self, serializer):
        biz = serializer.validated_data.get("business", serializer.instance.business)
        _ensure_business_access(self.request, biz.id)
        serializer.save()

    def perform_destroy(self, instance):
        _ensure_business_access(self.request, instance.business_id)
        instance.delete()


class StudentViewSet(viewsets.ModelViewSet):
    queryset = Student.objects.select_related("business", "course", "lead", "group").all()
    serializer_class = StudentSerializer

    def get_queryset(self):
        user = self.request.user
        is_portal_teacher = (
            user.is_authenticated
            and user.role == User.Role.EDU_TEACHER
            and getattr(user, "portal_teacher_id", None)
        )
        if is_portal_teacher:
            teacher = Teacher.objects.filter(pk=user.portal_teacher_id).first()
            if not teacher:
                qs = Student.objects.none()
            else:
                group_ids = StudentGroup.objects.filter(teacher=teacher).values_list("id", flat=True)
                qs = Student.objects.filter(
                    business_id=teacher.business_id,
                    group_id__in=group_ids,
                ).select_related("business", "course", "lead", "group")
        else:
            qs = Student.objects.select_related("business", "course", "lead", "group").all()

        business_id = self.request.query_params.get("business_id")
        status_param = self.request.query_params.get("status")
        group_id = self.request.query_params.get("group_id")
        if business_id:
            qs = qs.filter(business_id=business_id)
        if status_param:
            qs = qs.filter(status=status_param)
        if group_id:
            if group_id == "none" or group_id == "0":
                qs = qs.filter(group__isnull=True)
            else:
                qs = qs.filter(group_id=group_id)
        if user.is_authenticated and user.role != User.Role.SUPER_ADMIN and not is_portal_teacher:
            ids = accessible_business_ids(user)
            if ids is not None:
                qs = qs.filter(business_id__in=ids)

        # Har bir o‘quvchi uchun ota-onalar (EDU_PARENT) oxirgi kirish vaqti.
        # Multiple ota-ona bo‘lsa, oxirgisi (max last_login) ko‘rsatiladi.
        parent_last_login_sq = (
            User.objects.filter(
                role=User.Role.EDU_PARENT,
                portal_parent_id=OuterRef("pk"),
            )
            .order_by("-last_login")
            .values("last_login")[:1]
        )
        qs = qs.annotate(parent_portal_last_login=Subquery(parent_last_login_sq))

        return qs.order_by("name", "id")

    def perform_create(self, serializer):
        biz = serializer.validated_data["business"]
        _ensure_business_access(self.request, biz.id)
        serializer.save()

    def perform_update(self, serializer):
        biz = serializer.validated_data.get("business", serializer.instance.business)
        _ensure_business_access(self.request, biz.id)
        serializer.save()

    def perform_destroy(self, instance):
        _ensure_business_access(self.request, instance.business_id)
        instance.delete()

    @action(detail=False, methods=["get"], url_path="attendance-stats")
    def attendance_stats(self, request):
        business_id = request.query_params.get("business_id")
        month_str = request.query_params.get("month")
        if not business_id:
            raise ValidationError({"business_id": "Majburiy"})
        bid = int(business_id)
        _ensure_business_access(request, bid)
        _require_edu_attendance_plan(request, bid)
        if not month_str:
            today = date.today()
            month_str = f"{today.year}-{today.month:02d}"
        try:
            year_s, month_s = month_str.split("-", 1)
            year, month = int(year_s), int(month_s)
        except ValueError as e:
            raise ValidationError({"month": "Format: YYYY-MM"}) from e
        start = date(year, month, 1)
        last = calendar.monthrange(year, month)[1]
        end = date(year, month, last)

        students = (
            Student.objects.filter(business_id=bid)
            .select_related("group")
            .order_by("name", "id")
        )
        by_student = []
        total_present = 0
        total_marked = 0
        for s in students:
            recs = StudentAttendance.objects.filter(student=s, date__gte=start, date__lte=end)
            marked = recs.count()
            present = recs.filter(
                status__in=(StudentAttendance.Status.PRESENT, StudentAttendance.Status.LATE)
            ).count()
            by_student.append(
                {
                    "student_id": s.id,
                    "name": s.name,
                    "group_id": s.group_id,
                    "group_name": s.group.name if s.group_id else "",
                    "marked_days": marked,
                    "present_days": present,
                    "absent_days": recs.filter(status=StudentAttendance.Status.ABSENT).count(),
                    "excused_days": recs.filter(status=StudentAttendance.Status.EXCUSED).count(),
                    "rate_percent": round(100 * present / marked, 1) if marked else None,
                }
            )
            total_present += present
            total_marked += marked

        avg = round(100 * total_present / total_marked, 1) if total_marked else None
        return Response(
            {
                "month": month_str,
                "range": {"start": start.isoformat(), "end": end.isoformat()},
                "by_student": by_student,
                "totals": {
                    "students": students.count(),
                    "marked_records": total_marked,
                    "present_records": total_present,
                    "avg_rate_percent": avg,
                },
            }
        )

    @action(detail=True, methods=["get"], url_path="crm-summary")
    def crm_summary(self, request, pk=None):
        student = self.get_object()
        _ensure_student_crm_access(request, student)
        month_str = request.query_params.get("month")
        recs = StudentAttendance.objects.filter(student=student)
        if month_str:
            try:
                year_s, month_s = month_str.split("-", 1)
                year, month = int(year_s), int(month_s)
            except ValueError as e:
                raise ValidationError({"month": "Format: YYYY-MM"}) from e
            start = date(year, month, 1)
            last = calendar.monthrange(year, month)[1]
            end = date(year, month, last)
            recs = recs.filter(date__gte=start, date__lte=end)

        marked = recs.count()
        present = recs.filter(
            status__in=(StudentAttendance.Status.PRESENT, StudentAttendance.Status.LATE)
        ).count()
        absent = recs.filter(status=StudentAttendance.Status.ABSENT).count()
        excused = recs.filter(status=StudentAttendance.Status.EXCUSED).count()
        late_only = recs.filter(status=StudentAttendance.Status.LATE).count()
        rate = round(100 * present / marked, 1) if marked else None

        recent = recs.order_by("-date")[:150]
        course_block = None
        if student.course_id:
            c = student.course
            course_block = {
                "id": c.id,
                "title": c.title,
                "description": (c.description or "")[:800],
                "metadata": c.metadata or {},
            }

        r_qs = StudentRating.objects.filter(student=student)
        if month_str:
            r_qs = r_qs.filter(rated_at__gte=start, rated_at__lte=end)
        r_avg = r_qs.aggregate(avg=Avg("points"))["avg"]
        r_avg_rounded = round(float(r_avg), 1) if r_avg is not None else None
        recent_ratings = r_qs.order_by("-rated_at", "-id")[:50]

        return Response(
            {
                "student": StudentSerializer(student).data,
                "tuition_payment": tuition_payment_summary_for_student(student),
                "scope": {"month": month_str} if month_str else {"month": None, "all_time": True},
                "totals": {
                    "marked_days": marked,
                    "present_days": present,
                    "late_days": late_only,
                    "absent_days": absent,
                    "excused_days": excused,
                    "rate_percent": rate,
                },
                "course": course_block,
                "recent_attendance": StudentAttendanceSerializer(recent, many=True).data,
                "ratings": {
                    "count": r_qs.count(),
                    "avg_points": r_avg_rounded,
                    "recent": StudentRatingSerializer(recent_ratings, many=True).data,
                },
            }
        )

    @action(detail=False, methods=["get"], url_path="rating-leaderboard")
    def rating_leaderboard(self, request):
        business_id = request.query_params.get("business_id")
        group_id = request.query_params.get("group_id")
        month_str = request.query_params.get("month")
        if not business_id:
            raise ValidationError({"business_id": "Majburiy"})
        bid = int(business_id)
        _ensure_business_access(request, bid)

        st_qs = Student.objects.filter(business_id=bid)
        if group_id and str(group_id) not in ("0", "none"):
            st_qs = st_qs.filter(group_id=int(group_id))
        elif group_id in ("0", "none"):
            st_qs = st_qs.filter(group__isnull=True)

        rfilter = StudentRating.objects.filter(student__business_id=bid)
        if group_id and str(group_id) not in ("0", "none"):
            rfilter = rfilter.filter(student__group_id=int(group_id))
        elif group_id in ("0", "none"):
            rfilter = rfilter.filter(student__group__isnull=True)

        if month_str:
            try:
                year_s, month_s = month_str.split("-", 1)
                year, month = int(year_s), int(month_s)
            except ValueError as e:
                raise ValidationError({"month": "Format: YYYY-MM"}) from e
            start = date(year, month, 1)
            last = calendar.monthrange(year, month)[1]
            end = date(year, month, last)
            rfilter = rfilter.filter(rated_at__gte=start, rated_at__lte=end)

        rows = []
        for s in st_qs.select_related("group").order_by("name", "id"):
            sub = rfilter.filter(student_id=s.id)
            agg = sub.aggregate(avg=Avg("points"), n=Count("id"))
            avg = agg["avg"]
            rows.append(
                {
                    "student_id": s.id,
                    "name": s.name,
                    "group_id": s.group_id,
                    "group_name": s.group.name if s.group_id else "",
                    "ratings_count": agg["n"] or 0,
                    "avg_points": round(float(avg), 1) if avg is not None else None,
                }
            )
        graded = [r for r in rows if r["avg_points"] is not None]
        graded.sort(key=lambda x: (-x["avg_points"], x["name"]))
        rank_by_id = {r["student_id"]: idx + 1 for idx, r in enumerate(graded)}
        for row in rows:
            row["rank"] = rank_by_id.get(row["student_id"])
        rows.sort(key=lambda x: (-(x["avg_points"] if x["avg_points"] is not None else -1), x["name"]))

        return Response(
            {
                "month": month_str,
                "business_id": bid,
                "group_id": int(group_id) if group_id and str(group_id).isdigit() else group_id,
                "rows": rows,
            }
        )


class StudentRatingViewSet(viewsets.ModelViewSet):
    queryset = StudentRating.objects.select_related("student", "student__business").all()
    serializer_class = StudentRatingSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        business_id = self.request.query_params.get("business_id")
        student_id = self.request.query_params.get("student_id")
        month_str = self.request.query_params.get("month")
        if business_id:
            qs = qs.filter(student__business_id=business_id)
        if student_id:
            qs = qs.filter(student_id=student_id)
        if month_str:
            try:
                year_s, month_s = month_str.split("-", 1)
                year, month = int(year_s), int(month_s)
            except ValueError as e:
                raise ValidationError({"month": "Format: YYYY-MM"}) from e
            start = date(year, month, 1)
            last = calendar.monthrange(year, month)[1]
            end = date(year, month, last)
            qs = qs.filter(rated_at__gte=start, rated_at__lte=end)
        user = self.request.user
        if user.is_authenticated and user.role != User.Role.SUPER_ADMIN:
            ids = accessible_business_ids(user)
            if ids is not None:
                qs = qs.filter(student__business_id__in=ids)
        return qs.order_by("-rated_at", "-id")

    def perform_create(self, serializer):
        st = serializer.validated_data["student"]
        _ensure_business_access(self.request, st.business_id)
        serializer.save()

    def perform_update(self, serializer):
        st = serializer.validated_data.get("student", serializer.instance.student)
        _ensure_business_access(self.request, st.business_id)
        serializer.save()

    def perform_destroy(self, instance):
        _ensure_business_access(self.request, instance.student.business_id)
        instance.delete()


class StudentAttendanceViewSet(viewsets.ModelViewSet):
    queryset = StudentAttendance.objects.select_related("student", "student__business").all()
    serializer_class = StudentAttendanceSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        business_id = self.request.query_params.get("business_id")
        student_id = self.request.query_params.get("student_id")
        day = self.request.query_params.get("date")
        date_from = self.request.query_params.get("date_from")
        date_to = self.request.query_params.get("date_to")
        if business_id:
            qs = qs.filter(student__business_id=business_id)
        if student_id:
            qs = qs.filter(student_id=student_id)
        if day:
            qs = qs.filter(date=day)
        if date_from:
            qs = qs.filter(date__gte=date_from)
        if date_to:
            qs = qs.filter(date__lte=date_to)
        user = self.request.user
        if user.is_authenticated and user.role != User.Role.SUPER_ADMIN:
            ids = accessible_business_ids(user)
            if ids is not None:
                qs = qs.filter(student__business_id__in=ids)
        return qs.order_by("-date", "student_id")

    def perform_create(self, serializer):
        st = serializer.validated_data["student"]
        _ensure_business_access(self.request, st.business_id)
        instance = serializer.save()
        notify_parents_student_attendance(instance, previous_status=None)

    def perform_update(self, serializer):
        st = serializer.validated_data.get("student", serializer.instance.student)
        _ensure_business_access(self.request, st.business_id)
        old_status = serializer.instance.status
        instance = serializer.save()
        notify_parents_student_attendance(instance, previous_status=old_status)

    def perform_destroy(self, instance):
        _ensure_business_access(self.request, instance.student.business_id)
        instance.delete()

    @action(
        detail=False,
        methods=["post"],
        url_path="bulk-day",
        permission_classes=[permissions.IsAuthenticated],
    )
    def bulk_day(self, request):
        business_id = request.data.get("business_id")
        day = request.data.get("date")
        rows = request.data.get("rows")
        if business_id is None or not day or not isinstance(rows, list):
            raise ValidationError({"detail": "business_id, date va rows (massiv) kerak"})
        bid = int(business_id)
        _ensure_business_access(request, bid)
        _require_edu_attendance_plan(request, bid)
        try:
            d = date.fromisoformat(str(day)[:10])
        except ValueError as e:
            raise ValidationError({"date": "Noto‘g‘ri sana"}) from e

        created, updated = 0, 0
        with transaction.atomic():
            for row in rows:
                sid = row.get("student_id")
                st_status = row.get("status")
                note = row.get("note") or ""
                if sid is None or not st_status:
                    continue
                student = Student.objects.filter(id=sid, business_id=bid).first()
                if not student:
                    continue
                prev = StudentAttendance.objects.filter(student=student, date=d).first()
                prev_status = prev.status if prev else None
                obj, is_created = StudentAttendance.objects.update_or_create(
                    student=student,
                    date=d,
                    defaults={"status": st_status, "note": note[:500]},
                )
                if is_created:
                    created += 1
                else:
                    updated += 1
                if prev_status != obj.status:
                    notify_parents_student_attendance(obj, previous_status=prev_status)
        return Response({"date": d.isoformat(), "created": created, "updated": updated})
