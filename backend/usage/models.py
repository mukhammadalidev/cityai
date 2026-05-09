from django.db import models

from businesses.models import Business
from customers.models import TelegramCustomer


class AIUsage(models.Model):
    business = models.ForeignKey(Business, on_delete=models.CASCADE, related_name="ai_usages")
    customer = models.ForeignKey(TelegramCustomer, on_delete=models.SET_NULL, null=True, blank=True)
    message = models.TextField()
    response = models.TextField()
    prompt_tokens = models.PositiveIntegerField(default=0)
    completion_tokens = models.PositiveIntegerField(default=0)
    total_tokens = models.PositiveIntegerField(default=0)
    estimated_cost = models.DecimalField(max_digits=12, decimal_places=4, default=0)
    created_at = models.DateTimeField(auto_now_add=True)


class MonthlyUsageSummary(models.Model):
    business = models.ForeignKey(Business, on_delete=models.CASCADE, related_name="monthly_usage")
    month = models.CharField(max_length=7)  # YYYY-MM
    ai_messages_count = models.PositiveIntegerField(default=0)
    total_tokens = models.PositiveIntegerField(default=0)
    total_leads = models.PositiveIntegerField(default=0)
    total_customers = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ("business", "month")
