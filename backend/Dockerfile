# bookworm: trixie (python:3.11-slim default) o‘zgarishi va katta gcc zanjiridan qochish.
# Barcha requirements uchun PyPI da wheel bor — gcc/-dev shart emas; apt minimal.
FROM python:3.11-slim-bookworm

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    DJANGO_SETTINGS_MODULE=config.settings

COPY requirements.txt .
RUN pip install --no-cache-dir --prefer-binary -r requirements.txt

COPY . .
COPY deploy-entrypoint.sh /deploy-entrypoint.sh
RUN chmod +x /deploy-entrypoint.sh

ENV DJANGO_SECRET_KEY=collectstatic-build-placeholder
RUN python manage.py collectstatic --noinput

EXPOSE 8000

ENTRYPOINT ["/deploy-entrypoint.sh"]
CMD ["gunicorn", "config.wsgi:application", "--bind", "0.0.0.0:8000", "--workers", "3"]
