from django.urls import path

from .views import HikvisionAttendanceEventView

urlpatterns = [
    path("hikvision/event/", HikvisionAttendanceEventView.as_view(), name="hikvision-attendance-event"),
]
