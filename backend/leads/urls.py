from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import LeadViewSet, TestDriveViewSet, TradeInRequestViewSet

router = DefaultRouter()
router.register("leads", LeadViewSet, basename="leads")
router.register("test-drives", TestDriveViewSet, basename="test-drives")
router.register("trade-ins", TradeInRequestViewSet, basename="trade-ins")

urlpatterns = [
    path("", include(router.urls)),
]
