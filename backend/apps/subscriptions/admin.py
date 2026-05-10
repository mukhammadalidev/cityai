from django.contrib import admin

from .models import BusinessSubscription, SubscriptionPlan


@admin.register(SubscriptionPlan)
class SubscriptionPlanAdmin(admin.ModelAdmin):
    list_display = (
        "name",
        "code",
        "trial_days",
        "monthly_price",
        "max_items",
        "max_managers",
        "has_edu_portals",
        "parent_can_create_student_portal",
        "has_marketing_generator",
        "is_active",
    )
    list_filter = ("is_active",)
    search_fields = ("name", "code")


@admin.register(BusinessSubscription)
class BusinessSubscriptionAdmin(admin.ModelAdmin):
    list_display = ("business", "plan", "status", "start_date", "end_date")
