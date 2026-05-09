from django.db import models

from accounts.models import User
from businesses.models import Business
from cars.models import Car
from catalog.models import Item
from customers.models import TelegramCustomer


class Lead(models.Model):
    class LeadType(models.TextChoices):
        GENERAL = "general", "General"
        CREDIT = "credit", "Credit"
        TEST_DRIVE = "test_drive", "Test Drive"
        TRADE_IN = "trade_in", "Trade In"
        CONTACT = "contact", "Contact"

    class Status(models.TextChoices):
        NEW = "new", "New"
        CONTACTED = "contacted", "Contacted"
        INTERESTED = "interested", "Interested"
        NEGOTIATION = "negotiation", "Negotiation"
        WON = "won", "Won"
        LOST = "lost", "Lost"
        COMPLETED = "completed", "Completed"
        SOLD = "sold", "Sold"
        CANCELLED = "cancelled", "Cancelled"

    class Priority(models.TextChoices):
        LOW = "low", "Low"
        MEDIUM = "medium", "Medium"
        HIGH = "high", "High"

    class Source(models.TextChoices):
        TELEGRAM_BOT = "telegram_bot", "Telegram bot"
        LANDING_PAGE = "landing_page", "Landing page"
        MANUAL = "manual", "Manual"
        INSTAGRAM = "instagram", "Instagram"

    customer = models.ForeignKey(TelegramCustomer, on_delete=models.SET_NULL, null=True, blank=True)
    business = models.ForeignKey(Business, on_delete=models.CASCADE, null=True, blank=True, related_name="leads")
    car = models.ForeignKey(Car, on_delete=models.SET_NULL, null=True, blank=True)
    item = models.ForeignKey(Item, on_delete=models.SET_NULL, null=True, blank=True, related_name="leads")
    lead_type = models.CharField(max_length=20, choices=LeadType.choices, default=LeadType.GENERAL)
    name = models.CharField(max_length=255)
    phone = models.CharField(max_length=20)
    message = models.TextField(blank=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.NEW)
    priority = models.CharField(max_length=10, choices=Priority.choices, default=Priority.MEDIUM)
    source = models.CharField(max_length=20, choices=Source.choices, default=Source.TELEGRAM_BOT)
    assigned_to = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name="assigned_leads")
    next_follow_up_at = models.DateTimeField(null=True, blank=True)
    last_contacted_at = models.DateTimeField(null=True, blank=True)
    notes = models.TextField(blank=True)
    metadata = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)


class TestDrive(models.Model):
    class Status(models.TextChoices):
        NEW = "new", "New"
        CONFIRMED = "confirmed", "Confirmed"
        REJECTED = "rejected", "Rejected"
        COMPLETED = "completed", "Completed"

    customer = models.ForeignKey(TelegramCustomer, on_delete=models.SET_NULL, null=True, blank=True)
    car = models.ForeignKey(Car, on_delete=models.SET_NULL, null=True, blank=True)
    name = models.CharField(max_length=255)
    phone = models.CharField(max_length=20)
    preferred_date = models.DateField()
    preferred_time = models.TimeField()
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.NEW)
    created_at = models.DateTimeField(auto_now_add=True)


class TradeInRequest(models.Model):
    class Status(models.TextChoices):
        NEW = "new", "New"
        REVIEWING = "reviewing", "Reviewing"
        OFFERED = "offered", "Offered"
        REJECTED = "rejected", "Rejected"
        ACCEPTED = "accepted", "Accepted"

    customer = models.ForeignKey(TelegramCustomer, on_delete=models.SET_NULL, null=True, blank=True)
    name = models.CharField(max_length=255)
    phone = models.CharField(max_length=20)
    brand = models.CharField(max_length=100)
    model = models.CharField(max_length=100)
    year = models.PositiveIntegerField()
    mileage = models.PositiveIntegerField(default=0)
    condition_note = models.TextField(blank=True)
    expected_price = models.DecimalField(max_digits=15, decimal_places=2, null=True, blank=True)
    image = models.ImageField(upload_to="tradein/", null=True, blank=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.NEW)
    created_at = models.DateTimeField(auto_now_add=True)


class LeadActivity(models.Model):
    class ActivityType(models.TextChoices):
        STATUS_CHANGED = "status_changed", "Status changed"
        NOTE_ADDED = "note_added", "Note added"
        MANAGER_ASSIGNED = "manager_assigned", "Manager assigned"
        FOLLOW_UP_SCHEDULED = "follow_up_scheduled", "Follow-up scheduled"
        PHONE_CALLED = "phone_called", "Phone called"
        TELEGRAM_MESSAGE_SENT = "telegram_message_sent", "Telegram message sent"

    lead = models.ForeignKey(Lead, on_delete=models.CASCADE, related_name="activities")
    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    activity_type = models.CharField(max_length=30, choices=ActivityType.choices)
    text = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
