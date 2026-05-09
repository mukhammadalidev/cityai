from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import PlanViewSet, current_subscription_view, upgrade_subscription_view

router = DefaultRouter()
router.register("plans", PlanViewSet, basename="plans")

urlpatterns = [
    path("subscription/current/", current_subscription_view, name="subscription-current"),
    path("subscription/upgrade/", upgrade_subscription_view, name="subscription-upgrade"),
]
urlpatterns += router.urls
