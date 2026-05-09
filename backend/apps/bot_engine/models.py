from django.db import models

from apps.businesses.models import Business
from apps.city.models import City
from apps.customers.models import TelegramCustomer
from apps.service_categories.models import ServiceCategory


class BotTemplate(models.Model):
    category_type = models.CharField(max_length=40, choices=ServiceCategory.CategoryType.choices)
    name = models.CharField(max_length=120)
    menu_config = models.JSONField(default=dict, blank=True)
    field_config = models.JSONField(default=dict, blank=True)
    prompt_template = models.TextField(blank=True)
    lead_types = models.JSONField(default=list, blank=True)
    booking_enabled = models.BooleanField(default=False)
    order_enabled = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("category_type", "name")

    def __str__(self) -> str:
        return f"{self.category_type} — {self.name}"


class BotSession(models.Model):
    customer = models.ForeignKey(TelegramCustomer, on_delete=models.CASCADE, related_name="bot_sessions")
    city = models.ForeignKey(City, on_delete=models.CASCADE, related_name="bot_sessions")
    selected_category = models.ForeignKey(
        ServiceCategory, on_delete=models.SET_NULL, null=True, blank=True, related_name="bot_sessions"
    )
    selected_business = models.ForeignKey(
        Business, on_delete=models.SET_NULL, null=True, blank=True, related_name="bot_sessions"
    )
    state = models.CharField(max_length=64, blank=True)
    data = models.JSONField(default=dict, blank=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-updated_at"]


class BotMessageLog(models.Model):
    city = models.ForeignKey(City, on_delete=models.CASCADE, related_name="bot_message_logs")
    customer = models.ForeignKey(TelegramCustomer, on_delete=models.CASCADE, related_name="bot_message_logs")
    business = models.ForeignKey(
        Business, on_delete=models.SET_NULL, null=True, blank=True, related_name="bot_message_logs"
    )
    message = models.TextField()
    response = models.TextField(blank=True)
    intent = models.CharField(max_length=120, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
