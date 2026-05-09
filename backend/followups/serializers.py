from rest_framework import serializers

from .models import FollowUpRule, FollowUpTask


class FollowUpRuleSerializer(serializers.ModelSerializer):
    class Meta:
        model = FollowUpRule
        fields = "__all__"


class FollowUpTaskSerializer(serializers.ModelSerializer):
    class Meta:
        model = FollowUpTask
        fields = "__all__"
