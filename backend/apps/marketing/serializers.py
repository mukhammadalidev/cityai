from rest_framework import serializers

from .models import MarketingContentRequest


class MarketingContentRequestSerializer(serializers.ModelSerializer):
    class Meta:
        model = MarketingContentRequest
        fields = "__all__"
        read_only_fields = ("id", "created_at")
