import calendar
from datetime import date

from django.db.models import Count
from rest_framework import permissions, serializers, status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.businesses.services import can_edit_business
from apps.subscriptions.services import get_plan_for_business
from apps.students.models import Student, StudentAttendance, StudentGroup
from apps.students.serializers import StudentAttendanceSerializer, StudentSerializer
from apps.teachers.models import Teacher
from apps.teachers.serializers import TeacherSerializer

from .models import User


def build_student_portal_payload(student: Student) -> dict:
    """O‘quvchi / ota-ona kabineti uchun umumiy JSON (faqat shu student)."""
    today = date.today()
    month_str = f"{today.year}-{today.month:02d}"
    try:
        year_s, month_s = month_str.split("-", 1)
        year, month = int(year_s), int(month_s)
    except ValueError:
        year, month = today.year, today.month
    start = date(year, month, 1)
    last = calendar.monthrange(year, month)[1]
    end = date(year, month, last)

    recs = StudentAttendance.objects.filter(student=student)
    month_recs = recs.filter(date__gte=start, date__lte=end)
    marked = month_recs.count()
    present = month_recs.filter(
        status__in=(StudentAttendance.Status.PRESENT, StudentAttendance.Status.LATE)
    ).count()

    recent = recs.order_by("-date")[:60]

    return {
        "business": {
            "id": student.business_id,
            "name": student.business.name,
            "city": student.business.city.name if student.business.city_id else "",
        },
        "student": StudentSerializer(student).data,
        "group_teacher_name": (
            student.group.teacher.full_name
            if student.group_id and student.group.teacher_id
            else ""
        ),
        "attendance_month": {
            "month": month_str,
            "marked_days": marked,
            "present_days": present,
            "rate_percent": round(100 * present / marked, 1) if marked else None,
        },
        "recent_attendance": StudentAttendanceSerializer(recent, many=True).data,
    }


class CreateEduPortalUserSerializer(serializers.Serializer):
    kind = serializers.ChoiceField(choices=("teacher", "student", "parent"))
    username = serializers.CharField(max_length=150)
    password = serializers.CharField(write_only=True, min_length=6)
    teacher_id = serializers.IntegerField(required=False)
    student_id = serializers.IntegerField(required=False)
    parent_display_name = serializers.CharField(
        max_length=255, required=False, allow_blank=True, default=""
    )

    def validate_username(self, value):
        if User.objects.filter(username=value).exists():
            raise serializers.ValidationError("Bu login band.")
        return value

    def validate(self, attrs):
        k = attrs["kind"]
        if k == "teacher" and not attrs.get("teacher_id"):
            raise serializers.ValidationError({"teacher_id": "teacher_id kerak"})
        if k == "student" and not attrs.get("student_id"):
            raise serializers.ValidationError({"student_id": "student_id kerak"})
        if k == "parent" and not attrs.get("student_id"):
            raise serializers.ValidationError({"student_id": "student_id kerak"})
        return attrs


