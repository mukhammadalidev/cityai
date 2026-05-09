from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import InvoiceViewSet, PaymentRecordViewSet

router = DefaultRouter()
router.register("invoices", InvoiceViewSet, basename="invoices")
router.register("payments", PaymentRecordViewSet, basename="payments")

urlpatterns = [
    path("", include(router.urls)),
]
