from django.db import models

from apps.businesses.models import Business


class Invoice(models.Model):
    class InvoiceType(models.TextChoices):
        SETUP = "setup", "O‘rnatish"
        MONTHLY = "monthly", "Oylik"
        FEATURED = "featured", "Reklama"
        EXTRA_AI = "extra_ai", "Qo‘shimcha AI"

    class Status(models.TextChoices):
        UNPAID = "unpaid", "To‘lanmagan"
        PAID = "paid", "To‘langan"
        OVERDUE = "overdue", "Muddati o‘tgan"

    business = models.ForeignKey(Business, on_delete=models.CASCADE, related_name="invoices")
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    invoice_type = models.CharField(max_length=20, choices=InvoiceType.choices, default=InvoiceType.MONTHLY)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.UNPAID)
    due_date = models.DateField()
    paid_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
