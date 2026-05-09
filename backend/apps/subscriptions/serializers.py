from rest_framework import serializers

from .models import BusinessSubscription, SubscriptionPlan


class SubscriptionPlanSerializer(serializers.ModelSerializer):
    class Meta:
        model = SubscriptionPlan
        fields = "__all__"
        read_only_fields = ("id", "created_at")


class BusinessSubscriptionSerializer(serializers.ModelSerializer):
    plan_name = serializers.CharField(source="plan.name", read_only=True)

    class Meta:
        model = BusinessSubscription
        fields = "__all__"
        read_only_fields = ("id", "created_at")
