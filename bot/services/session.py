"""Django ORM session helpers for Telegram users (async wrappers)."""
import html
from typing import Any

from aiogram.types import User as TgUser
from asgiref.sync import sync_to_async
from django.db import DatabaseError, IntegrityError


def _session_for_customer(c, city):
    """Bitta mijoz uchun bitta BotSession (get_or_create bir nechta qator bo‘lsa xato bermasligi uchun)."""
    from apps.bot_engine.models import BotSession

    s = BotSession.objects.filter(customer=c).order_by("-updated_at").first()
    if not s:
        s = BotSession.objects.create(customer=c, city=city)
    return s


@sync_to_async
def ensure_customer(city_id: int, tg_user: TgUser) -> None:
    from apps.bot_engine.models import BotSession
    from apps.city.models import City
    from apps.customers.models import TelegramCustomer

    city = City.objects.get(pk=city_id)
    c, _ = TelegramCustomer.objects.update_or_create(
        city_id=city_id,
        telegram_id=str(tg_user.id),
        defaults={
            "username": tg_user.username or "",
            "first_name": tg_user.first_name or "",
            "last_name": tg_user.last_name or "",
        },
    )
    s = _session_for_customer(c, city)
    BotSession.objects.filter(pk=s.pk).update(city=city)


@sync_to_async
def set_category(tg_user_id: int, city_id: int, category_id: int) -> None:
    from apps.city.models import City
    from apps.customers.models import TelegramCustomer
    from apps.service_categories.models import ServiceCategory

    city = City.objects.get(pk=city_id)
    c = TelegramCustomer.objects.filter(telegram_id=str(tg_user_id), city_id=city_id).first()
    if not c:
        return
    cat = ServiceCategory.objects.filter(pk=category_id).first()
    s = _session_for_customer(c, city)
    s.city = city
    s.selected_category = cat
    s.selected_business = None
    s.state = "category"
    s.save(update_fields=["city", "selected_category", "selected_business", "state"])


@sync_to_async
def set_business(tg_user_id: int, city_id: int, business_id: int) -> None:
    from apps.businesses.models import Business
    from apps.city.models import City
    from apps.customers.models import TelegramCustomer

    city = City.objects.get(pk=city_id)
    c = TelegramCustomer.objects.filter(telegram_id=str(tg_user_id), city_id=city_id).first()
    if not c:
        return
    b = Business.objects.filter(pk=business_id).first()
    if not b:
        return
    s = _session_for_customer(c, city)
    s.city = city
    s.selected_business = b
    s.state = "business"
    s.save(update_fields=["city", "selected_business", "state"])


@sync_to_async
def get_city_for_user(tg_user_id: int) -> int | None:
    from apps.bot_engine.models import BotSession
    from apps.customers.models import TelegramCustomer

    c = TelegramCustomer.objects.filter(telegram_id=str(tg_user_id)).order_by("-last_seen").first()
    if not c:
        return None
    s = BotSession.objects.filter(customer=c).order_by("-updated_at").first()
    return s.city_id if s else c.city_id


@sync_to_async
def list_businesses(category_id: int) -> list[dict]:
    from apps.businesses.models import Business

    qs = (
        Business.objects.filter(category_id=category_id, status=Business.Status.ACTIVE)
        .order_by("-is_featured", "-rating", "name")
        .values("id", "name", "is_featured", "rating")[:40]
    )
    return list(qs)


@sync_to_async
def format_items_for_user(tg_user_id: int) -> list[str]:
    from apps.bot_engine.models import BotSession
    from apps.catalog.models import Item
    from apps.customers.models import TelegramCustomer

    c = TelegramCustomer.objects.filter(telegram_id=str(tg_user_id)).order_by("-last_seen").first()
    if not c:
        return []
    s = BotSession.objects.filter(customer=c).order_by("-updated_at").first()
    if not s or not s.selected_business_id:
        return []
    lines = []
    for it in Item.objects.filter(business_id=s.selected_business_id, status=Item.Status.ACTIVE)[:15]:
        lines.append(
            f"▫️ <b>{html.escape(it.title)}</b>\n💰 {it.price} {it.currency}\n"
            f"{html.escape((it.description or '')[:200])}"
        )
    return lines


