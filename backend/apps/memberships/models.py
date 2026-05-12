from decimal import Decimal

from django.db import models
from django.utils import timezone

from apps.businesses.models import Business
from apps.catalog.models import Item


class BusinessClient(models.Model):
    class ClientType(models.TextChoices):
        DAILY = "daily", "Kunlik"
        MONTHLY = "monthly", "Oylik"

    class Status(models.TextChoices):
        ACTIVE = "active", "Faol"
        PAUSED = "paused", "To'xtatilgan"
        ARCHIVED = "archived", "Arxiv"

    class Gender(models.TextChoices):
        UNKNOWN = "unknown", "Ko'rsatilmagan"
        MALE = "male", "Erkak"
        FEMALE = "female", "Ayol"

    business = models.ForeignKey(Business, on_delete=models.CASCADE, related_name="clients")
    full_name = models.CharField(max_length=255)
    phone = models.CharField(max_length=30, blank=True)
    telegram_username = models.CharField(max_length=100, blank=True)
    gender = models.CharField(max_length=10, choices=Gender.choices, default=Gender.UNKNOWN, blank=True)
    birth_date = models.DateField(null=True, blank=True)
    client_type = models.CharField(
        max_length=20, choices=ClientType.choices, default=ClientType.MONTHLY, db_index=True
    )
    status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.ACTIVE, db_index=True
    )
    note = models.TextField(blank=True)
    metadata = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at", "id"]
        indexes = [
            models.Index(fields=["business", "client_type"]),
            models.Index(fields=["business", "status"]),
        ]

    def __str__(self) -> str:
        return f"{self.full_name} ({self.get_client_type_display()})"


class ClientMembership(models.Model):
    class Status(models.TextChoices):
        ACTIVE = "active", "Faol"
        EXPIRING = "expiring", "Muddati tugayapti"
        EXPIRED = "expired", "Muddati tugagan"
        CANCELLED = "cancelled", "Bekor qilingan"

    class PaymentStatus(models.TextChoices):
        UNPAID = "unpaid", "To'lanmagan"
        PARTIAL = "partial", "Qisman to'langan"
        PAID = "paid", "To'langan"

    business = models.ForeignKey(Business, on_delete=models.CASCADE, related_name="memberships")
    client = models.ForeignKey(BusinessClient, on_delete=models.CASCADE, related_name="memberships")
    item = models.ForeignKey(
        Item, on_delete=models.SET_NULL, related_name="memberships", null=True, blank=True
    )
    title = models.CharField(max_length=255, blank=True)
    start_date = models.DateField(default=timezone.localdate)
    end_date = models.DateField(null=True, blank=True)
    expected_amount = models.DecimalField(max_digits=15, decimal_places=2, default=Decimal("0"))
    paid_amount = models.DecimalField(max_digits=15, decimal_places=2, default=Decimal("0"))
    currency = models.CharField(max_length=10, default="UZS")
    sessions_total = models.PositiveIntegerField(default=0)
    sessions_used = models.PositiveIntegerField(default=0)
    status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.ACTIVE, db_index=True
    )
    payment_status = models.CharField(
        max_length=20, choices=PaymentStatus.choices, default=PaymentStatus.UNPAID, db_index=True
    )
    note = models.TextField(blank=True)
    metadata = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-start_date", "-id"]
        indexes = [
            models.Index(fields=["business", "status"]),
            models.Index(fields=["business", "payment_status"]),
            models.Index(fields=["client", "status"]),
        ]

    def __str__(self) -> str:
        return f"{self.client.full_name} — {self.title or (self.item.title if self.item_id else '')}"

    @property
    def debt_amount(self) -> Decimal:
        debt = (self.expected_amount or Decimal("0")) - (self.paid_amount or Decimal("0"))
        return debt if debt > 0 else Decimal("0")

    def recalc_payment_status(self) -> None:
        expected = self.expected_amount or Decimal("0")
        paid = self.paid_amount or Decimal("0")
        if expected <= 0:
            self.payment_status = self.PaymentStatus.PAID
        elif paid <= 0:
            self.payment_status = self.PaymentStatus.UNPAID
        elif paid >= expected:
            self.payment_status = self.PaymentStatus.PAID
        else:
            self.payment_status = self.PaymentStatus.PARTIAL


class ClientPayment(models.Model):
    class Method(models.TextChoices):
        CASH = "cash", "Naqd"
        CARD = "card", "Karta"
        TRANSFER = "transfer", "O'tkazma"
        OTHER = "other", "Boshqa"

    business = models.ForeignKey(Business, on_delete=models.CASCADE, related_name="client_payments")
    client = models.ForeignKey(BusinessClient, on_delete=models.CASCADE, related_name="payments")
    membership = models.ForeignKey(
        ClientMembership, on_delete=models.SET_NULL, related_name="payments", null=True, blank=True
    )
    amount = models.DecimalField(max_digits=15, decimal_places=2, default=Decimal("0"))
    currency = models.CharField(max_length=10, default="UZS")
    payment_date = models.DateField(default=timezone.localdate)
    method = models.CharField(max_length=20, choices=Method.choices, default=Method.CASH)
    note = models.CharField(max_length=255, blank=True)
    metadata = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-payment_date", "-id"]
        indexes = [
            models.Index(fields=["business", "payment_date"]),
            models.Index(fields=["client"]),
        ]

    def __str__(self) -> str:
        return f"{self.client.full_name} {self.amount} {self.currency}"


class ClientAttendance(models.Model):
    business = models.ForeignKey(Business, on_delete=models.CASCADE, related_name="attendances")
    client = models.ForeignKey(BusinessClient, on_delete=models.CASCADE, related_name="attendances")
    membership = models.ForeignKey(
        ClientMembership,
        on_delete=models.SET_NULL,
        related_name="attendances",
        null=True,
        blank=True,
    )
    visit_date = models.DateField(default=timezone.localdate)
    visit_time = models.TimeField(null=True, blank=True)
    client_type = models.CharField(
        max_length=20,
        choices=BusinessClient.ClientType.choices,
        default=BusinessClient.ClientType.MONTHLY,
        db_index=True,
    )
    amount_charged = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        default=Decimal("0"),
        help_text="Kunlik klient uchun to'lov summasi (oylik klientda 0 bo'lishi mumkin).",
    )
    currency = models.CharField(max_length=10, default="UZS")
    note = models.CharField(max_length=255, blank=True)
    metadata = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-visit_date", "-visit_time", "-id"]
        indexes = [
            models.Index(fields=["business", "visit_date"]),
            models.Index(fields=["client", "visit_date"]),
        ]

    def __str__(self) -> str:
        return f"{self.client.full_name} @ {self.visit_date}"
