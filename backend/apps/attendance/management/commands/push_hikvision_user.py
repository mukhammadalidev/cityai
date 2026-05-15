import json

from django.core.management.base import BaseCommand

from apps.attendance.integrations.hikvision.device_client import sync_student_to_hikvision
from apps.students.models import Student


class Command(BaseCommand):
    help = (
        "Bitta o‘quvchini Hikvision ACS ga ISAPI orqali yuboradi (terminalda User ro‘yxatida paydo bo‘ladi). "
        "Xatolikda qurilmaning JSON javobini chiqaradi."
    )

    def add_arguments(self, parser):
        parser.add_argument("student_id", type=int, help="Student model primary key (admin ID)")

    def handle(self, *args, **options):
        sid = options["student_id"]
        student = Student.objects.filter(pk=sid).first()
        if not student:
            self.stderr.write(self.style.ERROR(f"Student id={sid} topilmadi."))
            return
        self.stdout.write(f"Yuborilmoqda: {student} employeeNo={student.hikvision_employee_no!r}")
        try:
            res = sync_student_to_hikvision(student)
        except Exception as e:
            self.stderr.write(self.style.ERROR(str(e)))
            raise
        self.stdout.write(json.dumps(res, indent=2, ensure_ascii=False, default=str))
        if res.get("ok"):
            self.stdout.write(self.style.SUCCESS("OK"))
        else:
            self.stderr.write(self.style.WARNING("Muvaffaqiyatsiz — yuqoridagi attempts/data ni Hikvision bilan solishtiring."))
