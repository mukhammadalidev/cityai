from django.db import models

from apps.businesses.models import Business
from apps.catalog.models import Item
from apps.city.models import City
from apps.customers.models import TelegramCustomer


class Order(models.Model):
    class Status(models.TextChoices):
        NEW = "new", "Yangi"
        ACCEPTED = "accepted", "Qabul qilindi"
        PREPARING = "preparing", "Tayyorlanmoqda"
        DELIVERING = "delivering", "Yetkazilmoqda"
        COMPLETED = "completed", "Yakunlandi"
        CANCELLED = "cancelled", "Bekor qilindi"

    city = models.ForeignKey(City, on_delete=models.CASCADE, related_name="orders")
    business = models.ForeignKey(Business, on_delete=models.CASCADE, related_name="orders")
    customer = models.ForeignKey(
        TelegramCustomer, on_delete=models.SET_NULL, null=True, blank=True, related_name="orders"
    )
    name = models.CharField(max_length=255)
    phone = models.CharField(max_length=30)
    address = models.CharField(max_length=500, blank=True)
    total_amount = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.NEW)
    note = models.TextField(blank=True)
    metadata = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]


class OrderItem(models.Model):
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name="lines")
    item = models.ForeignKey(Item, on_delete=models.PROTECT)
    quantity = models.PositiveIntegerField(default=1)
    price = models.DecimalField(max_digits=15, decimal_places=2)
    total = models.DecimalField(max_digits=15, decimal_places=2)
