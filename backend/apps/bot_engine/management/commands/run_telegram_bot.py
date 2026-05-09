import asyncio

from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = "Telegram botni ishga tushiradi (aiogram long polling). .env da TELEGRAM_BOT_TOKEN bo‘lishi kerak."

    def handle(self, *args, **options):
        from botapp.telegram_bot import run

        self.stdout.write(self.style.NOTICE("Bot ishga tushmoqda... Ctrl+C bilan to‘xtating."))
        asyncio.run(run())
