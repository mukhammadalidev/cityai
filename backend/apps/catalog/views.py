from django.db.models import Q
from rest_framework import permissions, viewsets
from rest_framework.exceptions import PermissionDenied

from apps.accounts.models import User
from apps.businesses.models import Business
from apps.businesses.services import accessible_business_ids
from apps.subscriptions.services import assert_under_item_limit, get_plan_for_business

from .models import Item
from .serializers import ItemSerializer


class ItemViewSet(viewsets.ModelViewSet):
    queryset = Item.objects.select_related("business").all()
    serializer_class = ItemSerializer

    @staticmethod
    def _assert_edu_materials_allowed(business: Business, kind: str) -> None:
        if business.business_type != Business.BusinessType.EDUCATION_CENTER:
            return
        if kind not in (Item.EducationCatalogKind.BOOK, Item.EducationCatalogKind.PRODUCT):
            return
        plan = get_plan_for_business(business.id)
        if not plan or not plan.has_edu_materials:
            raise PermissionDenied(
                "Kitob va mahsulotlar (Materiallar) joriy tarifda yo‘q. Billing sahifasidan tarifni yangilang."
            )

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
            qs = qs.filter(Q(title__icontains=search) | Q(description__icontains=search))

        eck = self.request.query_params.get("education_catalog_kind")
        if eck == "materials":
            qs = qs.filter(
                education_catalog_kind__in=(
                    Item.EducationCatalogKind.BOOK,
                    Item.EducationCatalogKind.PRODUCT,
                )
            )
        elif eck in (Item.EducationCatalogKind.COURSE, Item.EducationCatalogKind.BOOK, Item.EducationCatalogKind.PRODUCT):
            qs = qs.filter(education_catalog_kind=eck)

        user = self.request.user
        ids = accessible_business_ids(user) if user.is_authenticated else None
        bid = int(business_id) if business_id and str(business_id).isdigit() else None
        owner_sees_all = (
            user.is_authenticated
            and bid is not None
            and ids is not None
            and bid in ids
            and self.action in ("list", "retrieve")
        )
        if not (
            user.is_authenticated and user.role == User.Role.SUPER_ADMIN
        ) and not owner_sees_all:
            qs = qs.filter(status=Item.Status.ACTIVE)

        if self.action in ("create", "update", "partial_update", "destroy") and ids is not None:
            qs = qs.filter(business_id__in=ids)
        return qs.order_by("-created_at")

    def perform_create(self, serializer):
        bid = int(serializer.validated_data["business"].id)
        biz = serializer.validated_data["business"]
        kind = serializer.validated_data.get("education_catalog_kind") or Item.EducationCatalogKind.COURSE
        assert_under_item_limit(bid, self.request.user)
        if self.request.user.role != User.Role.SUPER_ADMIN:
            self._assert_edu_materials_allowed(biz, kind)
        if self.request.user.role == User.Role.SUPER_ADMIN:
            serializer.save()
            return
        ids = accessible_business_ids(self.request.user)
        if not ids or bid not in ids:
            raise PermissionDenied("Bu biznes uchun mahsulot qo‘sha olmaysiz.")
        serializer.save()

    def perform_update(self, serializer):
        instance = serializer.instance
        biz = serializer.validated_data.get("business", instance.business)
        kind = serializer.validated_data.get("education_catalog_kind", instance.education_catalog_kind)
        if self.request.user.role != User.Role.SUPER_ADMIN:
            self._assert_edu_materials_allowed(biz, kind)
        if self.request.user.role == User.Role.SUPER_ADMIN:
            serializer.save()
            return
        ids = accessible_business_ids(self.request.user)
        if not ids or serializer.instance.business_id not in ids:
            raise PermissionDenied("Tahrirlashga ruxsat yo‘q.")
        serializer.save()

    def perform_destroy(self, instance):
        if self.request.user.role == User.Role.SUPER_ADMIN:
            instance.delete()
            return
        ids = accessible_business_ids(self.request.user)
        if not ids or instance.business_id not in ids:
            raise PermissionDenied("O‘chirishga ruxsat yo‘q.")
        instance.delete()
