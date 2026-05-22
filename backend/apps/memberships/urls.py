from django.urls import path
from rest_framework.routers import DefaultRouter

from .reports import (
    FitnessAttendanceReportView,
    FitnessDashboardReportView,
    FitnessDebtorsReportView,
    FitnessMonthlyIncomeReportView,
)
from .views import (
    BusinessClientViewSet,
    ClientAttendanceViewSet,
    ClientMembershipViewSet,
    ClientPaymentViewSet,
    FitnessAbonementsView,
    FitnessClassSessionViewSet,
    FitnessDebtorsView,
    FitnessLedgerSummaryView,
    FitnessTrainerViewSet,
)

router = DefaultRouter()
# Legacy URLs (mavjud frontend)
router.register(r"clients", BusinessClientViewSet, basename="business-client")
router.register(r"memberships", ClientMembershipViewSet, basename="client-membership")
router.register(r"payments", ClientPaymentViewSet, basename="client-payment")
router.register(r"attendance", ClientAttendanceViewSet, basename="client-attendance")
# Spec aliases
router.register(r"members", BusinessClientViewSet, basename="fitness-member")
router.register(r"subscriptions", ClientMembershipViewSet, basename="fitness-subscription")
router.register(r"trainers", FitnessTrainerViewSet, basename="fitness-trainer")
router.register(r"schedules", FitnessClassSessionViewSet, basename="fitness-schedule")

urlpatterns = [
    path("fitness-ledger/summary/", FitnessLedgerSummaryView.as_view(), name="fitness-ledger-summary"),
    path("fitness-ledger/abonements/", FitnessAbonementsView.as_view(), name="fitness-ledger-abonements"),
    path("debtors/", FitnessDebtorsView.as_view(), name="fitness-debtors"),
    path("reports/dashboard/", FitnessDashboardReportView.as_view(), name="fitness-reports-dashboard"),
    path("reports/monthly-income/", FitnessMonthlyIncomeReportView.as_view(), name="fitness-reports-monthly-income"),
    path("reports/debtors/", FitnessDebtorsReportView.as_view(), name="fitness-reports-debtors"),
    path("reports/attendance/", FitnessAttendanceReportView.as_view(), name="fitness-reports-attendance"),
]

urlpatterns += router.urls
