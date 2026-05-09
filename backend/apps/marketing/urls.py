from django.urls import path

from .views import marketing_generate_view, marketing_history_view

urlpatterns = [
    path("marketing/generate/", marketing_generate_view),
    path("marketing/history/", marketing_history_view),
]
