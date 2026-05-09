from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import BusinessSubscriptionViewSet, SubscriptionPlanViewSet, upgrade_subscription_view

router = DefaultRouter()
router.register(r"plans", SubscriptionPlanViewSet, basename="plan")
router.register(r"subscriptions", BusinessSubscriptionViewSet, basename="subscription")

urlpatterns = [
    path("subscriptions/upgrade/", upgrade_subscription_view),
] + router.urls
