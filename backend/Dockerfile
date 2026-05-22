# bookworm: trixie (python:3.11-slim) o‘rniga barqaror bazaviy image.
# apt-get yo‘q — faqat pip wheel (VPSda deb.debian.org xatolari bilan build to‘xtamasin).
FROM python:3.11-slim-bookworm

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    DJANGO_SETTINGS_MODULE=config.settings

COPY requirements.txt .
# Ixtiyoriy indeks (docker-compose build args): sekin tarmoqda yaqin mirror sinab ko‘ring.
ARG PIP_INDEX_URL=https://pypi.org/simple
# set -x — logda qaysi bosqichda ekanini ko‘rish osonroq (to‘xtagan emas, sekin tortyapti).
RUN set -x \
  && pip install --no-cache-dir --upgrade pip \
  && pip install --no-cache-dir --prefer-binary \
    --default-timeout=300 --retries=15 \
    -i "${PIP_INDEX_URL}" \
    -r requirements.txt

COPY . .
COPY deploy-entrypoint.sh /deploy-entrypoint.sh
RUN chmod +x /deploy-entrypoint.sh

ENV DJANGO_SECRET_KEY=collectstatic-build-placeholder
RUN python manage.py collectstatic --noinput

EXPOSE 8000

ENTRYPOINT ["/deploy-entrypoint.sh"]
# SQLite: bir nechta worker yozuvlarni bloklaydi — productionda 1 worker.
CMD ["gunicorn", "config.wsgi:application", "--bind", "0.0.0.0:8000", "--workers", "1", "--timeout", "120"]
