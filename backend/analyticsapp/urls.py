from django.urls import path

from .views import analytics_conversion_view, analytics_dashboard_view, analytics_managers_view

urlpatterns = [
    path("analytics/dashboard/", analytics_dashboard_view, name="analytics-dashboard"),
    path("analytics/managers/", analytics_managers_view, name="analytics-managers"),
    path("analytics/conversion/", analytics_conversion_view, name="analytics-conversion"),
]
