FROM python:3.11-slim

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    DJANGO_SETTINGS_MODULE=config.settings

RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    libjpeg62-turbo-dev zlib1g-dev \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .
COPY deploy-entrypoint.sh /deploy-entrypoint.sh
RUN chmod +x /deploy-entrypoint.sh

ENV DJANGO_SECRET_KEY=collectstatic-build-placeholder
RUN python manage.py collectstatic --noinput

EXPOSE 8000

ENTRYPOINT ["/deploy-entrypoint.sh"]
CMD ["gunicorn", "config.wsgi:application", "--bind", "0.0.0.0:8000", "--workers", "3"]
