from django.contrib import admin

from .models import Teacher


@admin.register(Teacher)
class TeacherAdmin(admin.ModelAdmin):
    list_display = ("id", "full_name", "business", "phone", "status", "sort_order", "created_at")
    list_filter = ("status", "business")
    search_fields = ("full_name", "phone", "subjects")
