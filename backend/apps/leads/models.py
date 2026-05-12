from django.conf import settings
from django.db import models

from apps.businesses.models import Business
from apps.catalog.models import Item
from apps.city.models import City
from apps.customers.models import TelegramCustomer
from apps.service_categories.models import ServiceCategory


class Lead(models.Model):
    class LeadType(models.TextChoices):
        GENERAL = "general", "Umumiy"
        CAR_INTEREST = "car_interest", "Mashina qiziqishi"
        CREDIT = "credit", "Kredit"
        TEST_DRIVE = "test_drive", "Test drive"
        TRADE_IN = "trade_in", "Trade-in"
        CONTACT = "contact", "Aloqa"
        COURSE_REGISTER = "course_register", "Kursga yozilish"
        ORDER = "order", "Buyurtma"
        PRICE_QUESTION = "price_question", "Narx haqida"
        DELIVERY_QUESTION = "delivery_question", "Yetkazib berish"
        PAYMENT_QUESTION = "payment_question", "To‘lov"
        PROPERTY_INTEREST = "property_interest", "Uy qiziqishi"
        PRODUCT_QUESTION = "product_question", "Mahsulot savoli"
        MEMBERSHIP_REQUEST = "membership_request", "Abonement arizasi"
        CUSTOM = "custom", "Boshqa"

    class Status(models.TextChoices):
        NEW = "new", "Yangi"
        CONTACTED = "contacted", "Aloqa qilindi"
        INTERESTED = "interested", "Qiziqish"
        NEGOTIATION = "negotiation", "Musobaqa"
        COMPLETED = "completed", "Yakunlangan"
        WON = "won", "Uttim"
        LOST = "lost", "Yutqazildi"
        CANCELLED = "cancelled", "Bekor qilindi"

    class Priority(models.TextChoices):
        LOW = "low", "Past"
        MEDIUM = "medium", "O‘rta"
        HIGH = "high", "Yuqori"

    class Source(models.TextChoices):
        TELEGRAM_BOT = "telegram_bot", "Telegram bot"
        PUBLIC_PAGE = "public_page", "Ochiq sahifa"
        MANUAL = "manual", "Qo‘lda"
        INSTAGRAM = "instagram", "Instagram"

    city = models.ForeignKey(City, on_delete=models.CASCADE, related_name="leads")
    business = models.ForeignKey(Business, on_delete=models.CASCADE, related_name="leads")
    customer = models.ForeignKey(
        TelegramCustomer,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="leads",
    )
    item = models.ForeignKey(Item, on_delete=models.SET_NULL, null=True, blank=True, related_name="leads")
    category = models.ForeignKey(
        ServiceCategory, on_delete=models.SET_NULL, null=True, blank=True, related_name="leads"
    )
    lead_type = models.CharField(max_length=30, choices=LeadType.choices, default=LeadType.GENERAL)
    name = models.CharField(max_length=255)
    phone = models.CharField(max_length=30)
    message = models.TextField(blank=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.NEW)
    priority = models.CharField(max_length=10, choices=Priority.choices, default=Priority.MEDIUM)
    source = models.CharField(max_length=20, choices=Source.choices, default=Source.TELEGRAM_BOT)
    assigned_to = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="assigned_leads",
    )
    metadata = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
