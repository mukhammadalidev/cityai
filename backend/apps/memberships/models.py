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
        INACTIVE = "inactive", "Nofaol"
        FROZEN = "frozen", "Muzlatilgan"
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
    photo = models.ImageField(upload_to="fitness/members/", null=True, blank=True)
    emergency_contact = models.CharField(max_length=255, blank=True)
    joined_date = models.DateField(default=timezone.localdate)
    client_type = models.CharField(
        max_length=20, choices=ClientType.choices, default=ClientType.MONTHLY, db_index=True
    )
    status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.ACTIVE, db_index=True
    )
    note = models.TextField(blank=True, help_text="Ichki eslatma (faqat admin ko'radi).")
    announcement = models.TextField(
        blank=True,
        help_text="Klient kabinetida ko'rinadigan xabar (eslatma, e'lon, tilak).",
    )
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
    class PlanType(models.TextChoices):
        MONTH_1 = "1_month", "1 oy"
        MONTH_3 = "3_month", "3 oy"
        MONTH_6 = "6_month", "6 oy"
        MONTH_12 = "12_month", "12 oy"
        INDIVIDUAL = "individual", "Individual"

    class Status(models.TextChoices):
        ACTIVE = "active", "Faol"
        EXPIRING = "expiring", "Muddati tugayapti"
        EXPIRED = "expired", "Muddati tugagan"
        FROZEN = "frozen", "Muzlatilgan"
        CANCELLED = "cancelled", "Bekor qilingan"

    class PaymentStatus(models.TextChoices):
        UNPAID = "unpaid", "To'lanmagan"
        PARTIAL = "partial", "Qisman to'langan"
        PAID = "paid", "To'langan"
        DEBT = "debt", "Qarzdor"

    business = models.ForeignKey(Business, on_delete=models.CASCADE, related_name="memberships")
    client = models.ForeignKey(BusinessClient, on_delete=models.CASCADE, related_name="memberships")
    item = models.ForeignKey(
        Item, on_delete=models.SET_NULL, related_name="memberships", null=True, blank=True
    )
    plan_type = models.CharField(
        max_length=20, choices=PlanType.choices, default=PlanType.MONTH_1, blank=True
    )
    plan_name = models.CharField(max_length=255, blank=True, help_text="Ko'rinadigan abonement nomi")
    title = models.CharField(max_length=255, blank=True)
    start_date = models.DateField(default=timezone.localdate)
    end_date = models.DateField(null=True, blank=True)
    price = models.DecimalField(
        max_digits=15, decimal_places=2, default=Decimal("0"), help_text="Abonement narxi"
    )
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
        return f"{self.client.full_name} — {self.display_title}"

    @property
    def display_title(self) -> str:
        return self.plan_name or self.title or (self.item.title if self.item_id else "Abonement")

    @property
    def debt_amount(self) -> Decimal:
        debt = (self.expected_amount or Decimal("0")) - (self.paid_amount or Decimal("0"))
        return debt if debt > 0 else Decimal("0")

    @property
    def remaining_days(self) -> int | None:
        if not self.end_date:
            return None
        today = timezone.localdate()
        return (self.end_date - today).days

    def sync_status_from_dates(self) -> None:
        today = timezone.localdate()
        if self.status == self.Status.CANCELLED or self.status == self.Status.FROZEN:
            return
        if self.end_date and self.end_date < today:
            self.status = self.Status.EXPIRED
        elif self.end_date and self.remaining_days is not None and self.remaining_days <= 7:
            self.status = self.Status.EXPIRING
        elif self.status == self.Status.EXPIRED and self.end_date and self.end_date >= today:
            self.status = self.Status.ACTIVE

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
        if self.debt_amount > 0 and self.payment_status != self.PaymentStatus.PAID:
            self.payment_status = self.PaymentStatus.DEBT


