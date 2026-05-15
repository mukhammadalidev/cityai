from django.db import models

from apps.businesses.models import Business
from apps.catalog.models import Item
from apps.leads.models import Lead


class StudentGroup(models.Model):
    """O‘quv guruhlari — o‘quvchilarni ajratish uchun."""

    business = models.ForeignKey(Business, on_delete=models.CASCADE, related_name="student_groups")
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    course = models.ForeignKey(
        Item, on_delete=models.SET_NULL, null=True, blank=True, related_name="student_groups"
    )
    teacher = models.ForeignKey(
        "teachers.Teacher",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="student_groups",
    )
    sort_order = models.PositiveSmallIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["sort_order", "name", "id"]

    def __str__(self) -> str:
        return self.name


class Student(models.Model):
    class Status(models.TextChoices):
        ACTIVE = "active", "Faol"
        PAUSED = "paused", "Tanaffus"
        GRADUATED = "graduated", "Bitirgan"

    business = models.ForeignKey(Business, on_delete=models.CASCADE, related_name="students")
    group = models.ForeignKey(
        StudentGroup,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="students",
    )
    course = models.ForeignKey(
        Item, on_delete=models.SET_NULL, null=True, blank=True, related_name="enrolled_students"
    )
    lead = models.ForeignKey(Lead, on_delete=models.SET_NULL, null=True, blank=True, related_name="students")
    name = models.CharField(max_length=255)
    phone = models.CharField(max_length=30, blank=True)
    # Hikvision FaceID / turniketdagi "employeeNo" — CRM dagi o‘quvchi bilan bog‘lash uchun.
    hikvision_employee_no = models.CharField(max_length=50, unique=True, null=True, blank=True)
    notes = models.TextField(blank=True)
    face_photo = models.ImageField(upload_to="students/faces/", null=True, blank=True)
    face_consent = models.BooleanField(default=False)
    face_registered_at = models.DateTimeField(null=True, blank=True)
    # Abonement: shu sanagacha (shu kun boshqacha) to‘langan deb hisoblanadi.
    tuition_paid_until = models.DateField(null=True, blank=True, db_index=True)
    tuition_payment_note = models.CharField(max_length=500, blank=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.ACTIVE)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["name", "id"]

    def __str__(self) -> str:
        return self.name


class StudentAttendance(models.Model):
    class Status(models.TextChoices):
        PRESENT = "present", "Keldi"
        ABSENT = "absent", "Kelmadi"
        LATE = "late", "Kechikdi"
        EXCUSED = "excused", "Sababli"

    student = models.ForeignKey(Student, on_delete=models.CASCADE, related_name="attendance_records")
    date = models.DateField(db_index=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PRESENT)
    note = models.CharField(max_length=500, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-date", "student_id"]
        unique_together = ("student", "date")

    def __str__(self) -> str:
        return f"{self.student_id} {self.date} {self.status}"


class StudentRating(models.Model):
    """O‘quvchi baholari (0–100 ball); o‘quvchi va ota-ona portallarida ko‘rinadi."""

    student = models.ForeignKey(Student, on_delete=models.CASCADE, related_name="ratings")
    title = models.CharField(max_length=200, help_text="Masalan: Matematika — oraliq nazorat")
    points = models.PositiveSmallIntegerField(help_text="0 dan 100 gacha ball")
    comment = models.TextField(blank=True)
    rated_at = models.DateField(db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-rated_at", "-created_at", "id"]

    def __str__(self) -> str:
        return f"{self.student_id} {self.title} ({self.points})"
