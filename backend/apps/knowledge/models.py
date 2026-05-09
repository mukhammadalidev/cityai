from django.db import models

from apps.businesses.models import Business


class KnowledgeBase(models.Model):
    business = models.ForeignKey(Business, on_delete=models.CASCADE, related_name="knowledge_entries")
    title = models.CharField(max_length=255)
    content = models.TextField()
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-updated_at"]
