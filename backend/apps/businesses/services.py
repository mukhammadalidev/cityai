from apps.accounts.models import User
from apps.businesses.models import Business, BusinessManager


def accessible_business_ids(user: User) -> set[int] | None:
    if not user.is_authenticated:
        return set()
    if user.role == User.Role.SUPER_ADMIN:
        return None
    ids = set(Business.objects.filter(owner=user).values_list("id", flat=True))
    ids.update(
        BusinessManager.objects.filter(user=user, is_active=True).values_list("business_id", flat=True)
    )
    return ids


def can_edit_business(user: User, business: Business) -> bool:
    if not user.is_authenticated:
        return False
    if user.role == User.Role.SUPER_ADMIN:
        return True
    if business.owner_id == user.id:
        return True
    return BusinessManager.objects.filter(
        business=business, user=user, is_active=True, can_manage_settings=True
    ).exists()


def can_generate_marketing(user: User, business: Business) -> bool:
    """Egasi, sozlamalar yoki katalog/mahsulot bo‘yicha ruxsatli menejer."""
    if not user.is_authenticated:
        return False
    if user.role == User.Role.SUPER_ADMIN:
        return True
    if business.owner_id == user.id:
        return True
    if can_edit_business(user, business):
        return True
    return BusinessManager.objects.filter(
        business=business, user=user, is_active=True, can_manage_items=True
    ).exists()
