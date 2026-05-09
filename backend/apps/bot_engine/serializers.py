from rest_framework import serializers

from .models import BotMessageLog, BotSession, BotTemplate


class BotTemplateSerializer(serializers.ModelSerializer):
    class Meta:
        model = BotTemplate
        fields = "__all__"
        read_only_fields = ("id", "created_at")


class BotSessionSerializer(serializers.ModelSerializer):
    class Meta:
        model = BotSession
        fields = "__all__"
        read_only_fields = ("id", "updated_at")


class BotMessageLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = BotMessageLog
        fields = "__all__"
        read_only_fields = ("id", "created_at")
