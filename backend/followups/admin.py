from django.contrib import admin

from .models import FollowUpRule, FollowUpTask

admin.site.register(FollowUpRule)
admin.site.register(FollowUpTask)
