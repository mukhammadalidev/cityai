from django.conf import settings
from django.db import models
from django.utils.text import slugify

from apps.city.models import City
from apps.service_categories.models import ServiceCategory


class Business(models.Model):
    class BusinessType(models.TextChoices):
        AUTO_SALON = "auto_salon", "Avtosalon"
        EDUCATION_CENTER = "education_center", "O‘quv markaz"
        SHOP = "shop", "Do‘kon"
        RESTAURANT = "restaurant", "Restoran"
        CLINIC = "clinic", "Klinika"
        BEAUTY_SALON = "beauty_salon", "Go‘zallik saloni"
        REPAIR_SERVICE = "repair_service", "Usta xizmatlari"
        REAL_ESTATE = "real_estate", "Uy-joy"
        TAXI_DELIVERY = "taxi_delivery", "Taxi / yetkazib berish"
        FITNESS = "fitness", "Fitnes"
        LEGAL_SERVICE = "legal_service", "Yuridik xizmat"
        PHOTO_VIDEO = "photo_video", "Foto / video"
        EVENT = "event", "Tadbirlar"
        HOTEL = "hotel", "Mehmonxona"
        TOURISM = "tourism", "Turizm"
        CAR_RENTAL = "car_rental", "Avto ijarasi"
        ELECTRONICS_REPAIR = "electronics_repair", "Elektronika ta’miri"
        CLEANING = "cleaning", "Tozalash"
        CUSTOM = "custom", "Boshqa"

    class Status(models.TextChoices):
        PENDING = "pending", "Kutilmoqda"
        ACTIVE = "active", "Faol"
        BLOCKED = "blocked", "Bloklangan"
        ARCHIVED = "archived", "Arxivlangan"

    owner = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="owned_businesses")
    city = models.ForeignKey(City, on_delete=models.CASCADE, related_name="businesses")
    category = models.ForeignKey(
        ServiceCategory, on_delete=models.PROTECT, related_name="businesses"
    )
    name = models.CharField(max_length=255)
    slug = models.SlugField(max_length=160, blank=True)
    business_type = models.CharField(max_length=40, choices=BusinessType.choices, default=BusinessType.CUSTOM)
    description = models.TextField(blank=True)
    logo = models.ImageField(upload_to="business/logos/", null=True, blank=True)
    cover_image = models.ImageField(upload_to="business/covers/", null=True, blank=True)
    phone = models.CharField(max_length=30, blank=True)
    address = models.CharField(max_length=255, blank=True)
    location_url = models.URLField(blank=True)
    working_hours = models.CharField(max_length=255, blank=True)
    telegram_admin_chat_id = models.CharField(max_length=100, blank=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    is_featured = models.BooleanField(default=False)
    rating = models.DecimalField(max_digits=3, decimal_places=2, default=0)
    views_count = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-is_featured", "-rating", "name"]

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name)[:150]
        super().save(*args, **kwargs)

    def __str__(self) -> str:
        return self.name


class BusinessManager(models.Model):
    class Role(models.TextChoices):
        OWNER = "owner", "Egasi"
        MANAGER = "manager", "Menejer"
        OPERATOR = "operator", "Operator"

    business = models.ForeignKey(Business, on_delete=models.CASCADE, related_name="managers")
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="business_memberships")
    role = models.CharField(max_length=20, choices=Role.choices, default=Role.MANAGER)
    telegram_id = models.CharField(max_length=50, blank=True)
    can_manage_items = models.BooleanField(default=True)
    can_manage_leads = models.BooleanField(default=True)
    can_manage_settings = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("business", "user")

    def __str__(self) -> str:
        return f"{self.user} @ {self.business}"
