from django.contrib import admin

from .models import BusinessSubscription, Plan

admin.site.register(Plan)
admin.site.register(BusinessSubscription)
