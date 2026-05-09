from rest_framework import viewsets
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from catalog.models import Item
from leads.models import Lead

from .models import Business
from .serializers import BusinessSerializer


class BusinessViewSet(viewsets.ModelViewSet):
    serializer_class = BusinessSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Business.objects.filter(owner=self.request.user).order_by("-created_at")

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def business_types_view(request):
    data = [
        {"key": "auto_salon", "label": "Avtosalon", "active": True},
        {"key": "education_center", "label": "O'quv markaz", "active": True},
        {"key": "shop", "label": "Do'kon", "active": True},
        {"key": "restaurant", "label": "Restoran", "active": False},
        {"key": "clinic", "label": "Klinika", "active": False},
        {"key": "beauty_salon", "label": "Go'zallik saloni", "active": False},
        {"key": "service", "label": "Usta xizmatlari", "active": False},
        {"key": "real_estate", "label": "Ko'chmas mulk", "active": False},
    ]
    return Response(data)


@api_view(["GET"])
@permission_classes([AllowAny])
def public_business_view(request, slug):
    business = Business.objects.filter(slug=slug, public_page_enabled=True).first()
    if not business:
        return Response({"detail": "Public sahifa topilmadi."}, status=404)
    items_qs = (
        Item.objects.filter(business=business, status=Item.Status.ACTIVE)
        .select_related("category")
        .order_by("-created_at")[:24]
    )
    items = []
    for item in items_qs:
        row = {
            "id": item.id,
            "title": item.title,
            "price": str(item.price),
            "currency": item.currency,
            "description": item.description,
            "metadata": item.metadata or {},
            "category": item.category.name if item.category else None,
        }
        if item.image:
            row["image"] = request.build_absolute_uri(item.image.url)
        items.append(row)
    logo_url = None
    if business.logo:
        logo_url = request.build_absolute_uri(business.logo.url)
    return Response(
        {
            "name": business.name,
            "slug": business.slug,
            "business_type": business.business_type,
            "brand_color": business.brand_color or "#2563eb",
            "phone": business.phone,
            "address": business.address,
            "working_hours": business.working_hours,
            "hero_title": business.hero_title,
            "hero_subtitle": business.hero_subtitle,
            "public_description": business.public_description,
            "logo_url": logo_url,
            "items": items,
        }
    )


@api_view(["POST"])
@permission_classes([AllowAny])
def public_business_lead_view(request, slug):
    business = Business.objects.filter(slug=slug, public_page_enabled=True).first()
    if not business:
        return Response({"detail": "Business topilmadi."}, status=404)
    lead = Lead.objects.create(
        business=business,
        name=request.data.get("name", "Noma'lum"),
        phone=request.data.get("phone", ""),
        message=request.data.get("message", ""),
        source=Lead.Source.LANDING_PAGE,
        lead_type="contact",
    )
    return Response({"message": "Ariza qabul qilindi.", "lead_id": lead.id}, status=201)
