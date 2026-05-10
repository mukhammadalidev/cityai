from django.db.models import Count
from rest_framework import permissions, viewsets
from rest_framework.exceptions import PermissionDenied, ValidationError

from apps.accounts.models import User
from apps.businesses.models import Business
from apps.businesses.services import accessible_business_ids

from .models import EduQuiz, EduQuizCategory
from .serializers import (
    EduQuizCategorySerializer,
    EduQuizDetailSerializer,
    EduQuizListSerializer,
    EduQuizWriteSerializer,
)


def _ensure_edu_business_access(request, business_id: int) -> Business:
    user = request.user
    if not user.is_authenticated:
        raise PermissionDenied()
    biz = Business.objects.filter(pk=business_id).first()
    if not biz:
        raise ValidationError("Biznes topilmadi.")
    if biz.business_type != Business.BusinessType.EDUCATION_CENTER:
        raise ValidationError("Faqat o‘quv markazi uchun.")
    if user.role == User.Role.SUPER_ADMIN:
        return biz
    ids = accessible_business_ids(user)
    if ids is not None and business_id not in ids:
        raise PermissionDenied()
    return biz


class EduQuizCategoryViewSet(viewsets.ModelViewSet):
    serializer_class = EduQuizCategorySerializer
    permission_classes = [permissions.IsAuthenticated]
    http_method_names = ["get", "post", "patch", "delete", "head", "options"]

    def get_queryset(self):
        qs = EduQuizCategory.objects.select_related("business").all()
        business_id = self.request.query_params.get("business_id")
        if business_id:
            qs = qs.filter(business_id=business_id)
        user = self.request.user
        if user.is_authenticated and user.role != User.Role.SUPER_ADMIN:
            ids = accessible_business_ids(user)
            if ids is not None:
                qs = qs.filter(business_id__in=ids)
        return qs.order_by("name", "id")

    def perform_create(self, serializer):
        bid = serializer.validated_data["business"].id
        _ensure_edu_business_access(self.request, bid)
        serializer.save()

    def perform_update(self, serializer):
        bid = serializer.validated_data.get("business", serializer.instance.business).id
        _ensure_edu_business_access(self.request, bid)
        serializer.save()

    def perform_destroy(self, instance):
        _ensure_edu_business_access(self.request, instance.business_id)
        if instance.quizzes.exists():
            raise ValidationError("Bu kategoriyada testlar bor — avval ularni o‘chiring yoki boshqa kategoriyaga ko‘chiring.")
        instance.delete()


class EduQuizViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated]
    http_method_names = ["get", "post", "patch", "delete", "head", "options"]

    def get_serializer_class(self):
        if self.action in ("create", "update", "partial_update"):
            return EduQuizWriteSerializer
        if self.action == "retrieve":
            return EduQuizDetailSerializer
        return EduQuizListSerializer

    def get_queryset(self):
        qs = (
            EduQuiz.objects.select_related("business", "category")
            .annotate(question_count=Count("questions", distinct=True))
            .prefetch_related("questions")
        )
        business_id = self.request.query_params.get("business_id")
        if business_id:
            qs = qs.filter(business_id=business_id)
        user = self.request.user
        if user.is_authenticated and user.role != User.Role.SUPER_ADMIN:
            ids = accessible_business_ids(user)
            if ids is not None:
                qs = qs.filter(business_id__in=ids)
        return qs.order_by("-updated_at", "-id")

    def perform_create(self, serializer):
        biz = serializer.validated_data["business"]
        _ensure_edu_business_access(self.request, biz.id)
        serializer.save()

    def perform_update(self, serializer):
        _ensure_edu_business_access(self.request, serializer.instance.business_id)
        serializer.save()

    def perform_destroy(self, instance):
        _ensure_edu_business_access(self.request, instance.business_id)
        instance.delete()
