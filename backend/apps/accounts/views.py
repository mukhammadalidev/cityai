from django.db import transaction
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView

from apps.businesses.models import Business, BusinessManager
from apps.businesses.serializers import BusinessSerializer
from apps.service_categories.models import ServiceCategory

from .models import User
from .serializers import BusinessOwnerRegisterSerializer, UserSerializer


class RegisterBusinessOwnerView(APIView):
    """POST /api/auth/register/ — biznes egasi + birinchi biznes (moderatsiya: pending)."""

    permission_classes = [permissions.AllowAny]

    def post(self, request):
        ser = BusinessOwnerRegisterSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        d = ser.validated_data
        category = ServiceCategory.objects.get(pk=d["category_id"], city_id=d["city_id"], is_active=True)
        with transaction.atomic():
            user = User.objects.create_user(
                username=d["username"],
                password=d["password"],
                role=User.Role.BUSINESS_OWNER,
                full_name=d.get("full_name") or "",
                phone=d.get("phone") or "",
            )
            business = Business.objects.create(
                owner=user,
                city_id=d["city_id"],
                category_id=d["category_id"],
                name=d["business_name"],
                phone=(d.get("business_phone") or d.get("phone") or "").strip(),
                description=d.get("description") or "",
                business_type=category.category_type,
                status=Business.Status.PENDING,
            )
        refresh = RefreshToken.for_user(user)
        return Response(
            {
                "refresh": str(refresh),
                "access": str(refresh.access_token),
                "user": UserSerializer(user).data,
                "business": BusinessSerializer(business).data,
            },
            status=status.HTTP_201_CREATED,
        )


class LoginView(TokenObtainPairView):
    """POST /api/auth/login/"""

    def post(self, request, *args, **kwargs):
        response = super().post(request, *args, **kwargs)
        if response.status_code != 200:
            return response
        user = User.objects.filter(username=request.data.get("username")).first()
        if user:
            response.data["user"] = UserSerializer(user).data
        return response


class MeView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        return Response(UserSerializer(request.user).data)


class ManagerListView(APIView):
    """Business managers for assignment (filtered by business for owners)."""

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        qs = User.objects.filter(role__in=[User.Role.MANAGER, User.Role.BUSINESS_OWNER], is_active=True)
        business_id = request.query_params.get("business_id")
        if business_id and request.user.role != User.Role.SUPER_ADMIN:
            allowed = Business.objects.filter(id=business_id, owner=request.user).exists()
            allowed |= BusinessManager.objects.filter(
                business_id=business_id, user=request.user, is_active=True
            ).exists()
            if not allowed:
                return Response({"detail": "Ruxsat yo‘q."}, status=status.HTTP_403_FORBIDDEN)
            ids = set(
                BusinessManager.objects.filter(business_id=business_id, is_active=True).values_list(
                    "user_id", flat=True
                )
            )
            owner_id = Business.objects.filter(id=business_id).values_list("owner_id", flat=True).first()
            if owner_id:
                ids.add(owner_id)
            qs = User.objects.filter(id__in=ids)
        return Response(UserSerializer(qs.order_by("full_name", "username")[:200], many=True).data)
