from django.contrib import admin

from .models import Attendance


@admin.register(Attendance)
class AttendanceAdmin(admin.ModelAdmin):
    list_display = ("id", "student", "employee_no", "status", "event_time", "device_ip", "created_at")
    list_filter = ("status", "event_time", "created_at")
    search_fields = ("student__name", "employee_no", "student__hikvision_employee_no")
    date_hierarchy = "event_time"
    autocomplete_fields = ("student",)
    readonly_fields = ("created_at",)
