from rest_framework import serializers

from .models import MarketingContentRequest


class MarketingContentRequestSerializer(serializers.ModelSerializer):
    class Meta:
        model = MarketingContentRequest
        fields = "__all__"
