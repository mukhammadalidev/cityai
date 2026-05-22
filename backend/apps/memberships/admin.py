from django.contrib import admin
from django.utils.html import format_html

from .models import (
    BusinessClient,
    ClientAttendance,
    ClientMembership,
    ClientPayment,
    FitnessClassEnrollment,
    FitnessClassSession,
    FitnessTrainer,
)


@admin.register(BusinessClient)
class BusinessClientAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "full_name",
        "business",
        "client_type",
        "status",
        "phone",
        "joined_date",
        "photo_thumb",
    )
    list_filter = ("client_type", "status", "business", "gender")
    search_fields = ("full_name", "phone", "telegram_username", "emergency_contact")
    readonly_fields = ("created_at", "updated_at")
    fieldsets = (
        (None, {"fields": ("business", "full_name", "phone", "telegram_username", "gender", "status")}),
        ("Qo'shimcha", {"fields": ("birth_date", "joined_date", "client_type", "photo", "emergency_contact")}),
        ("Matnlar", {"fields": ("note", "announcement", "metadata")}),
        ("Vaqt", {"fields": ("created_at", "updated_at")}),
    )

    @admin.display(description="Rasm")
    def photo_thumb(self, obj):
        if obj.photo:
            return format_html('<img src="{}" width="40" height="40" style="object-fit:cover;border-radius:6px"/>', obj.photo.url)
        return "—"


@admin.register(ClientMembership)
class ClientMembershipAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "client",
        "plan_name",
        "plan_type",
        "start_date",
        "end_date",
        "expected_amount",
        "paid_amount",
        "status",
        "payment_status",
    )
    list_filter = ("status", "payment_status", "plan_type", "business")
    search_fields = ("client__full_name", "plan_name", "title")
    raw_id_fields = ("client", "item")


@admin.register(ClientPayment)
class ClientPaymentAdmin(admin.ModelAdmin):
    list_display = ("id", "client", "amount", "method", "status", "payment_date", "membership")
    list_filter = ("method", "status", "business", "payment_date")
    search_fields = ("client__full_name", "comment", "note")
    raw_id_fields = ("client", "membership")


@admin.register(ClientAttendance)
class ClientAttendanceAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "client",
        "visit_date",
        "check_in_time",
        "check_out_time",
        "status",
        "client_type",
    )
    list_filter = ("status", "client_type", "business", "visit_date")
    search_fields = ("client__full_name", "note")
    raw_id_fields = ("client", "membership")


@admin.register(FitnessTrainer)
class FitnessTrainerAdmin(admin.ModelAdmin):
    list_display = ("id", "full_name", "business", "specialization", "salary_type", "status")
    list_filter = ("status", "salary_type", "business")
    search_fields = ("full_name", "phone", "specialization")


class FitnessClassEnrollmentInline(admin.TabularInline):
    model = FitnessClassEnrollment
    extra = 0
    raw_id_fields = ("client",)


@admin.register(FitnessClassSession)
class FitnessClassSessionAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "title",
        "session_date",
        "start_time",
        "trainer",
        "session_type",
        "status",
        "max_members",
    )
    list_filter = ("status", "session_type", "business", "session_date")
    search_fields = ("title", "trainer__full_name")
    inlines = [FitnessClassEnrollmentInline]
    raw_id_fields = ("trainer",)


@admin.register(FitnessClassEnrollment)
class FitnessClassEnrollmentAdmin(admin.ModelAdmin):
    list_display = ("id", "session", "client", "created_at")
    raw_id_fields = ("session", "client")
