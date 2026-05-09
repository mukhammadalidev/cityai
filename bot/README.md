# City Services AI — Telegram bot

## Sozlash

1. Backend migratsiya va `seed_demo` bajarilgan bo‘lsin.
2. Loyiha ildizidagi `.env` faylida:

```
TELEGRAM_BOT_TOKEN=...
OPENAI_API_KEY=   # ixtiyoriy
DEFAULT_CITY_SLUG=buxoro
```

3. Ishga tushirish:

```bash
cd bot
pip install -r requirements.txt
python main.py
```

`PYTHONPATH` avtomatik `backend` papkasini qo‘shadi.
