from django.db import models
from django.utils.text import slugify

from apps.businesses.models import Business


class Item(models.Model):
    class Status(models.TextChoices):
        ACTIVE = "active", "Faol"
        HIDDEN = "hidden", "Yashirin"
        SOLD = "sold", "Sotilgan"
        OUT_OF_STOCK = "out_of_stock", "Tugagan"
        UNAVAILABLE = "unavailable", "Mavjud emas"

    class EducationCatalogKind(models.TextChoices):
        COURSE = "course", "Kurs"
        BOOK = "book", "Kitob"
        PRODUCT = "product", "Boshqa mahsulot"

    business = models.ForeignKey(Business, on_delete=models.CASCADE, related_name="items")
    title = models.CharField(max_length=255)
    slug = models.SlugField(max_length=160, blank=True)
    category_name = models.CharField(max_length=120, blank=True)
    price = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    currency = models.CharField(max_length=10, default="UZS")
    old_price = models.DecimalField(max_digits=15, decimal_places=2, null=True, blank=True)
    description = models.TextField(blank=True)
    image = models.ImageField(upload_to="items/", null=True, blank=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.ACTIVE)
    education_catalog_kind = models.CharField(
        max_length=20,
        choices=EducationCatalogKind.choices,
        default=EducationCatalogKind.COURSE,
        db_index=True,
    )
    metadata = models.JSONField(default=dict, blank=True)
    views_count = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        unique_together = ("business", "slug")

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.title)[:150]
        super().save(*args, **kwargs)

    def __str__(self) -> str:
        return self.title


class ItemImage(models.Model):
    item = models.ForeignKey(Item, on_delete=models.CASCADE, related_name="images")
    image = models.ImageField(upload_to="items/extra/")
    is_main = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
