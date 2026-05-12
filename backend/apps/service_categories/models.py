from django.db import models
from django.utils.text import slugify

from apps.city.models import City


class ServiceCategory(models.Model):
    class CategoryType(models.TextChoices):
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
        FITNESS_CENTER = "fitness_center", "Fitness zal"
        LEGAL_SERVICE = "legal_service", "Yuridik xizmat"
        PHOTO_VIDEO = "photo_video", "Foto / video"
        EVENT = "event", "Tadbirlar"
        HOTEL = "hotel", "Mehmonxona"
        TOURISM = "tourism", "Turizm"
        CAR_RENTAL = "car_rental", "Avto ijarasi"
        ELECTRONICS_REPAIR = "electronics_repair", "Elektronika ta’miri"
        CLEANING = "cleaning", "Tozalash"
        CUSTOM = "custom", "Boshqa"

    city = models.ForeignKey(City, on_delete=models.CASCADE, related_name="service_categories")
    name = models.CharField(max_length=120)
    slug = models.SlugField(max_length=140, blank=True)
    icon = models.CharField(max_length=40, blank=True, help_text="Emoji yoki icon identifikatori")
    description = models.TextField(blank=True)
    category_type = models.CharField(max_length=40, choices=CategoryType.choices, default=CategoryType.CUSTOM)
    is_active = models.BooleanField(default=True)
    sort_order = models.PositiveIntegerField(default=0)
    featured_until = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["sort_order", "name"]
        unique_together = ("city", "slug")

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name)
        super().save(*args, **kwargs)

    def __str__(self) -> str:
        return f"{self.city.name} — {self.name}"
