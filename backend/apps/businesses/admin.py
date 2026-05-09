from django.contrib import admin

from .models import Business, BusinessManager


class BusinessManagerInline(admin.TabularInline):
    model = BusinessManager
    extra = 0


@admin.register(Business)
class BusinessAdmin(admin.ModelAdmin):
    list_display = ("name", "city", "category", "owner", "status", "is_featured")
    list_filter = ("city", "status", "business_type")
    inlines = [BusinessManagerInline]
    search_fields = ("name", "slug", "phone")


@admin.register(BusinessManager)
class BusinessManagerAdmin(admin.ModelAdmin):
    list_display = ("business", "user", "role", "is_active")