@sync_to_async
def get_selected_business_info(tg_user_id: int) -> dict | None:
    from apps.bot_engine.models import BotSession
    from apps.customers.models import TelegramCustomer

    c = TelegramCustomer.objects.filter(telegram_id=str(tg_user_id)).order_by("-last_seen").first()
    if not c:
        return None
    s = (
        BotSession.objects.filter(customer=c)
        .select_related("selected_business")
        .order_by("-updated_at")
        .first()
    )
    if not s or not s.selected_business:
        return None
    b = s.selected_business
    return {
        "name": b.name,
        "address": b.address,
        "working_hours": b.working_hours,
        "phone": b.phone,
        "telegram_admin_chat_id": b.telegram_admin_chat_id,
    }


@sync_to_async
def create_lead(telegram_user: TgUser, name: str, phone: str, msg: str) -> tuple[bool, str]:
    from apps.bot_engine.models import BotSession
    from apps.businesses.models import Business
    from apps.customers.models import TelegramCustomer
    from apps.leads.models import Lead

    try:
        c = TelegramCustomer.objects.filter(telegram_id=str(telegram_user.id)).order_by("-last_seen").first()
        if not c:
            return False, "Mijoz topilmadi. /start buyrug‘ini bosing."
        s = (
            BotSession.objects.filter(customer=c)
            .select_related("selected_business", "selected_category")
            .order_by("-updated_at")
            .first()
        )
        if not s or not s.selected_business_id:
            return False, "Avval provayderni tanlang (kategoriya va biznes)."
        b = Business.objects.filter(pk=s.selected_business_id).first()
        if not b:
            return False, "Tanlangan biznes topilmadi. /start orqali qayta tanlang."
        Lead.objects.create(
            city_id=s.city_id,
            business=b,
            customer=c,
            category=s.selected_category,
            lead_type=Lead.LeadType.CONTACT,
            name=name or "—",
            phone=phone or "—",
            message=msg or "",
            source=Lead.Source.TELEGRAM_BOT,
        )
        return True, b.telegram_admin_chat_id or ""
    except (IntegrityError, DatabaseError):
        return False, "Ma’lumotlar bazasiga yozib bo‘lmadi. Keyinroq qayta urinib ko‘ring."
    except Exception:
        return False, "Texnik xatolik yuz berdi. Bir ozdan so‘ng qayta urinib ko‘ring."


@sync_to_async
def build_ai_context(tg_user_id: int) -> dict[str, Any] | None:
    from apps.bot_engine.models import BotSession
    from apps.catalog.models import Item
    from apps.customers.models import TelegramCustomer
    from apps.knowledge.models import KnowledgeBase

    c = TelegramCustomer.objects.filter(telegram_id=str(tg_user_id)).order_by("-last_seen").first()
    if not c:
        return None
    s = (
        BotSession.objects.filter(customer=c)
        .select_related("selected_business")
        .order_by("-updated_at")
        .first()
    )
    if not s or not s.selected_business_id:
        return None
    b = s.selected_business
    items = list(
        Item.objects.filter(business=b, status=Item.Status.ACTIVE).values("title", "price", "description")[:20]
    )
    knowledge = list(KnowledgeBase.objects.filter(business=b, is_active=True).values("title", "content")[:15])
    return {
        "city_id": s.city_id,
        "business_id": b.id,
        "customer_id": c.id,
        "business_type": b.business_type,
        "business_name": b.name,
        "business_info": f"{b.description}\nManzil: {b.address}\nTel: {b.phone}\nIsh vaqti: {b.working_hours}",
        "items": items,
        "knowledge_base": knowledge,
    }


@sync_to_async
def log_ai_message(city_id, business_id, customer_id, user_text: str, reply: str) -> None:
    from apps.analytics.models import AIUsage
    from apps.customers.models import TelegramCustomer

    try:
        cust = TelegramCustomer.objects.filter(pk=customer_id).first() if customer_id else None
        AIUsage.objects.create(
            city_id=city_id,
            business_id=business_id,
            customer=cust,
            message=user_text[:4000],
            response=reply[:4000],
            total_tokens=len(user_text) + len(reply),
        )
    except Exception:
        pass
