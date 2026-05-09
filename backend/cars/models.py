from django.db import models


class Car(models.Model):
    class Condition(models.TextChoices):
        NEW = "new", "New"
        USED = "used", "Used"

    class Status(models.TextChoices):
        ACTIVE = "active", "Active"
        SOLD = "sold", "Sold"
        HIDDEN = "hidden", "Hidden"

    brand = models.CharField(max_length=100)
    model = models.CharField(max_length=100)
    year = models.PositiveIntegerField()
    price = models.DecimalField(max_digits=15, decimal_places=2)
    currency = models.CharField(max_length=10, default="UZS")
    condition = models.CharField(max_length=10, choices=Condition.choices, default=Condition.NEW)
    body_type = models.CharField(max_length=50, blank=True)
    fuel_type = models.CharField(max_length=50, blank=True)
    transmission = models.CharField(max_length=50, blank=True)
    mileage = models.PositiveIntegerField(default=0)
    color = models.CharField(max_length=50, blank=True)
    description = models.TextField(blank=True)
    has_credit = models.BooleanField(default=False)
    has_trade_in = models.BooleanField(default=False)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.ACTIVE)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self) -> str:
        return f"{self.brand} {self.model} {self.year}"


class CarImage(models.Model):
    car = models.ForeignKey(Car, on_delete=models.CASCADE, related_name="images")
    image = models.ImageField(upload_to="cars/")
    is_main = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
