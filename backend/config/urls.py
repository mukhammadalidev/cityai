from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/auth/", include("apps.accounts.urls")),
    path("api/", include("apps.city.urls")),
    path("api/", include("apps.service_categories.urls")),
    path("api/", include("apps.businesses.urls")),
    path("api/", include("apps.catalog.urls")),
    path("api/", include("apps.customers.urls")),
    path("api/", include("apps.leads.urls")),
    path("api/", include("apps.bookings.urls")),
    path("api/", include("apps.orders.urls")),
    path("api/", include("apps.knowledge.urls")),
    path("api/", include("apps.bot_engine.urls")),
    path("api/", include("apps.subscriptions.urls")),
    path("api/", include("apps.analytics.urls")),
    path("api/", include("apps.marketing.urls")),
    path("api/", include("apps.billing.urls")),
    path("api/", include("apps.teachers.urls")),
    path("api/", include("apps.students.urls")),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
