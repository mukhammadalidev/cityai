from django.db.models import Q
from rest_framework import permissions, viewsets

from apps.accounts.models import User
from apps.businesses.services import accessible_business_ids
from apps.subscriptions.services import require_plan_feature

from .models import KnowledgeBase
from .serializers import KnowledgeBaseSerializer


class KnowledgeBaseViewSet(viewsets.ModelViewSet):
    queryset = KnowledgeBase.objects.select_related("business").all()
    serializer_class = KnowledgeBaseSerializer

    def get_permissions(self):
        if self.action in ("list", "retrieve"):
            return [permissions.AllowAny()]
        return [permissions.IsAuthenticated()]

    def get_queryset(self):
        qs = super().get_queryset()
        business_id = self.request.query_params.get("business_id")
        if business_id:
            qs = qs.filter(business_id=business_id)
        search = self.request.query_params.get("search")
        if search:
            qs = qs.filter(Q(title__icontains=search) | Q(content__icontains=search))
        if not self.request.user.is_authenticated or self.request.user.role != User.Role.SUPER_ADMIN:
            qs = qs.filter(is_active=True)
        user = self.request.user
        if user.is_authenticated and user.role != User.Role.SUPER_ADMIN and self.action not in (
            "list",
            "retrieve",
        ):
            ids = accessible_business_ids(user)
            if ids is not None:
                qs = qs.filter(business_id__in=ids)
        return qs.order_by("-updated_at")

    def perform_create(self, serializer):
        biz = serializer.validated_data["business"]
        require_plan_feature(
            biz.id,
            self.request.user,
            "has_ai_chat",
            "AI bilim bazasi joriy tarifda yo‘q. Billing sahifasidan tarifni yangilang.",
        )
        serializer.save()

    def perform_update(self, serializer):
        biz = serializer.validated_data.get("business", serializer.instance.business)
        require_plan_feature(
            biz.id,
            self.request.user,
            "has_ai_chat",
            "AI bilim bazasi joriy tarifda yo‘q.",
        )
        serializer.save()

    def perform_destroy(self, instance):
        require_plan_feature(
            instance.business_id,
            self.request.user,
            "has_ai_chat",
            "AI bilim bazasi joriy tarifda yo‘q.",
        )
        instance.delete()
