from django.contrib import admin

from .models import Lead, LeadActivity, TestDrive, TradeInRequest

admin.site.register(Lead)
admin.site.register(LeadActivity)
admin.site.register(TestDrive)
admin.site.register(TradeInRequest)
