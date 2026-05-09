from django.db import models

from django.conf import settings

from businesses.models import Business
from catalog.models import Item


class MarketingContentRequest(models.Model):
    class ContentType(models.TextChoices):
        INSTAGRAM_POST = "instagram_post", "Instagram post"
        TELEGRAM_POST = "telegram_post", "Telegram post"
        REELS_SCRIPT = "reels_script", "Reels script"
        PRODUCT_DESCRIPTION = "product_description", "Product description"
        AD_COPY = "ad_copy", "Ad copy"
        STORY_TEXT = "story_text", "Story text"

    business = models.ForeignKey(Business, on_delete=models.CASCADE, related_name="marketing_requests")
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True)
    content_type = models.CharField(max_length=40, choices=ContentType.choices)
    item = models.ForeignKey(Item, on_delete=models.SET_NULL, null=True, blank=True)
    prompt = models.TextField(blank=True)
    result = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
