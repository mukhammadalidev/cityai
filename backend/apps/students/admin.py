from django.contrib import admin
from django.utils.html import format_html

from .models import Student, StudentAttendance, StudentGroup, StudentRating


@admin.register(StudentGroup)
class StudentGroupAdmin(admin.ModelAdmin):
    list_display = ("id", "name", "business", "teacher", "course", "sort_order", "created_at")
    list_filter = ("business",)
    search_fields = ("name",)


class StudentRatingInline(admin.TabularInline):
    model = StudentRating
    extra = 0
    fields = ("title", "points", "rated_at", "comment")
    ordering = ("-rated_at", "-id")
    show_change_link = True


@admin.register(Student)
class StudentAdmin(admin.ModelAdmin):
    list_display = ("id", "name", "phone", "business", "group", "course", "status", "created_at")
    list_filter = ("status", "business")
    search_fields = ("name", "phone")
    inlines = (StudentRatingInline,)


@admin.register(StudentAttendance)
class StudentAttendanceAdmin(admin.ModelAdmin):
    list_display = ("id", "student", "date", "status", "updated_at")
    list_filter = ("status", "date")
    date_hierarchy = "date"


@admin.register(StudentRating)
class StudentRatingAdmin(admin.ModelAdmin):
    list_display = ("id", "student", "title", "points_badge", "rated_at", "updated_at")
    list_filter = ("rated_at", "student__business")
    search_fields = ("title", "student__name", "comment")
    date_hierarchy = "rated_at"
    ordering = ("-rated_at", "-id")
    list_select_related = ("student", "student__business")
    autocomplete_fields = ("student",)

    @admin.display(description="Ball", ordering="points")
    def points_badge(self, obj):
        p = int(obj.points)
        if p >= 85:
            bg, fg = "#f6ffed", "#389e0d"
        elif p >= 70:
            bg, fg = "#fffbe6", "#d48806"
        elif p >= 50:
            bg, fg = "#e6f4ff", "#1677ff"
        else:
            bg, fg = "#fff2f0", "#cf1322"
        return format_html(
            "<span style=\"display:inline-block;min-width:2.6rem;padding:6px 12px;border-radius:10px;"
            "background:{};color:{};font-weight:600;font-size:13px;text-align:center;letter-spacing:0.02em;\">"
            "{}</span>",
            bg,
            fg,
            p,
        )
