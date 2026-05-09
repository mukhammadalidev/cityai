from django.urls import path

from .views import ai_usage_list_view, current_usage_view

urlpatterns = [
    path("usage/current/", current_usage_view, name="usage-current"),
    path("usage/ai/", ai_usage_list_view, name="usage-ai"),
]
