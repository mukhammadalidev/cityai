from django.conf import settings
from django.db import models
from django.utils.text import slugify


class Business(models.Model):
    class BusinessType(models.TextChoices):
        AUTO_SALON = "auto_salon", "Auto Salon"
        EDUCATION_CENTER = "education_center", "Education Center"
        SHOP = "shop", "Shop"
        RESTAURANT = "restaurant", "Restaurant"
        CLINIC = "clinic", "Clinic"
        BEAUTY_SALON = "beauty_salon", "Beauty Salon"
        SERVICE = "service", "Service"
        REAL_ESTATE = "real_estate", "Real Estate"

    owner = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="businesses")
    name = models.CharField(max_length=255)
    slug = models.SlugField(max_length=255, blank=True)
    business_type = models.CharField(max_length=30, choices=BusinessType.choices)
    description = models.TextField(blank=True)
    logo = models.ImageField(upload_to="business/logos/", null=True, blank=True)
    phone = models.CharField(max_length=30, blank=True)
    address = models.CharField(max_length=255, blank=True)
    working_hours = models.CharField(max_length=255, blank=True)
    telegram_bot_token = models.CharField(max_length=255, blank=True)
    telegram_admin_chat_id = models.CharField(max_length=100, blank=True)
    public_page_enabled = models.BooleanField(default=False)
    brand_color = models.CharField(max_length=20, default="#2563eb")
    hero_title = models.CharField(max_length=255, blank=True)
    hero_subtitle = models.CharField(max_length=255, blank=True)
    public_description = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name)
        super().save(*args, **kwargs)

    def __str__(self) -> str:
        return f"{self.name} ({self.business_type})"
