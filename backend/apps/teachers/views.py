from django.db.models import Count
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response

from apps.accounts.models import User
from apps.businesses.services import accessible_business_ids
from apps.students.models import StudentGroup

from .models import Teacher
from .serializers import TeacherSerializer


def _ensure_business_access(request, business_id: int) -> None:
    user = request.user
    if not user.is_authenticated:
        raise PermissionDenied()
    if user.role == User.Role.SUPER_ADMIN:
        return
    ids = accessible_business_ids(user)
    if ids is not None and business_id not in ids:
        raise PermissionDenied()


class TeacherViewSet(viewsets.ModelViewSet):
    serializer_class = TeacherSerializer

    def get_queryset(self):
        qs = (
            Teacher.objects.select_related("business")
            .annotate(
                groups_count=Count("student_groups", distinct=True),
                students_in_groups_count=Count(
                    "student_groups__students",
                    distinct=True,
                ),
            )
            .all()
        )
        business_id = self.request.query_params.get("business_id")
        status_param = self.request.query_params.get("status")
        if business_id:
            qs = qs.filter(business_id=business_id)
        if status_param:
            qs = qs.filter(status=status_param)
        user = self.request.user
        if user.is_authenticated and user.role != User.Role.SUPER_ADMIN:
            ids = accessible_business_ids(user)
            if ids is not None:
                qs = qs.filter(business_id__in=ids)
        return qs.order_by("sort_order", "full_name", "id")

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

    @action(detail=True, methods=["get"], url_path="crm-summary")
    def crm_summary(self, request, pk=None):
        teacher = self.get_object()
        _ensure_business_access(request, teacher.business_id)
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
        return Response(
            {
                "teacher": TeacherSerializer(teacher).data,
                "groups": group_payload,
            }
        )
