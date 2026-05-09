from django.conf import settings
from django.db import models

from apps.businesses.models import Business


class MarketingContentRequest(models.Model):
    business = models.ForeignKey(Business, on_delete=models.CASCADE, related_name="marketing_requests")
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True)
    content_type = models.CharField(max_length=80, blank=True)
    prompt = models.TextField(blank=True)
    result = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