class ClientPayment(models.Model):
    class Method(models.TextChoices):
        CASH = "cash", "Naqd"
        CARD = "card", "Karta"
        TRANSFER = "transfer", "O'tkazma"
        CLICK = "click", "Click"
        PAYME = "payme", "Payme"
        OTHER = "other", "Boshqa"

    class Status(models.TextChoices):
        PAID = "paid", "To'langan"
        PARTIAL = "partial", "Qisman"
        DEBT = "debt", "Qarz"

    business = models.ForeignKey(Business, on_delete=models.CASCADE, related_name="client_payments")
    client = models.ForeignKey(BusinessClient, on_delete=models.CASCADE, related_name="payments")
    membership = models.ForeignKey(
        ClientMembership, on_delete=models.SET_NULL, related_name="payments", null=True, blank=True
    )
    amount = models.DecimalField(max_digits=15, decimal_places=2, default=Decimal("0"))
    currency = models.CharField(max_length=10, default="UZS")
    payment_date = models.DateField(default=timezone.localdate)
    method = models.CharField(max_length=20, choices=Method.choices, default=Method.CASH)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PAID)
    comment = models.CharField(max_length=500, blank=True)
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
    class Status(models.TextChoices):
        PRESENT = "present", "Keldi"
        ABSENT = "absent", "Kelmadi"

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
    check_in_time = models.DateTimeField(null=True, blank=True)
    check_out_time = models.DateTimeField(null=True, blank=True)
    status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.PRESENT, db_index=True
    )
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


class FitnessTrainer(models.Model):
    class SalaryType(models.TextChoices):
        FIXED = "fixed", "Belgilangan"
        PERCENT = "percent", "Foiz"

    class Status(models.TextChoices):
        ACTIVE = "active", "Faol"
        INACTIVE = "inactive", "Nofaol"

    business = models.ForeignKey(Business, on_delete=models.CASCADE, related_name="fitness_trainers")
    full_name = models.CharField(max_length=255)
    phone = models.CharField(max_length=30, blank=True)
    specialization = models.CharField(max_length=255, blank=True)
    photo = models.ImageField(upload_to="fitness/trainers/", null=True, blank=True)
    salary_type = models.CharField(
        max_length=20, choices=SalaryType.choices, default=SalaryType.FIXED
    )
    salary_amount = models.DecimalField(max_digits=15, decimal_places=2, default=Decimal("0"))
    status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.ACTIVE, db_index=True
    )
    note = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["full_name", "id"]

    def __str__(self) -> str:
        return self.full_name


class FitnessClassSession(models.Model):
    class SessionType(models.TextChoices):
        GROUP = "group", "Guruh"
        INDIVIDUAL = "individual", "Individual"

    class Status(models.TextChoices):
        SCHEDULED = "scheduled", "Rejalashtirilgan"
        COMPLETED = "completed", "O'tkazilgan"
        CANCELLED = "cancelled", "Bekor qilingan"

    business = models.ForeignKey(Business, on_delete=models.CASCADE, related_name="fitness_sessions")
    trainer = models.ForeignKey(
        FitnessTrainer, on_delete=models.SET_NULL, null=True, blank=True, related_name="sessions"
    )
    title = models.CharField(max_length=255)
    session_type = models.CharField(
        max_length=20, choices=SessionType.choices, default=SessionType.GROUP
    )
    session_date = models.DateField(default=timezone.localdate)
    start_time = models.TimeField()
    end_time = models.TimeField()
    max_members = models.PositiveIntegerField(default=20)
    status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.SCHEDULED, db_index=True
    )
    note = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["session_date", "start_time", "id"]

    def __str__(self) -> str:
        return f"{self.title} ({self.session_date})"

    @property
    def current_members(self) -> int:
        return self.enrollments.count()


class FitnessClassEnrollment(models.Model):
    session = models.ForeignKey(
        FitnessClassSession, on_delete=models.CASCADE, related_name="enrollments"
    )
    client = models.ForeignKey(BusinessClient, on_delete=models.CASCADE, related_name="class_enrollments")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = [("session", "client")]
        ordering = ["id"]

    def __str__(self) -> str:
        return f"{self.client.full_name} → {self.session.title}"
