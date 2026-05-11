from decimal import Decimal
import secrets

from django.db.models import Count, Q, Sum
from django.db.models.functions import Coalesce
from django.shortcuts import get_object_or_404
from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from apps.accounts.models import User
from apps.bookings.models import Booking
from apps.catalog.models import Item
from apps.leads.models import Lead
from apps.orders.models import Order

from .models import Business
from .serializers import BusinessSerializer
from .services import accessible_business_ids, can_edit_business


class BusinessViewSet(viewsets.ModelViewSet):
    queryset = Business.objects.select_related("city", "category", "owner").all()
    serializer_class = BusinessSerializer

    def get_permissions(self):
        if self.action in ("list", "retrieve", "public_by_slug"):
            return [permissions.AllowAny()]
        return [permissions.IsAuthenticated()]

    def get_queryset(self):
        qs = super().get_queryset()
        city_id = self.request.query_params.get("city_id")
        category_id = self.request.query_params.get("category_id")
        st = self.request.query_params.get("status")
        search = self.request.query_params.get("search")
        if city_id:
            qs = qs.filter(city_id=city_id)
        if category_id:
            qs = qs.filter(category_id=category_id)
        mine_owner_list = (
            self.action == "list"
            and self.request.query_params.get("mine") == "1"
            and self.request.user.is_authenticated
            and self.request.user.role in (User.Role.BUSINESS_OWNER, User.Role.MANAGER)
        )
        # Super admin + mine=1: kabinetda biznes tanlash — barcha holatlar (moderatsiya)
        mine_super_list = (
            self.action == "list"
            and self.request.query_params.get("mine") == "1"
            and self.request.user.is_authenticated
            and self.request.user.role == User.Role.SUPER_ADMIN
        )
        if st:
            qs = qs.filter(status=st)
        elif mine_owner_list or mine_super_list:
            pass
        elif not self.request.user.is_authenticated or getattr(self.request.user, "role", None) != User.Role.SUPER_ADMIN:
            qs = qs.filter(status=Business.Status.ACTIVE)
        if search:
            qs = qs.filter(Q(name__icontains=search) | Q(phone__icontains=search) | Q(address__icontains=search))
        user = self.request.user
        if user.is_authenticated:
            ids = accessible_business_ids(user)
            if self.action in ("update", "partial_update", "destroy", "dashboard"):
                if user.role != User.Role.SUPER_ADMIN and ids is not None:
                    qs = qs.filter(id__in=ids)
            elif (
                self.action == "list"
                and self.request.query_params.get("mine") == "1"
                and user.role != User.Role.SUPER_ADMIN
                and ids is not None
            ):
                qs = qs.filter(id__in=ids)
        qs = qs.order_by("-is_featured", "-rating", "name")
        return qs

    def perform_create(self, serializer):
        user = self.request.user
        if user.role not in (User.Role.SUPER_ADMIN, User.Role.BUSINESS_OWNER):
            from rest_framework.exceptions import PermissionDenied

            raise PermissionDenied("Biznes yaratishga ruxsat yo‘q.")
        if user.role == User.Role.BUSINESS_OWNER:
            serializer.save(owner=user)
        else:
            serializer.save()

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        headers = self.get_success_headers(serializer.data)
        payload = dict(serializer.data)
        creds = getattr(serializer, "created_owner_credentials", None)
        if request.user.role == User.Role.SUPER_ADMIN and creds:
            payload["owner_credentials"] = creds
        return Response(payload, status=status.HTTP_201_CREATED, headers=headers)

    def perform_update(self, serializer):
        if not can_edit_business(self.request.user, serializer.instance):
            from rest_framework.exceptions import PermissionDenied

            raise PermissionDenied("Tahrirlashga ruxsat yo‘q.")
        serializer.save()

    def perform_destroy(self, instance):
        if not can_edit_business(self.request.user, instance):
            from rest_framework.exceptions import PermissionDenied

            raise PermissionDenied("O‘chirishga ruxsat yo‘q.")
        instance.delete()

    @action(detail=True, methods=["get"], permission_classes=[permissions.IsAuthenticated])
    def dashboard(self, request, pk=None):
        from django.utils import timezone

        from apps.students.models import Student, StudentGroup
        from apps.teachers.models import Teacher

        business = self.get_object()
        if not can_edit_business(request.user, business) and request.user.role != User.Role.SUPER_ADMIN:
            return Response({"detail": "Ruxsat yo‘q."}, status=status.HTTP_403_FORBIDDEN)
        today = timezone.localdate()
        bookings_qs = Booking.objects.filter(business=business)
        orders_qs = Order.objects.filter(business=business)
        data = {
            "leads_total": Lead.objects.filter(business=business).count(),
            "leads_new": Lead.objects.filter(business=business, status=Lead.Status.NEW).count(),
            "items_active": Item.objects.filter(business=business, status=Item.Status.ACTIVE).count(),
            "items_total": Item.objects.filter(business=business).count(),
            "items_sold": Item.objects.filter(business=business, status=Item.Status.SOLD).count(),
            "items_low_stock": Item.objects.filter(
                business=business, status=Item.Status.OUT_OF_STOCK
            ).count(),
            "bookings_new": bookings_qs.filter(status=Booking.Status.NEW).count(),
            "bookings_confirmed": bookings_qs.filter(status=Booking.Status.CONFIRMED).count(),
            "bookings_completed": bookings_qs.filter(status=Booking.Status.COMPLETED).count(),
            "bookings_cancelled": bookings_qs.filter(
                status__in=[Booking.Status.CANCELLED, Booking.Status.REJECTED]
            ).count(),
            "bookings_today": bookings_qs.filter(preferred_date=today).count(),
            "bookings_total": bookings_qs.count(),
            "bookings_test_drive": bookings_qs.filter(booking_type=Booking.BookingType.TEST_DRIVE).count(),
            "bookings_trial_lesson": bookings_qs.filter(booking_type=Booking.BookingType.TRIAL_LESSON).count(),
            "bookings_consultation": bookings_qs.filter(
                booking_type=Booking.BookingType.CONSULTATION
            ).count(),
            "bookings_service": bookings_qs.filter(booking_type=Booking.BookingType.SERVICE_BOOKING).count(),
            "leads_credit": Lead.objects.filter(business=business, lead_type=Lead.LeadType.CREDIT).count(),
            "leads_trade_in": Lead.objects.filter(business=business, lead_type=Lead.LeadType.TRADE_IN).count(),
            "orders_new": orders_qs.filter(status=Order.Status.NEW).count(),
            "orders_total": orders_qs.count(),
        }
        if business.business_type == Business.BusinessType.EDUCATION_CENTER:
            now = timezone.localtime()
            month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
            year_start = now.replace(month=1, day=1, hour=0, minute=0, second=0, microsecond=0)

            st_qs = Student.objects.filter(business=business)
            data["edu_students_total"] = st_qs.count()
            data["edu_students_active"] = st_qs.filter(status=Student.Status.ACTIVE).count()
            data["edu_students_new_month"] = st_qs.filter(created_at__gte=month_start).count()
            data["edu_students_new_year"] = st_qs.filter(created_at__gte=year_start).count()
            data["edu_groups_total"] = StudentGroup.objects.filter(business=business).count()
            data["edu_teachers_active"] = Teacher.objects.filter(
                business=business, status=Teacher.Status.ACTIVE
            ).count()

            active_st = st_qs.filter(status=Student.Status.ACTIVE)
            # Abonement (tuition_paid_until): bugun va keyingi kunlar = to'langan; o'tgan = to'lanmagan; null = kiritilmagan
            data["edu_tuition_paid_active"] = active_st.filter(tuition_paid_until__gte=today).count()
            data["edu_tuition_unpaid_active"] = active_st.filter(
                tuition_paid_until__isnull=False, tuition_paid_until__lt=today
            ).count()
            data["edu_tuition_unset_active"] = active_st.filter(tuition_paid_until__isnull=True).count()

            active_with_course = st_qs.filter(status=Student.Status.ACTIVE, course__isnull=False)
            pt = active_with_course.aggregate(s=Coalesce(Sum("course__price"), Decimal("0")))["s"]
            data["edu_potential_active_sum"] = str(pt)

            new_m = st_qs.filter(created_at__gte=month_start, course__isnull=False)
            pm = new_m.aggregate(s=Coalesce(Sum("course__price"), Decimal("0")))["s"]
            data["edu_new_enrollments_sum_month"] = str(pm)

            new_y = st_qs.filter(created_at__gte=year_start, course__isnull=False)
            py = new_y.aggregate(s=Coalesce(Sum("course__price"), Decimal("0")))["s"]
            data["edu_new_enrollments_sum_year"] = str(py)

            breakdown = []
            for item in (
                Item.objects.filter(business=business, status=Item.Status.ACTIVE)
                .annotate(
                    edu_students=Count(
                        "enrolled_students",
                        filter=Q(enrolled_students__status=Student.Status.ACTIVE),
                    )
                )
                .filter(edu_students__gt=0)
                .order_by("-edu_students")[:24]
            ):
                subtotal = (item.price or Decimal("0")) * item.edu_students
                breakdown.append(
                    {
                        "course_id": item.id,
                        "title": item.title,
                        "students": item.edu_students,
                        "price": str(item.price),
                        "currency": item.currency,
                        "subtotal": str(subtotal),
                    }
                )
            data["edu_course_breakdown"] = breakdown
        return Response(data)

    @action(detail=False, methods=["get"], url_path=r"slug/(?P<slug>[^/.]+)")
    def public_by_slug(self, request, slug=None):
        b = Business.objects.filter(slug=slug, status=Business.Status.ACTIVE).first()
        if not b:
            return Response({"detail": "Topilmadi."}, status=404)
        return Response(BusinessSerializer(b).data)

    @action(detail=True, methods=["post"], permission_classes=[permissions.IsAuthenticated], url_path="owner-credentials/reset")
    def reset_owner_credentials(self, request, pk=None):
        business = self.get_object()
        if request.user.role != User.Role.SUPER_ADMIN:
            return Response({"detail": "Faqat super admin."}, status=status.HTTP_403_FORBIDDEN)
        owner = business.owner
        new_username = (request.data.get("username") or "").strip()
        if new_username and new_username != owner.username:
            if User.objects.filter(username=new_username).exists():
                return Response(
                    {"detail": "Bu username band. Boshqasini kiriting."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            owner.username = new_username
        # One-time password shown only in this response.
        new_password = request.data.get("password") or secrets.token_urlsafe(10)
        owner.set_password(new_password)
        owner.save(update_fields=["username", "password"])
        return Response(
            {
                "business_id": business.id,
                "business_name": business.name,
                "username": owner.username,
                "password": new_password,
                "detail": "Login ma'lumotlari yangilandi. Parolni xavfsiz joyda saqlang.",
            },
            status=status.HTTP_200_OK,
        )
