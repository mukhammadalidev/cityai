from django.contrib import admin

from .models import AIUsage, MonthlyUsageSummary

admin.site.register(AIUsage)
admin.site.register(MonthlyUsageSummary)
