from django.db import models

from businesses.models import Business
from subscriptions.models import BusinessSubscription


class Invoice(models.Model):
    class InvoiceType(models.TextChoices):
        SETUP = "setup", "Setup"
        MONTHLY = "monthly", "Monthly"
        EXTRA_AI = "extra_ai", "Extra AI"
        SUPPORT = "support", "Support"
        CUSTOM = "custom", "Custom"

    class Status(models.TextChoices):
        UNPAID = "unpaid", "Unpaid"
        PAID = "paid", "Paid"
        OVERDUE = "overdue", "Overdue"
        CANCELLED = "cancelled", "Cancelled"

    business = models.ForeignKey(Business, on_delete=models.CASCADE, related_name="invoices")
    subscription = models.ForeignKey(BusinessSubscription, on_delete=models.SET_NULL, null=True, blank=True)
    amount = models.DecimalField(max_digits=15, decimal_places=2)
    currency = models.CharField(max_length=10, default="UZS")
    invoice_type = models.CharField(max_length=20, choices=InvoiceType.choices, default=InvoiceType.MONTHLY)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.UNPAID)
    due_date = models.DateField()
    paid_at = models.DateTimeField(null=True, blank=True)
    note = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)


class PaymentRecord(models.Model):
    class Method(models.TextChoices):
        CASH = "cash", "Cash"
        CARD = "card", "Card"
        CLICK = "click", "Click"
        PAYME = "payme", "Payme"
        BANK_TRANSFER = "bank_transfer", "Bank transfer"

    invoice = models.ForeignKey(Invoice, on_delete=models.CASCADE, related_name="payments")
    amount = models.DecimalField(max_digits=15, decimal_places=2)
    payment_method = models.CharField(max_length=20, choices=Method.choices, default=Method.CASH)
    paid_at = models.DateTimeField()
    note = models.TextField(blank=True)
