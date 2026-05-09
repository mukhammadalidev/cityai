from django.contrib import admin

from .models import MarketingContentRequest


@admin.register(MarketingContentRequest)
class MarketingContentRequestAdmin(admin.ModelAdmin):
    list_display = ("business", "content_type", "created_at")
