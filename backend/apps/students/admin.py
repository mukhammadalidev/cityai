from django.contrib import admin

from .models import Student, StudentAttendance, StudentGroup


@admin.register(StudentGroup)
class StudentGroupAdmin(admin.ModelAdmin):
    list_display = ("id", "name", "business", "teacher", "course", "sort_order", "created_at")
    list_filter = ("business",)
    search_fields = ("name",)


@admin.register(Student)
class StudentAdmin(admin.ModelAdmin):
    list_display = ("id", "name", "phone", "business", "group", "course", "status", "created_at")
    list_filter = ("status", "business")
    search_fields = ("name", "phone")


@admin.register(StudentAttendance)
class StudentAttendanceAdmin(admin.ModelAdmin):
    list_display = ("id", "student", "date", "status", "updated_at")
    list_filter = ("status", "date")
    date_hierarchy = "date"
