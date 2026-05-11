from __future__ import annotations

from datetime import timedelta

from django.core.management.base import BaseCommand
from django.utils import timezone

from apps.accounts.models import User
from apps.students.notifications import _send_telegram


class Command(BaseCommand):
    help = (
        "Ota-ona kabinetiga 3 kundan beri kirmagan EDU_PARENT foydalanuvchilarga "
        "eslatma Telegram xabari yuboradi."
    )

    def handle(self, *args, **options):
        now = timezone.now()
        cutoff = now - timedelta(days=3)

        qs = (
            User.objects.filter(
                role=User.Role.EDU_PARENT,
                is_active=True,
            )
            .exclude(telegram_id__exact="")
        )

        # last_login may be null (hech qachon kirmagan) yoki cutoffdan oldin bo'lishi mumkin.
        inactive_parents = qs.filter(last_login__isnull=True) | qs.filter(last_login__lt=cutoff)

        total = inactive_parents.count()
        if total == 0:
            self.stdout.write(self.style.SUCCESS("Faol bo'lmagan ota-onalar topilmadi."))
            return

        sent = 0
        skipped = 0

        text = (
            "📲 <b>Ota-ona kabineti eslatmasi</b>\n\n"
            "So'nggi 3 kun ichida ota-ona sahifangizga kirmagansiz.\n"
            "Farzandingizning davomat va baholarini ko'rib turish uchun iltimos, "
            "ota-ona kabinetiga qayta kiring."
        )

        for user in inactive_parents.iterator():
            chat_id = (user.telegram_id or "").strip()
            if not chat_id:
                skipped += 1
                continue
            if _send_telegram(chat_id, text):
                sent += 1
            else:
                skipped += 1

        self.stdout.write(
            self.style.SUCCESS(
                f"Jami nomzod: {total}, yuborildi: {sent}, muvaffaqiyatsiz/otasiz: {skipped}"
            )
        )

