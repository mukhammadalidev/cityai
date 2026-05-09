from django.utils import timezone

from catalog.models import Item
from leads.models import Lead
from knowledge.models import KnowledgeBase

from .models import BusinessSubscription


def get_subscription(business_id):
    return BusinessSubscription.objects.filter(business_id=business_id).select_related("plan").first()


def check_item_limit(business_id):
    sub = get_subscription(business_id)
    if not sub:
        return True, ""
    count = Item.objects.filter(business_id=business_id).count()
    if count >= sub.plan.max_items:
        return False, "Tarif limiti tugadi: itemlar sonini oshirish uchun tarifni yangilang."
    return True, ""


def check_lead_limit(business_id):
    sub = get_subscription(business_id)
    if not sub:
        return True, ""
    month = timezone.now().strftime("%Y-%m")
    count = Lead.objects.filter(business_id=business_id, created_at__startswith=month).count()
    if count >= sub.plan.max_leads_per_month:
        return False, "Oylik lead limiti tugadi. Iltimos tarifni yangilang."
    return True, ""


def check_knowledge_limit(business_id):
    sub = get_subscription(business_id)
    if not sub:
        return True, ""
    count = KnowledgeBase.objects.filter(business_id=business_id).count()
    if count >= sub.plan.max_knowledge_entries:
        return False, "Knowledge base limiti tugadi."
    return True, ""
