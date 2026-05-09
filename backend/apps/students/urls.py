from rest_framework.routers import DefaultRouter

from .views import StudentAttendanceViewSet, StudentGroupViewSet, StudentViewSet

router = DefaultRouter()
router.register(r"student-groups", StudentGroupViewSet, basename="studentgroup")
router.register(r"students", StudentViewSet, basename="student")
router.register(r"student-attendance", StudentAttendanceViewSet, basename="studentattendance")

urlpatterns = router.urls
