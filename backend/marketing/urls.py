from django.urls import path

from .views import marketing_generate_view, marketing_history_view

urlpatterns = [
    path("marketing/generate/", marketing_generate_view, name="marketing-generate"),
    path("marketing/history/", marketing_history_view, name="marketing-history"),
]
