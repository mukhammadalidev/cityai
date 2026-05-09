from django.urls import path

from .views import ai_usage_list_view, business_analytics_view, platform_analytics_view

urlpatterns = [
    path("analytics/platform/", platform_analytics_view),
    path("analytics/business/<int:business_id>/", business_analytics_view),
    path("ai-usage/", ai_usage_list_view),
]
