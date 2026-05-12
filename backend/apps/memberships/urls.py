from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import (
    BusinessClientViewSet,
    ClientAttendanceViewSet,
    ClientMembershipViewSet,
    ClientPaymentViewSet,
    FitnessAbonementsView,
    FitnessLedgerSummaryView,
)

router = DefaultRouter()
router.register(r"clients", BusinessClientViewSet, basename="business-client")
router.register(r"memberships", ClientMembershipViewSet, basename="client-membership")
router.register(r"payments", ClientPaymentViewSet, basename="client-payment")
router.register(r"attendance", ClientAttendanceViewSet, basename="client-attendance")

urlpatterns = [
    path("fitness-ledger/summary/", FitnessLedgerSummaryView.as_view(), name="fitness-ledger-summary"),
    path("fitness-ledger/abonements/", FitnessAbonementsView.as_view(), name="fitness-ledger-abonements"),
]

urlpatterns += router.urls
