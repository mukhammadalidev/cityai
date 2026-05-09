from django.apps import AppConfig


class ServiceCategoriesConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.service_categories"
    label = "service_categories"
    verbose_name = "Service categories"
