from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import FollowUpRuleViewSet, FollowUpTaskViewSet

router = DefaultRouter()
router.register("follow-up-rules", FollowUpRuleViewSet, basename="follow-up-rules")
router.register("follow-up-tasks", FollowUpTaskViewSet, basename="follow-up-tasks")

urlpatterns = [
    path("", include(router.urls)),
]
