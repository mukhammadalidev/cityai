from rest_framework import serializers

from .models import BrandingSettings


class BrandingSettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = BrandingSettings
        fields = "__all__"
