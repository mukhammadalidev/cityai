from django.contrib import admin

from .models import Invoice, PaymentRecord

admin.site.register(Invoice)
admin.site.register(PaymentRecord)
