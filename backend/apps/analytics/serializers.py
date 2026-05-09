from rest_framework import serializers

from .models import AIUsage


class AIUsageSerializer(serializers.ModelSerializer):
    class Meta:
        model = AIUsage
        fields = "__all__"
        read_only_fields = ("id", "created_at")
