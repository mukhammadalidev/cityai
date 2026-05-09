from django.db import models

from businesses.models import Business
from customers.models import TelegramCustomer


class BotMessageLog(models.Model):
    business = models.ForeignKey(Business, on_delete=models.CASCADE, null=True, blank=True, related_name="bot_logs")
    customer = models.ForeignKey(TelegramCustomer, on_delete=models.SET_NULL, null=True, blank=True)
    message = models.TextField()
    response = models.TextField()
    intent = models.CharField(max_length=100, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
