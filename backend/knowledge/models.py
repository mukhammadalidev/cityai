from django.db import models

from businesses.models import Business

class KnowledgeBase(models.Model):
    business = models.ForeignKey(Business, on_delete=models.CASCADE, null=True, blank=True, related_name="knowledge_entries")
    title = models.CharField(max_length=255)
    content = models.TextField()
    business_type = models.CharField(max_length=30, blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self) -> str:
        return self.title
