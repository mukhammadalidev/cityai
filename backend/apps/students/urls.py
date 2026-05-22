from rest_framework.routers import DefaultRouter

from .monthly_payment_views import StudentMonthlyPaymentViewSet
from .views import (
    StudentAttendanceViewSet,
    StudentGroupViewSet,
    StudentRatingViewSet,
    StudentViewSet,
)

router = DefaultRouter()
router.register(r"student-groups", StudentGroupViewSet, basename="studentgroup")
router.register(r"students", StudentViewSet, basename="student")
router.register(r"student-ratings", StudentRatingViewSet, basename="studentrating")
router.register(r"student-attendance", StudentAttendanceViewSet, basename="studentattendance")
router.register(r"student-monthly-payments", StudentMonthlyPaymentViewSet, basename="studentmonthlypayment")

urlpatterns = router.urls
