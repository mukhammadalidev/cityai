from django.contrib import admin

from .models import (
    BusinessClient,
    ClientAttendance,
    ClientMembership,
    ClientPayment,
)


@admin.register(BusinessClient)
class BusinessClientAdmin(admin.ModelAdmin):
    list_display = ("id", "full_name", "business", "client_type", "status", "phone", "created_at")
    list_filter = ("client_type", "status", "business")
    search_fields = ("full_name", "phone", "telegram_username")


@admin.register(ClientMembership)
class ClientMembershipAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "client",
        "business",
        "title",
        "start_date",
        "end_date",
        "expected_amount",
        "paid_amount",
        "status",
        "payment_status",
    )
    list_filter = ("status", "payment_status", "business")
    search_fields = ("client__full_name", "title")


@admin.register(ClientPayment)
class ClientPaymentAdmin(admin.ModelAdmin):
    list_display = ("id", "client", "business", "amount", "method", "payment_date", "membership")
    list_filter = ("method", "business", "payment_date")
    search_fields = ("client__full_name", "note")


@admin.register(ClientAttendance)
class ClientAttendanceAdmin(admin.ModelAdmin):
    list_display = ("id", "client", "business", "visit_date", "visit_time", "client_type", "amount_charged")
    list_filter = ("client_type", "business", "visit_date")
    search_fields = ("client__full_name", "note")
