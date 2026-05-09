from rest_framework import serializers

from .models import ServiceCategory


class ServiceCategorySerializer(serializers.ModelSerializer):
    city_name = serializers.CharField(source="city.name", read_only=True)

    class Meta:
        model = ServiceCategory
        fields = "__all__"
        read_only_fields = ("id", "created_at")
