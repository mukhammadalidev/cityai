from rest_framework import serializers

from apps.accounts.models import User

from .models import Business, BusinessManager


class BusinessSerializer(serializers.ModelSerializer):
    city_name = serializers.CharField(source="city.name", read_only=True)
    category_name = serializers.CharField(source="category.name", read_only=True)
    owner_username = serializers.CharField(source="owner.username", read_only=True)
    owner_login = serializers.CharField(write_only=True, required=False, allow_blank=False)
    owner_password = serializers.CharField(write_only=True, required=False, allow_blank=False, min_length=6)

    class Meta:
        model = Business
        fields = "__all__"
        read_only_fields = ("id", "created_at", "updated_at", "views_count", "rating")

    def validate(self, attrs):
        request = self.context.get("request")
        role = getattr(getattr(request, "user", None), "role", None)
        owner = attrs.get("owner")
        owner_login = attrs.get("owner_login")
        owner_password = attrs.get("owner_password")

        if self.instance is None:
            if role == User.Role.SUPER_ADMIN:
                if owner and owner_login:
                    raise serializers.ValidationError(
                        {"owner_login": "Mavjud owner ID yoki yangi login — faqat bittasini kiriting."}
                    )
                if not owner and not owner_login:
                    raise serializers.ValidationError(
                        {"owner": "Yangi biznes uchun owner ID yoki yangi login/parol kiriting."}
                    )
                if owner_login and not owner_password:
                    raise serializers.ValidationError({"owner_password": "Yangi login uchun parol ham kiriting."})
                if owner_login and User.objects.filter(username=owner_login).exists():
                    raise serializers.ValidationError({"owner_login": "Bu login band, boshqasini kiriting."})
            else:
                if owner_login or owner_password:
                    raise serializers.ValidationError({"owner_login": "Yangi login yaratish faqat super admin uchun."})

        return attrs

    def create(self, validated_data):
        self.created_owner_credentials = None
        owner_login = validated_data.pop("owner_login", None)
        owner_password = validated_data.pop("owner_password", None)
        if owner_login:
            owner = User.objects.create_user(
                username=owner_login,
                password=owner_password,
                role=User.Role.BUSINESS_OWNER,
            )
            self.created_owner_credentials = {"username": owner_login, "password": owner_password}
            validated_data["owner"] = owner
        return super().create(validated_data)


class BusinessManagerSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source="user.username", read_only=True)

    class Meta:
        model = BusinessManager
        fields = "__all__"
        read_only_fields = ("id", "created_at")
