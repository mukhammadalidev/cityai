"""City Services AI Platform — Telegram bot entrypoint."""
import asyncio
import os
import sys
from pathlib import Path

from aiogram import Bot, Dispatcher
from aiogram.client.default import DefaultBotProperties
from aiogram.enums import ParseMode
from aiogram.fsm.storage.memory import MemoryStorage
from dotenv import load_dotenv

ROOT = Path(__file__).resolve().parent.parent
# Loyiha .env ustuvor: tizimda TELEGRAM_BOT_TOKEN=test kabi eski qiymat bo‘lsa ham fayldagi token ishlasin.
load_dotenv(ROOT / ".env", override=True)
sys.path.insert(0, str(ROOT / "backend"))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")

import django  # noqa: E402

django.setup()

from handlers import router  # noqa: E402


async def main() -> None:
    token = os.getenv("TELEGRAM_BOT_TOKEN")
    if not token:
        raise RuntimeError("TELEGRAM_BOT_TOKEN .env da ko‘rsatilmagan.")
    bot = Bot(token=token, default=DefaultBotProperties(parse_mode=ParseMode.HTML))
    dp = Dispatcher(storage=MemoryStorage())
    dp.include_router(router)
    await dp.start_polling(bot)


if __name__ == "__main__":
    asyncio.run(main())
