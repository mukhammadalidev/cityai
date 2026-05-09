from django.contrib import admin

from .models import TelegramCustomer


@admin.register(TelegramCustomer)
class TelegramCustomerAdmin(admin.ModelAdmin):
    list_display = ("telegram_id", "city", "username", "phone", "last_seen")
