from rest_framework import serializers

from .models import AIUsage, MonthlyUsageSummary


class AIUsageSerializer(serializers.ModelSerializer):
    class Meta:
        model = AIUsage
        fields = "__all__"


class MonthlyUsageSummarySerializer(serializers.ModelSerializer):
    class Meta:
        model = MonthlyUsageSummary
        fields = "__all__"
