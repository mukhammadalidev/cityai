import calendar
from collections import defaultdict
from datetime import date

from django.db import transaction
from django.db.models import Avg, Count
from rest_framework import permissions, serializers, status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.businesses.services import can_edit_business
from apps.subscriptions.services import get_plan_for_business
from apps.edu_quizzes.models import EduQuiz, EduQuizAttempt, EduQuizQuestion
from apps.edu_quizzes.portal import portal_quiz_data_for_student
from apps.students.models import Student, StudentAttendance, StudentGroup, StudentRating
from apps.students.payment_utils import tuition_payment_summary_for_student
from apps.students.serializers import (
    StudentAttendanceSerializer,
    StudentRatingSerializer,
    StudentSerializer,
)
from apps.teachers.models import Teacher
from apps.teachers.serializers import TeacherSerializer

from .models import User


def _resolve_portal_attendance_month(month_str: str | None) -> tuple[date, date, str]:
    """YYYY-MM yoki None → oy boshi/oxiri va normalizlangan label."""
    today = date.today()
    if not (month_str or "").strip():
        y, m = today.year, today.month
        return date(y, m, 1), date(y, m, calendar.monthrange(y, m)[1]), f"{y}-{m:02d}"
    try:
        parts = month_str.strip().split("-", 1)
        if len(parts) != 2:
            raise ValueError
        y, m = int(parts[0]), int(parts[1])
        if not 1 <= m <= 12:
            raise ValueError
    except ValueError:
        y, m = today.year, today.month
    start = date(y, m, 1)
    end = date(y, m, calendar.monthrange(y, m)[1])
    return start, end, f"{y}-{m:02d}"


