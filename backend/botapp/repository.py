"""Bot uchun Django ORM operatsiyalari (sync, `asyncio.to_thread` orqali chaqiriladi)."""

from __future__ import annotations

import datetime as dt
from decimal import Decimal
from typing import Any

from apps.bookings.models import Booking
from apps.businesses.models import Business
from apps.catalog.models import Item
from apps.customers.models import TelegramCustomer
from apps.leads.models import Lead
from apps.orders.models import Order, OrderItem


def fetch_items_for_business(business_id: int, category_idx: int | None) -> list[dict]:
    qs = Item.objects.filter(business_id=business_id, status=Item.Status.ACTIVE)
    if category_idx:
        names = sorted(
            set(
                Item.objects.filter(business_id=business_id, status=Item.Status.ACTIVE)
                .exclude(category_name="")
                .values_list("category_name", flat=True)
            )
        )
        if 0 < category_idx <= len(names):
            qs = qs.filter(category_name=names[category_idx - 1])
    return list(
        qs.order_by("title")[:60].values(
            "id",
            "title",
            "price",
            "currency",
            "description",
            "metadata",
            "category_name",
        )
    )


def get_business_contact_row(business_id: int) -> dict | None:
    return Business.objects.filter(pk=business_id, status=Business.Status.ACTIVE).values(
        "name", "address", "phone", "working_hours"
    ).first()


def get_item_row(item_id: int, business_id: int) -> dict | None:
    row = (
        Item.objects.filter(pk=item_id, business_id=business_id, status=Item.Status.ACTIVE)
        .values("id", "title", "price", "currency", "description", "metadata", "category_name")
        .first()
    )
    return row


def get_business_city_id(business_id: int) -> int | None:
    return Business.objects.filter(pk=business_id).values_list("city_id", flat=True).first()


def ensure_customer(
    business_id: int,
    telegram_user_id: int,
    *,
    phone: str | None = None,
    username: str = "",
    first_name: str = "",
    last_name: str = "",
) -> TelegramCustomer | None:
    city_id = get_business_city_id(business_id)
    if not city_id:
        return None
    customer, _ = TelegramCustomer.objects.update_or_create(
        city_id=city_id,
        telegram_id=str(telegram_user_id),
        defaults={
            "username": username or "",
            "first_name": first_name or "",
            "last_name": last_name or "",
        },
    )
    if phone and customer.phone != phone:
        customer.phone = phone
        customer.save(update_fields=["phone"])
    return customer


def create_lead_record(
    *,
    business_id: int,
    telegram_user_id: int,
    lead_type: str,
    name: str,
    phone: str,
    message: str = "",
    item_id: int | None = None,
    metadata: dict[str, Any] | None = None,
    username: str = "",
    first_name: str = "",
    last_name: str = "",
) -> Lead | None:
    business = Business.objects.select_related("city").filter(pk=business_id).first()
    if not business:
        return None
    customer = ensure_customer(
        business_id,
        telegram_user_id,
        phone=phone,
        username=username,
        first_name=first_name,
        last_name=last_name,
    )
    if not customer:
        return None
    item = None
    if item_id:
        item = Item.objects.filter(pk=item_id, business_id=business_id).first()
    return Lead.objects.create(
        city_id=business.city_id,
        business_id=business.id,
        customer=customer,
        item=item,
        lead_type=lead_type,
        name=name.strip(),
        phone=phone.strip(),
        message=message or "",
        status=Lead.Status.NEW,
        source=Lead.Source.TELEGRAM_BOT,
        metadata=metadata or {},
    )


def create_booking_record(
    *,
    business_id: int,
    telegram_user_id: int,
    booking_type: str,
    name: str,
    phone: str,
    preferred_date: dt.date,
    preferred_time: dt.time,
    note: str = "",
    guests_count: int | None = None,
    item_id: int | None = None,
    metadata: dict[str, Any] | None = None,
    username: str = "",
    first_name: str = "",
    last_name: str = "",
) -> Booking | None:
    business = Business.objects.select_related("city").filter(pk=business_id).first()
    if not business:
        return None
    customer = ensure_customer(
        business_id,
        telegram_user_id,
        phone=phone,
        username=username,
        first_name=first_name,
        last_name=last_name,
    )
    if not customer:
        return None
    item = None
    if item_id:
        item = Item.objects.filter(pk=item_id, business_id=business_id).first()
    booking = Booking.objects.create(
        city_id=business.city_id,
        business_id=business.id,
        customer=customer,
        item=item,
        booking_type=booking_type,
        name=name.strip(),
        phone=phone.strip(),
        preferred_date=preferred_date,
        preferred_time=preferred_time,
        guests_count=guests_count,
        note=note or "",
        status=Booking.Status.NEW,
        metadata=metadata or {},
    )
    return Booking.objects.select_related("business", "customer", "item").filter(pk=booking.pk).first()


def create_order_record(
    *,
    business_id: int,
    telegram_user_id: int,
    name: str,
    phone: str,
    address: str = "",
    note: str = "",
    metadata: dict[str, Any] | None = None,
    lines: list[dict[str, Any]],
    username: str = "",
    first_name: str = "",
    last_name: str = "",
) -> Order | None:
    """lines: [{\"item_id\": int, \"quantity\": int}] — narx pozitsiyadan olinadi."""
    business = Business.objects.select_related("city").filter(pk=business_id).first()
    if not business:
        return None
    customer = ensure_customer(
        business_id,
        telegram_user_id,
        phone=phone,
        username=username,
        first_name=first_name,
        last_name=last_name,
    )
    if not customer:
        return None
    total = Decimal("0")
    resolved: list[tuple[Item, int, Decimal]] = []
    for line in lines:
        item_id = int(line["item_id"])
        qty = max(1, int(line.get("quantity") or 1))
        item = Item.objects.filter(pk=item_id, business_id=business_id).first()
        if not item:
            continue
        price = item.price or Decimal("0")
        line_total = price * qty
        total += line_total
        resolved.append((item, qty, price))
    if not resolved:
        return None
    order = Order.objects.create(
        city_id=business.city_id,
        business_id=business.id,
        customer=customer,
        name=name.strip(),
        phone=phone.strip(),
        address=address or "",
        total_amount=total,
        status=Order.Status.NEW,
        note=note or "",
        metadata=metadata or {},
    )
    for item, qty, price in resolved:
        OrderItem.objects.create(
            order=order,
            item=item,
            quantity=qty,
            price=price,
            total=price * qty,
        )
    return Order.objects.select_related("business", "customer").prefetch_related("lines__item").get(pk=order.pk)
