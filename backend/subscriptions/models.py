from django.db import models

from businesses.models import Business


class Plan(models.Model):
    class Code(models.TextChoices):
        DEMO = "demo", "Demo"
        START = "start", "Start"
        BUSINESS = "business", "Business"
        PREMIUM = "premium", "Premium"

    name = models.CharField(max_length=120)
    code = models.CharField(max_length=20, choices=Code.choices, unique=True)
    monthly_price = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    setup_price = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    max_businesses = models.PositiveIntegerField(default=1)
    max_items = models.PositiveIntegerField(default=10)
    max_managers = models.PositiveIntegerField(default=1)
    max_leads_per_month = models.PositiveIntegerField(default=30)
    max_ai_messages_per_month = models.PositiveIntegerField(default=100)
    max_knowledge_entries = models.PositiveIntegerField(default=5)
    has_ai_chat = models.BooleanField(default=True)
    has_analytics = models.BooleanField(default=False)
    has_auto_followup = models.BooleanField(default=False)
    has_white_label = models.BooleanField(default=False)
    has_public_landing = models.BooleanField(default=False)
    has_marketing_generator = models.BooleanField(default=False)
    has_manager_performance = models.BooleanField(default=False)
    has_api_integration = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)

    def __str__(self) -> str:
        return self.name


class BusinessSubscription(models.Model):
    class Status(models.TextChoices):
        TRIAL = "trial", "Trial"
        ACTIVE = "active", "Active"
        OVERDUE = "overdue", "Overdue"
        CANCELLED = "cancelled", "Cancelled"

    business = models.OneToOneField(Business, on_delete=models.CASCADE, related_name="subscription")
    plan = models.ForeignKey(Plan, on_delete=models.PROTECT, related_name="subscriptions")
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.TRIAL)
    start_date = models.DateField()
    end_date = models.DateField(null=True, blank=True)
    next_payment_date = models.DateField(null=True, blank=True)
    auto_renew = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
