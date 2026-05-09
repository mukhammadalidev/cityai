from django.db import models

from businesses.models import Business
from leads.models import Lead


class FollowUpRule(models.Model):
    business = models.ForeignKey(Business, on_delete=models.CASCADE, related_name="followup_rules")
    name = models.CharField(max_length=120)
    trigger_status = models.CharField(max_length=30, default="new")
    delay_hours = models.PositiveIntegerField(default=1)
    message_template = models.TextField()
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)


class FollowUpTask(models.Model):
    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        SENT = "sent", "Sent"
        FAILED = "failed", "Failed"
        CANCELLED = "cancelled", "Cancelled"

    business = models.ForeignKey(Business, on_delete=models.CASCADE, related_name="followup_tasks")
    lead = models.ForeignKey(Lead, on_delete=models.CASCADE, related_name="followup_tasks")
    rule = models.ForeignKey(FollowUpRule, on_delete=models.SET_NULL, null=True, blank=True)
    scheduled_at = models.DateTimeField()
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    sent_at = models.DateTimeField(null=True, blank=True)
    error_message = models.TextField(blank=True)
