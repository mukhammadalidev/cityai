from django.contrib import admin

from .models import ServiceCategory


@admin.register(ServiceCategory)
class ServiceCategoryAdmin(admin.ModelAdmin):
    list_display = ("name", "city", "category_type", "sort_order", "is_active")
    list_filter = ("city", "category_type", "is_active")
