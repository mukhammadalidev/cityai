from django.contrib import admin

from .models import BotMessageLog, BotSession, BotTemplate


@admin.register(BotTemplate)
class BotTemplateAdmin(admin.ModelAdmin):
    list_display = ("name", "category_type", "is_active")


@admin.register(BotSession)
class BotSessionAdmin(admin.ModelAdmin):
    list_display = ("customer", "city", "state", "updated_at")


@admin.register(BotMessageLog)
class BotMessageLogAdmin(admin.ModelAdmin):
    list_display = ("customer", "business", "intent", "created_at")
