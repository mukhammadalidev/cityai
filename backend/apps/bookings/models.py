from django.db import models

from apps.businesses.models import Business
from apps.catalog.models import Item
from apps.city.models import City
from apps.customers.models import TelegramCustomer


class Booking(models.Model):
    class BookingType(models.TextChoices):
        APPOINTMENT = "appointment", "Qabul"
        TEST_DRIVE = "test_drive", "Test drive"
        TRIAL_LESSON = "trial_lesson", "Sinov darsi"
        TABLE_BOOKING = "table_booking", "Stol bron"
        SERVICE_BOOKING = "service_booking", "Xizmat bron"
        CONSULTATION = "consultation", "Konsultatsiya"

    class Status(models.TextChoices):
        NEW = "new", "Yangi"
        CONFIRMED = "confirmed", "Tasdiqlangan"
        REJECTED = "rejected", "Rad etilgan"
        COMPLETED = "completed", "Bajarilgan"
        CANCELLED = "cancelled", "Bekor qilingan"
        CONTACTED = "contacted", "Bog‘lanildi"

    city = models.ForeignKey(City, on_delete=models.CASCADE, related_name="bookings")
    business = models.ForeignKey(Business, on_delete=models.CASCADE, related_name="bookings")
    customer = models.ForeignKey(
        TelegramCustomer, on_delete=models.SET_NULL, null=True, blank=True, related_name="bookings"
    )
    item = models.ForeignKey(Item, on_delete=models.SET_NULL, null=True, blank=True, related_name="bookings")
    booking_type = models.CharField(max_length=30, choices=BookingType.choices, default=BookingType.APPOINTMENT)
    name = models.CharField(max_length=255)
    phone = models.CharField(max_length=30)
    preferred_date = models.DateField()
    preferred_time = models.TimeField()
    guests_count = models.PositiveSmallIntegerField(null=True, blank=True)
    note = models.TextField(blank=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.NEW)
    metadata = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
