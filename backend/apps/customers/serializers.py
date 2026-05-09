from rest_framework import serializers

from .models import TelegramCustomer


class TelegramCustomerSerializer(serializers.ModelSerializer):
    class Meta:
        model = TelegramCustomer
        fields = "__all__"
        read_only_fields = ("id", "created_at", "last_seen")
