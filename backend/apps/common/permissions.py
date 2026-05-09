from rest_framework import permissions

from apps.accounts.models import User


class IsSuperAdmin(permissions.BasePermission):
    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and getattr(request.user, "role", None) == User.Role.SUPER_ADMIN
        )


class IsBusinessOwnerOrSuper(permissions.BasePermission):
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        return request.user.role in (User.Role.SUPER_ADMIN, User.Role.BUSINESS_OWNER)


def user_manages_business(user, business) -> bool:
    if not user or not user.is_authenticated:
        return False
    if user.role == User.Role.SUPER_ADMIN:
        return True
    if business.owner_id == user.id:
        return True
    from apps.businesses.models import BusinessManager

    return BusinessManager.objects.filter(
        business=business, user=user, is_active=True, can_manage_settings=True
    ).exists()
