from django.db import models

from apps.city.models import City


class TelegramCustomer(models.Model):
    city = models.ForeignKey(City, on_delete=models.CASCADE, related_name="telegram_customers")
    telegram_id = models.CharField(max_length=50)
    username = models.CharField(max_length=255, blank=True)
    first_name = models.CharField(max_length=255, blank=True)
    last_name = models.CharField(max_length=255, blank=True)
    phone = models.CharField(max_length=20, blank=True)
    language = models.CharField(max_length=10, default="uz")
    created_at = models.DateTimeField(auto_now_add=True)
    last_seen = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ("city", "telegram_id")
        ordering = ["-last_seen"]

    def __str__(self) -> str:
        return self.username or self.first_name or self.telegram_id
