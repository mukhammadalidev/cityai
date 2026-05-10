from datetime import timedelta

from rest_framework import serializers

from .models import BusinessSubscription, SubscriptionPlan


class SubscriptionPlanSerializer(serializers.ModelSerializer):
    class Meta:
        model = SubscriptionPlan
        fields = "__all__"
        read_only_fields = ("id", "created_at")


class BusinessSubscriptionSerializer(serializers.ModelSerializer):
    plan_name = serializers.CharField(source="plan.name", read_only=True)
    plan_code = serializers.CharField(source="plan.code", read_only=True)
    trial_days = serializers.IntegerField(source="plan.trial_days", read_only=True)
    trial_ends_on = serializers.SerializerMethodField()

    class Meta:
        model = BusinessSubscription
        fields = (
            "id",
            "business",
            "plan",
            "plan_name",
            "plan_code",
            "trial_days",
            "trial_ends_on",
            "status",
            "start_date",
            "end_date",
            "next_payment_date",
            "created_at",
        )
        read_only_fields = ("id", "created_at")

    def get_trial_ends_on(self, obj):
        p = obj.plan
        td = int(getattr(p, "trial_days", 0) or 0)
        if p.code == SubscriptionPlan.Code.DEMO and td > 0:
            return obj.start_date + timedelta(days=td)
        return None
