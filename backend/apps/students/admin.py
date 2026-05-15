import json

from django.contrib import admin, messages
from django.utils.html import format_html

from apps.attendance.integrations.hikvision.device_client import sync_student_to_hikvision

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
    list_display = (
        "id",
        "name",
        "phone",
        "hikvision_employee_no",
        "business",
        "group",
        "course",
        "status",
        "created_at",
    )
    list_filter = ("status", "business")
    search_fields = ("name", "phone", "hikvision_employee_no")
    inlines = (StudentRatingInline,)
    actions = ("push_to_hikvision_device",)

    @admin.action(description="Tanlanganlarni Hikvision qurilmasiga yuborish (UserInfo)")
    def push_to_hikvision_device(self, request, queryset):
        ok_n = 0
        for student in queryset:
            try:
                res = sync_student_to_hikvision(student)
            except Exception as exc:
                self.message_user(
                    request,
                    f"{student} — xato: {exc}",
                    level=messages.ERROR,
                )
                continue
            if res.get("ok"):
                ok_n += 1
                self.message_user(
                    request,
                    f"{student} — Hikvision ga yuborildi (employeeNo={student.hikvision_employee_no}).",
                    level=messages.SUCCESS,
                )
            else:
                detail = res.get("error") or ""
                att = res.get("attempts")
                if att:
                    detail = detail + " | " + json.dumps(att, ensure_ascii=False, default=str)[:4000]
                else:
                    detail = detail + " | " + str(res)
                self.message_user(
                    request,
                    f"{student} — Hikvision rad etdi: {detail}",
                    level=messages.WARNING,
                )
        if ok_n and queryset.count() > 1:
            self.message_user(request, f"Jami muvaffaqiyatli: {ok_n} ta.", level=messages.INFO)


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
