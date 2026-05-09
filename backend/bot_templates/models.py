from django.db import models


class BotTemplate(models.Model):
    business_type = models.CharField(max_length=30)
    name = models.CharField(max_length=120)
    menu_config = models.JSONField(default=dict, blank=True)
    prompt_template = models.TextField(blank=True)
    lead_rules = models.JSONField(default=dict, blank=True)
    is_active = models.BooleanField(default=True)

    def __str__(self) -> str:
        return f"{self.business_type}: {self.name}"
