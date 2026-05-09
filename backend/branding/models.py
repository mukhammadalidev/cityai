from django.db import models

from businesses.models import Business


class BrandingSettings(models.Model):
    business = models.OneToOneField(Business, on_delete=models.CASCADE, related_name="branding")
    logo = models.ImageField(upload_to="branding/logos/", null=True, blank=True)
    primary_color = models.CharField(max_length=20, default="#2563eb")
    secondary_color = models.CharField(max_length=20, default="#0f172a")
    hide_platform_branding = models.BooleanField(default=False)
    custom_footer_text = models.CharField(max_length=255, blank=True)
    custom_bot_welcome_message = models.TextField(blank=True)
    custom_domain = models.CharField(max_length=255, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