def _portal_rating_rank_month(student: Student, start: date, end: date) -> dict:
    peer_qs = Student.objects.filter(business_id=student.business_id)
    scope_label = "Markaz bo‘yicha"
    if student.group_id:
        peer_qs = peer_qs.filter(group_id=student.group_id)
        scope_label = "Guruh bo‘yicha"
    graded = []
    for sid in peer_qs.values_list("id", flat=True):
        a = (
            StudentRating.objects.filter(student_id=sid, rated_at__gte=start, rated_at__lte=end)
            .aggregate(avg=Avg("points"))
            .get("avg")
        )
        if a is not None:
            graded.append((sid, float(a)))
    graded.sort(key=lambda x: (-x[1], x[0]))
    rank = next((i + 1 for i, (sid, _) in enumerate(graded) if sid == student.id), None)
    return {
        "rank": rank,
        "peers_graded": len(graded),
        "scope_label": scope_label,
    }


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

    r_all = StudentRating.objects.filter(student=student)
    r_month = r_all.filter(rated_at__gte=start, rated_at__lte=end)
    m_avg = r_month.aggregate(avg=Avg("points")).get("avg")
    all_avg = r_all.aggregate(avg=Avg("points")).get("avg")
    recent_ratings = r_all.order_by("-rated_at", "-id")[:30]

    portal_quizzes, portal_quiz_scores = portal_quiz_data_for_student(student)
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
        "ratings_month": {
            "month": month_str,
            "count": r_month.count(),
            "avg_points": round(float(m_avg), 1) if m_avg is not None else None,
        },
        "ratings_overall": {
            "count": r_all.count(),
            "avg_points": round(float(all_avg), 1) if all_avg is not None else None,
        },
        "ratings_rank_month": _portal_rating_rank_month(student, start, end),
        "recent_ratings": StudentRatingSerializer(recent_ratings, many=True).data,
        "portal_quizzes": portal_quizzes,
        "portal_quiz_scores": portal_quiz_scores,
        "tuition_payment": tuition_payment_summary_for_student(student),
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
    """Biznes egasi / menejer yoki (Premium tarifda) ota-ona: ustoz / o‘quvchi / ota-ona kabinet login."""

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
            is_super = request.user.role == User.Role.SUPER_ADMIN
            is_parent_actor = (
                request.user.role == User.Role.EDU_PARENT
                and getattr(request.user, "portal_parent_id", None) == student.id
            )
            can_business = can_edit_business(request.user, student.business)
            if not is_super and not can_business and not is_parent_actor:
                return Response({"detail": "Ruxsat yo‘q."}, status=403)
            if not is_super:
                pl = get_plan_for_business(student.business_id)
                if not pl or not pl.has_edu_portals:
                    return Response(
                        {
                            "detail": "Kabinetlar sizning tarifingizda yo‘q yoki markaz obunasi mos kelmaydi.",
                        },
                        status=403,
                    )
                if is_parent_actor and not getattr(
                    pl, "parent_can_create_student_portal", False
                ):
                    return Response(
                        {
                            "detail": "Farzand uchun o‘quvchi kabinetini ota-ona o‘zi faqat Premium tarifda yaratishi mumkin. Markaz administratoriga murojaat qiling.",
                        },
                        status=403,
                    )
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
        group_ids = [g.id for g in groups]
        students_qs = (
            Student.objects.filter(business=teacher.business, group_id__in=group_ids)
            .select_related("group", "course")
            .order_by("group__sort_order", "group__name", "name")[:300]
        )
        students_list = list(students_qs)
        student_ids = [s.id for s in students_list]

        plan = get_plan_for_business(teacher.business_id)
        attendance_insights = bool(plan and plan.has_edu_attendance)
        att_start, att_end, att_month = _resolve_portal_attendance_month(
            request.query_params.get("month")
        )

        by_group_student_ids: dict[int, list[int]] = defaultdict(list)
        for s in students_list:
            if s.group_id:
                by_group_student_ids[s.group_id].append(s.id)

        rating_by_sid: dict[int, dict] = {}
        if student_ids:
            for row in (
                StudentRating.objects.filter(
                    student_id__in=student_ids,
                    rated_at__gte=att_start,
                    rated_at__lte=att_end,
                )
                .values("student_id")
                .annotate(cnt=Count("id"), avg=Avg("points"))
            ):
                rating_by_sid[row["student_id"]] = row

        rank_by_sid: dict[int, dict] = {}
        for _gid, sids in by_group_student_ids.items():
            graded: list[tuple[int, float]] = []
            for sid in sids:
                r = rating_by_sid.get(sid)
                if r and r.get("avg") is not None:
                    graded.append((sid, float(r["avg"])))
            graded.sort(key=lambda x: (-x[1], x[0]))
            for i, (sid, _) in enumerate(graded):
                rank_by_sid[sid] = {
                    "rank": i + 1,
                    "peers_graded": len(graded),
                    "scope_label": "Guruh bo‘yicha (oy)",
                }

        students_payload = []
        for s in students_list:
            r = rating_by_sid.get(s.id)
            entry = {
                "id": s.id,
                "name": s.name,
                "phone": s.phone,
                "group_name": s.group.name if s.group_id else "",
                "course_title": s.course.title if s.course_id else "",
                "status": s.status,
                "ratings_month": {
                    "month": att_month,
                    "count": int(r["cnt"]) if r else 0,
                    "avg_points": round(float(r["avg"]), 1) if r and r.get("avg") is not None else None,
                },
                "ratings_rank_month": rank_by_sid.get(s.id),
            }
            students_payload.append(entry)

        group_payload = []
        for g in groups:
            row = {
                "id": g.id,
                "name": g.name,
                "students_count": g.students_count,
                "course_title": g.course.title if g.course_id else "",
            }
            if attendance_insights:
                row["best_attendance"] = None
            sids_g = by_group_student_ids.get(g.id, [])
            graded_pairs: list[tuple[int, float, str]] = []
            for sid in sids_g:
                r = rating_by_sid.get(sid)
                if r and r.get("avg") is not None:
                    st_name = next((x.name for x in students_list if x.id == sid), "")
                    graded_pairs.append((sid, float(r["avg"]), st_name))
            if graded_pairs:
                best_sid, best_avg, best_name = max(graded_pairs, key=lambda x: (x[1], -x[0]))
                row["top_rating_month"] = {
                    "student_id": best_sid,
                    "name": best_name,
                    "avg_points": round(best_avg, 1),
                }
            else:
                row["top_rating_month"] = None
            group_payload.append(row)

        if attendance_insights and group_ids and students_list:
            student_ids = [s.id for s in students_list]
            stat_by_student: dict[int, dict[str, int]] = defaultdict(lambda: {"marked": 0, "present": 0})
            for rec in StudentAttendance.objects.filter(
                student_id__in=student_ids,
                date__gte=att_start,
                date__lte=att_end,
            ).values("student_id", "status"):
                sid = rec["student_id"]
                stat_by_student[sid]["marked"] += 1
                if rec["status"] in (
                    StudentAttendance.Status.PRESENT,
                    StudentAttendance.Status.LATE,
                ):
                    stat_by_student[sid]["present"] += 1
            by_group: dict[int, list[Student]] = defaultdict(list)
            for s in students_list:
                if s.group_id:
                    by_group[s.group_id].append(s)
            group_best: dict[int, dict | None] = {}
            for gid in group_ids:
                candidates = []
                for s in by_group.get(gid, []):
                    st = stat_by_student[s.id]
                    mk, pr = st["marked"], st["present"]
                    if mk == 0:
                        continue
                    rate = pr / mk
                    candidates.append((rate, pr, mk, s.name, s.id))
                if not candidates:
                    group_best[gid] = None
                    continue
                candidates.sort(key=lambda x: (-x[0], -x[1], -x[2], x[3]))
                rate, pr, mk, name, sid = candidates[0]
                group_best[gid] = {
                    "student_id": sid,
                    "name": name,
                    "rate_percent": round(100 * rate, 1),
                    "present_days": pr,
                    "marked_days": mk,
                }
            for row in group_payload:
                row["best_attendance"] = group_best.get(row["id"])

        graded_avgs = [
            float(r["avg"]) for r in rating_by_sid.values() if r.get("avg") is not None
        ]
        ratings_summary = {
            "month": att_month,
            "students_with_grades": len(rating_by_sid),
            "overall_avg_points": round(sum(graded_avgs) / len(graded_avgs), 1) if graded_avgs else None,
        }

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
                "summary_month": att_month,
                "ratings_summary": ratings_summary,
                "attendance_insights_enabled": attendance_insights,
                "attendance_month": att_month if attendance_insights else None,
            }
        )


