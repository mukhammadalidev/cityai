"""Obuna rejasi bo‘yicha yordamchi funksiyalar."""

from __future__ import annotations

from apps.accounts.models import User
from apps.catalog.models import Item

from .models import BusinessSubscription, SubscriptionPlan

_ACTIVE_SUB_STATUSES = (
    BusinessSubscription.Status.TRIAL,
    BusinessSubscription.Status.ACTIVE,
    BusinessSubscription.Status.OVERDUE,
)


def get_plan_for_business(business_id: int) -> SubscriptionPlan | None:
    sub = (
        BusinessSubscription.objects.filter(business_id=business_id, status__in=_ACTIVE_SUB_STATUSES)
        .select_related("plan")
        .order_by("-created_at")
        .first()
    )
    return sub.plan if sub else None


def _is_super(user) -> bool:
    return bool(getattr(user, "is_authenticated", False) and getattr(user, "role", None) == User.Role.SUPER_ADMIN)


def require_plan_feature(business_id: int, user, attr: str, message: str) -> None:
    """Rejada `attr` True bo‘lmasa yoki obuna bo‘lmasa 403 (super admin cheksiz)."""
    from rest_framework.exceptions import PermissionDenied

    if _is_super(user):
        return
    plan = get_plan_for_business(business_id)
    if not plan or not getattr(plan, attr, False):
        raise PermissionDenied(message)


def assert_under_item_limit(business_id: int, user) -> None:
    """Yangi Item qo‘shishdan oldin max_items tekshiruvi."""
    from rest_framework.exceptions import PermissionDenied

    if _is_super(user):
        return
    plan = get_plan_for_business(business_id)
    if not plan:
        raise PermissionDenied("Faol obuna topilmadi.")
    n = Item.objects.filter(business_id=business_id).count()
    if n >= plan.max_items:
        raise PermissionDenied(
            f"Pozitsiyalar limiti ({plan.max_items}) tugadi. Billing sahifasidan tarifni yangilang."
        )
