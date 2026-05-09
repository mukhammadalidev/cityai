from rest_framework import serializers

from .models import Lead, LeadActivity, TestDrive, TradeInRequest


class LeadSerializer(serializers.ModelSerializer):
    class Meta:
        model = Lead
        fields = "__all__"


class TestDriveSerializer(serializers.ModelSerializer):
    class Meta:
        model = TestDrive
        fields = "__all__"


class TradeInRequestSerializer(serializers.ModelSerializer):
    class Meta:
        model = TradeInRequest
        fields = "__all__"


class LeadActivitySerializer(serializers.ModelSerializer):
    class Meta:
        model = LeadActivity
        fields = "__all__"
