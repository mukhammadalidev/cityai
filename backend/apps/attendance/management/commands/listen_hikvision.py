from django.core.management.base import BaseCommand

from apps.attendance.integrations.hikvision.listener import run_listener_forever


class Command(BaseCommand):
    help = (
        "Hikvision FaceID ISAPI alertStream oqimini tinglaydi va "
        "`DJANGO_ATTENDANCE_API_URL` orqali Django ga davomat yuboradi."
    )

    def handle(self, *args, **options):
        self.stdout.write(self.style.NOTICE("Hikvision listener ishlamoqda (to‘xtatish: Ctrl+C)."))
        run_listener_forever(log=lambda m: self.stdout.write(m))