class StudentQuizSubmitSerializer(serializers.Serializer):
    quiz_id = serializers.IntegerField(min_value=1)
    answers = serializers.ListField(
        child=serializers.DictField(),
        allow_empty=False,
    )


class StudentQuizSubmitView(APIView):
    """O‘quvchi yuborgan javoblarni serverda tekshiradi (to‘g‘ri indekslar faqat serverda)."""

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        user = request.user
        if user.role != User.Role.EDU_STUDENT or not user.portal_student_id:
            return Response({"detail": "Faqat o‘quvchi kabineti."}, status=403)
        ser = StudentQuizSubmitSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        student = Student.objects.filter(pk=user.portal_student_id).first()
        if not student:
            return Response({"detail": "Profil topilmadi."}, status=404)
        quiz = EduQuiz.objects.filter(
            pk=ser.validated_data["quiz_id"],
            business_id=student.business_id,
            is_published=True,
        ).first()
        if not quiz:
            return Response({"detail": "Test topilmadi yoki hozir ochilmagan."}, status=404)
        questions = {q.id: q for q in EduQuizQuestion.objects.filter(quiz=quiz)}
        if not questions:
            return Response({"detail": "Savollar yo‘q."}, status=400)
        ok = 0
        for item in ser.validated_data["answers"]:
            qid = item.get("question_id")
            if qid not in questions:
                continue
            q = questions[qid]
            try:
                sel = int(item.get("selected_index"))
            except (TypeError, ValueError):
                continue
            if 0 <= sel < len(q.options or []) and sel == q.correct_index:
                ok += 1
        total = len(questions)
        with transaction.atomic():
            EduQuizAttempt.objects.create(
                student=student,
                quiz=quiz,
                correct_count=ok,
                total_questions=total,
            )
        return Response({"correct": ok, "total": total})


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
        child_portal_user = User.objects.filter(portal_student=student).first()
        plan = get_plan_for_business(student.business_id)
        payload["child_portal"] = {
            "username": child_portal_user.username if child_portal_user else None,
        }
        payload["parent_can_create_child_portal"] = bool(
            plan
            and plan.has_edu_portals
            and getattr(plan, "parent_can_create_student_portal", False)
            and not child_portal_user
        )
        return Response(payload)
