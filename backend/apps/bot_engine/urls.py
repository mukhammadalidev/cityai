from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import BotMessageLogViewSet, BotSessionViewSet, BotTemplateViewSet, category_types_view

router = DefaultRouter()
router.register(r"bot-templates", BotTemplateViewSet, basename="bottemplate")
router.register(r"bot-sessions", BotSessionViewSet, basename="botsession")
router.register(r"bot-message-logs", BotMessageLogViewSet, basename="botmessagelog")

urlpatterns = [
    path("category-types/", category_types_view),
] + router.urls