class CreateEduPortalUserView(APIView):
    """Biznes egasi / menejer: ustoz, o‘quvchi yoki ota-ona uchun alohida kabinet login."""

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        ser = CreateEduPortalUserSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        d = ser.validated_data
        kind = d["kind"]

        if kind == "teacher":
            _t = Teacher.objects.filter(pk=d["teacher_id"]).first()
            if not _t:
                return Response({"detail": "Ustoz topilmadi."}, status=404)
            portal_biz_id = _t.business_id
        else:
            _s = Student.objects.filter(pk=d["student_id"]).first()
            if not _s:
                return Response({"detail": "O‘quvchi topilmadi."}, status=404)
            portal_biz_id = _s.business_id

        if request.user.role != User.Role.SUPER_ADMIN:
            pl = get_plan_for_business(portal_biz_id)
            if not pl or not pl.has_edu_portals:
                return Response(
                    {
                        "detail": "Ustoz / o‘quvchi / ota-ona kabinetlari sizning tarifingizda yo‘q. Billing orqali yangilang.",
                    },
                    status=403,
                )

        if kind == "teacher":
            teacher = Teacher.objects.select_related("business").filter(pk=d["teacher_id"]).first()
            if not teacher:
                return Response({"detail": "Ustoz topilmadi."}, status=404)
            if not can_edit_business(request.user, teacher.business):
                return Response({"detail": "Ruxsat yo‘q."}, status=403)
            if User.objects.filter(portal_teacher=teacher).exists():
                return Response({"detail": "Bu ustozda kabinet allaqachon mavjud."}, status=400)
            user = User.objects.create_user(
                username=d["username"],
                password=d["password"],
                role=User.Role.EDU_TEACHER,
                full_name=teacher.full_name,
                phone=teacher.phone or "",
            )
            user.portal_teacher = teacher
            user.save(update_fields=["portal_teacher"])
            return Response({"username": user.username, "role": user.role}, status=201)

        if kind == "student":
            student = Student.objects.select_related("business").filter(pk=d["student_id"]).first()
            if not student:
                return Response({"detail": "O‘quvchi topilmadi."}, status=404)
            if not can_edit_business(request.user, student.business):
                return Response({"detail": "Ruxsat yo‘q."}, status=403)
            if User.objects.filter(portal_student=student).exists():
                return Response({"detail": "Bu o‘quvchida kabinet allaqachon mavjud."}, status=400)
            user = User.objects.create_user(
                username=d["username"],
                password=d["password"],
                role=User.Role.EDU_STUDENT,
                full_name=student.name,
                phone=student.phone or "",
            )
            user.portal_student = student
            user.save(update_fields=["portal_student"])
            return Response({"username": user.username, "role": user.role}, status=201)

        # parent — bir nechta ota-ona bir bolaga alohida login bilan bog‘lanishi mumkin
        student = Student.objects.select_related("business").filter(pk=d["student_id"]).first()
        if not student:
            return Response({"detail": "O‘quvchi topilmadi."}, status=404)
        if not can_edit_business(request.user, student.business):
            return Response({"detail": "Ruxsat yo‘q."}, status=403)
        label = (d.get("parent_display_name") or "").strip()
        full_name = label or f"{student.name} — ota-ona"
        user = User.objects.create_user(
            username=d["username"],
            password=d["password"],
            role=User.Role.EDU_PARENT,
            full_name=full_name,
            phone="",
        )
        user.portal_parent = student
        user.save(update_fields=["portal_parent"])
        return Response({"username": user.username, "role": user.role}, status=201)


class TeacherPortalSummaryView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        if user.role != User.Role.EDU_TEACHER or not user.portal_teacher_id:
            return Response({"detail": "Faqat ustoz kabineti."}, status=403)
        teacher = (
            Teacher.objects.select_related("business", "business__city")
            .filter(pk=user.portal_teacher_id)
            .first()
        )
        if not teacher:
            return Response({"detail": "Profil topilmadi."}, status=404)

        groups = (
            StudentGroup.objects.filter(teacher=teacher)
            .select_related("course")
            .annotate(students_count=Count("students", distinct=True))
            .order_by("sort_order", "name")
        )
        group_payload = [
            {
                "id": g.id,
                "name": g.name,
                "students_count": g.students_count,
                "course_title": g.course.title if g.course_id else "",
            }
            for g in groups
        ]
        group_ids = [g.id for g in groups]
        students_qs = (
            Student.objects.filter(business=teacher.business, group_id__in=group_ids)
            .select_related("group", "course")
            .order_by("group__sort_order", "group__name", "name")[:300]
        )
        students_payload = [
            {
                "id": s.id,
                "name": s.name,
                "phone": s.phone,
                "group_name": s.group.name if s.group_id else "",
                "course_title": s.course.title if s.course_id else "",
                "status": s.status,
            }
            for s in students_qs
        ]

        return Response(
            {
                "business": {
                    "id": teacher.business_id,
                    "name": teacher.business.name,
                    "city": teacher.business.city.name if teacher.business.city_id else "",
                },
                "teacher": TeacherSerializer(teacher).data,
                "groups": group_payload,
                "students": students_payload,
            }
        )


class StudentPortalSummaryView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        if user.role != User.Role.EDU_STUDENT or not user.portal_student_id:
            return Response({"detail": "Faqat o‘quvchi kabineti."}, status=403)
        student = (
            Student.objects.select_related("business", "business__city", "group", "course", "group__teacher")
            .filter(pk=user.portal_student_id)
            .first()
        )
        if not student:
            return Response({"detail": "Profil topilmadi."}, status=404)

        return Response(build_student_portal_payload(student))


class ParentPortalSummaryView(APIView):
    """Ota-ona: faqat bog‘langan farzandining davomati va guruhi (o‘z markazi)."""

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        if user.role != User.Role.EDU_PARENT or not user.portal_parent_id:
            return Response({"detail": "Faqat ota-ona kabineti."}, status=403)
        student = (
            Student.objects.select_related("business", "business__city", "group", "course", "group__teacher")
            .filter(pk=user.portal_parent_id)
            .first()
        )
        if not student:
            return Response({"detail": "Profil topilmadi."}, status=404)

        payload = build_student_portal_payload(student)
        payload["viewer"] = "parent"
        return Response(payload)
