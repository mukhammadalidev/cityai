from django.db import models

from apps.businesses.models import Business


class Teacher(models.Model):
    class Status(models.TextChoices):
        ACTIVE = "active", "Faol"
        INACTIVE = "inactive", "Nofaol"

    business = models.ForeignKey(Business, on_delete=models.CASCADE, related_name="teachers")
    full_name = models.CharField(max_length=255)
    phone = models.CharField(max_length=30, blank=True)
    email = models.EmailField(blank=True)
    subjects = models.CharField(
        max_length=500,
        blank=True,
        help_text="Masalan: Ingliz tili, IELTS, matematika",
    )
    bio = models.TextField(blank=True)
    telegram_username = models.CharField(max_length=100, blank=True)
    photo = models.ImageField(upload_to="teachers/", null=True, blank=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.ACTIVE)
    sort_order = models.PositiveSmallIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["sort_order", "full_name", "id"]

    def __str__(self) -> str:
        return self.full_name
