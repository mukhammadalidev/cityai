import os
from datetime import timedelta

from django.utils import timezone
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.students.models import Student

from .models import Attendance
from .serializers import AttendanceSerializer, HikvisionEventInSerializer


def _webhook_secret_expected() -> str | None:
    """`.env` dagi `HIKVISION_WEBHOOK_SECRET` bo‘sh bo‘lmasa, sarlavha tekshiriladi."""
    v = (os.getenv("HIKVISION_WEBHOOK_SECRET") or "").strip()
    return v or None


class HikvisionAttendanceEventView(APIView):
    """
    Hikvision FaceID → listener → POST `/api/attendance/hikvision/event/`.

    - `employee_no` Hikvisiondagi `employeeNo` / `employeeNoString` / `cardNo` bilan mos keladi.
    - Django `Student.hikvision_employee_no` bo‘yicha o‘quvchini topadi.
    - Yangi `Attendance` yozuvi `status=came` bilan yaratiladi (default).
    - So‘nggi 5 daqiqa ichida `came` bo‘lsa, takror yozuv yaratilmaydi (Duplicate ignored).

    Yuz tasviri saqlanmaydi; faqat `raw_data` ichida debug ma’lumoti (masalan, listener yig‘gan teglar).
    """

    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request, *args, **kwargs):
        expected = _webhook_secret_expected()
        if expected is not None:
            got = (request.headers.get("X-Hikvision-Secret") or "").strip()
            if got != expected:
                return Response(
                    {"detail": "Webhook maxfiy kaliti noto‘g‘ri yoki berilmagan."},
                    status=status.HTTP_403_FORBIDDEN,
                )

        ser = HikvisionEventInSerializer(data=request.data)
        if not ser.is_valid():
            return Response(ser.errors, status=status.HTTP_400_BAD_REQUEST)

        employee_no = ser.validated_data["employee_no"].strip()
        event_time = ser.validated_data["event_time"]
        if timezone.is_naive(event_time):
            event_time = timezone.make_aware(event_time, timezone.get_current_timezone())

        device_ip = (ser.validated_data.get("device_ip") or "").strip() or None
        if not device_ip:
            device_ip = (request.META.get("REMOTE_ADDR") or "")[:45]

        raw_data = ser.validated_data.get("raw_data") or {}

        # Ba'zan qurilma "001" yuboradi, CRM da "1" — raqamli ID uchun variantlarni sinash.
        student = Student.objects.filter(hikvision_employee_no=employee_no).first()
        if student is None and employee_no.isdigit():
            alt = str(int(employee_no))
            if alt != employee_no:
                student = Student.objects.filter(hikvision_employee_no=alt).first()
            if student is None and len(employee_no) < 8:
                for width in (3, 4, 5, 6):
                    padded = employee_no.zfill(width)
                    student = Student.objects.filter(hikvision_employee_no=padded).first()
                    if student:
                        break
        if student is None:
            return Response(
                {
                    "success": False,
                    "message": f"Bu Hikvision xodim raqami ({employee_no}) uchun o‘quvchi topilmadi. "
                    "Admin panelda o‘quvchiga `hikvision_employee_no` qiymatini biriktiring.",
                },
                status=status.HTTP_404_NOT_FOUND,
            )

        # So‘nggi `came` yozuvi shu vaqtdan 5 daqiqa ichida bo‘lsa — takror (qurilma tez-tez yuborishi mumkin).
        latest_came = (
            Attendance.objects.filter(student=student, status=Attendance.Status.CAME)
            .order_by("-event_time")
            .first()
        )
        if latest_came is not None:
            delta = event_time - latest_came.event_time
            if timedelta(0) <= delta <= timedelta(minutes=5):
                return Response(
                    {
                        "success": True,
                        "message": "Duplicate ignored",
                        "attendance_id": latest_came.pk,
                    },
                    status=status.HTTP_200_OK,
                )

        att = Attendance.objects.create(
            student=student,
            status=Attendance.Status.CAME,
            event_time=event_time,
            device_ip=device_ip or "",
            employee_no=employee_no,
            raw_data=raw_data,
        )

        name = student.name
        return Response(
            {
                "success": True,
                "message": f"{name} keldi deb belgilandi",
                "attendance_id": att.pk,
                "attendance": AttendanceSerializer(att).data,
            },
            status=status.HTTP_201_CREATED,
        )
