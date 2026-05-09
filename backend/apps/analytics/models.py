from django.db import models

from apps.businesses.models import Business
from apps.city.models import City
from apps.customers.models import TelegramCustomer


class AIUsage(models.Model):
    city = models.ForeignKey(City, on_delete=models.CASCADE, related_name="ai_usage")
    business = models.ForeignKey(
        Business, on_delete=models.CASCADE, null=True, blank=True, related_name="ai_usage"
    )
    customer = models.ForeignKey(
        TelegramCustomer, on_delete=models.SET_NULL, null=True, blank=True, related_name="ai_usage"
    )
    message = models.TextField()
    response = models.TextField(blank=True)
    prompt_tokens = models.PositiveIntegerField(default=0)
    completion_tokens = models.PositiveIntegerField(default=0)
    total_tokens = models.PositiveIntegerField(default=0)
    estimated_cost = models.DecimalField(max_digits=10, decimal_places=4, default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
