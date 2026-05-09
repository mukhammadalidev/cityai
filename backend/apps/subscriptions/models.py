from django.db import models

from apps.businesses.models import Business


class SubscriptionPlan(models.Model):
    class Code(models.TextChoices):
        DEMO = "demo", "Demo"
        START = "start", "Start"
        BUSINESS = "business", "Business"
        PREMIUM = "premium", "Premium"

    name = models.CharField(max_length=80)
    code = models.CharField(max_length=20, choices=Code.choices, unique=True)
    monthly_price = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    setup_price = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    max_items = models.PositiveIntegerField(default=10)
    max_managers = models.PositiveIntegerField(default=1)
    max_leads_per_month = models.PositiveIntegerField(default=30)
    max_ai_messages_per_month = models.PositiveIntegerField(default=100)
    has_ai_chat = models.BooleanField(default=True)
    has_analytics = models.BooleanField(default=False)
    has_public_page = models.BooleanField(default=False)
    has_marketing_generator = models.BooleanField(default=False)
    has_auto_followup = models.BooleanField(default=False)
    has_white_label = models.BooleanField(default=False)
    has_edu_attendance = models.BooleanField(
        default=False,
        help_text="O‘quv markaz: kunlik/oylik davomat moduli",
    )
    has_edu_materials = models.BooleanField(
        default=False,
        help_text="O‘quv markaz: kitob va mahsulotlar (Materiallar)",
    )
    has_edu_portals = models.BooleanField(
        default=False,
        help_text="O‘quv markaz: ustoz / o‘quvchi / ota-ona kabinet loginlari",
    )
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self) -> str:
        return self.name


class BusinessSubscription(models.Model):
    class Status(models.TextChoices):
        TRIAL = "trial", "Sinov"
        ACTIVE = "active", "Faol"
        OVERDUE = "overdue", "Muddati o‘tgan"
        CANCELLED = "cancelled", "Bekor qilingan"

    business = models.ForeignKey(Business, on_delete=models.CASCADE, related_name="subscriptions")
    plan = models.ForeignKey(SubscriptionPlan, on_delete=models.PROTECT, related_name="subscriptions")
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.TRIAL)
    start_date = models.DateField()
    end_date = models.DateField(null=True, blank=True)
    next_payment_date = models.DateField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
