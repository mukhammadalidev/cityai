from django.db import models

from apps.students.models import Student


class Attendance(models.Model):
    """
    Hikvision FaceID qurilmasidan kelgan voqealar bo‘yicha alohida davomat yozuvi.

    Bu model `students.StudentAttendance` (kunlik dars davomati) bilan aralashmaydi:
    - StudentAttendance: o‘qituvchi/menejer belgilaydigan kunlik holat (present/absent/…).
    - Attendance: qurilma HTTP oqimi orqali avtomatik yozilgan kelish/ketish (came/left).

    Yuz rasmi yoki biometrik vektorlar saqlanmaydi — faqat qurilma raqami, vaqt va debug uchun
    cheklangan JSON (`raw_data`).
    """

    class Status(models.TextChoices):
        CAME = "came", "Keldi"
        LEFT = "left", "Ketdi"

    student = models.ForeignKey(Student, on_delete=models.CASCADE, related_name="face_device_attendances")
    status = models.CharField(
        max_length=10,
        choices=Status.choices,
        default=Status.CAME,
        db_index=True,
    )
    event_time = models.DateTimeField(db_index=True)
    device_ip = models.CharField(max_length=45)
    employee_no = models.CharField(max_length=50, db_index=True)
    raw_data = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-event_time", "-id"]
        indexes = [
            models.Index(fields=["student", "status", "event_time"]),
        ]

    def __str__(self) -> str:
        return f"{self.student_id} {self.event_time} {self.status}"
