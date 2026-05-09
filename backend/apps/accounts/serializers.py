from rest_framework import serializers

from apps.city.models import City
from apps.service_categories.models import ServiceCategory

from .models import User


class UserSerializer(serializers.ModelSerializer):
    portal_business_id = serializers.SerializerMethodField()
    portal_business_name = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = (
            "id",
            "username",
            "email",
            "role",
            "full_name",
            "phone",
            "telegram_id",
            "avatar",
            "is_active",
            "created_at",
            "portal_teacher",
            "portal_student",
            "portal_parent",
            "portal_business_id",
            "portal_business_name",
        )
        read_only_fields = ("id", "created_at", "portal_teacher", "portal_student", "portal_parent")

    def get_portal_business_id(self, obj):
        if obj.portal_teacher_id:
            return obj.portal_teacher.business_id
        if obj.portal_student_id:
            return obj.portal_student.business_id
        if obj.portal_parent_id:
            return obj.portal_parent.business_id
        return None

    def get_portal_business_name(self, obj):
        if obj.portal_teacher_id:
            return obj.portal_teacher.business.name
        if obj.portal_student_id:
            return obj.portal_student.business.name
        if obj.portal_parent_id:
            return obj.portal_parent.business.name
        return None


class BusinessOwnerRegisterSerializer(serializers.Serializer):
    username = serializers.CharField(max_length=150)
    password = serializers.CharField(write_only=True, min_length=6, style={"input_type": "password"})
    password_confirm = serializers.CharField(write_only=True, min_length=6, style={"input_type": "password"})
    full_name = serializers.CharField(max_length=255)
    phone = serializers.CharField(max_length=30, required=False, allow_blank=True, default="")
    city_id = serializers.IntegerField()
    category_id = serializers.IntegerField()
    business_name = serializers.CharField(max_length=255)
    business_phone = serializers.CharField(max_length=30, required=False, allow_blank=True, default="")
    description = serializers.CharField(required=False, allow_blank=True, default="")

    def validate_username(self, value):
        if User.objects.filter(username=value).exists():
            raise serializers.ValidationError("Bu login band.")
        return value

    def validate(self, attrs):
        if attrs["password"] != attrs["password_confirm"]:
            raise serializers.ValidationError({"password_confirm": "Parollar mos emas."})
        if not City.objects.filter(pk=attrs["city_id"], is_active=True).exists():
            raise serializers.ValidationError({"city_id": "Shahar topilmadi yoki faol emas."})
        if not ServiceCategory.objects.filter(
            pk=attrs["category_id"], city_id=attrs["city_id"], is_active=True
        ).exists():
            raise serializers.ValidationError(
                {"category_id": "Kategoriya topilmadi yoki tanlangan shaharga tegishli emas."}
            )
        return attrs
