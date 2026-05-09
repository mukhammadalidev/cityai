from rest_framework import serializers
from django.utils.text import slugify

from .models import Item, ItemImage


class ItemImageSerializer(serializers.ModelSerializer):
    class Meta:
        model = ItemImage
        fields = "__all__"
        read_only_fields = ("id", "created_at")


class ItemSerializer(serializers.ModelSerializer):
    images = ItemImageSerializer(many=True, read_only=True)
    slug = serializers.SlugField(required=False, allow_blank=True)

    def _build_unique_slug(self, business_id: int, raw_slug: str) -> str:
        base = (raw_slug or "item")[:150]
        candidate = base
        suffix = 2
        qs = Item.objects.filter(business_id=business_id)
        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)
        while qs.filter(slug=candidate).exists():
            suffix_text = f"-{suffix}"
            candidate = f"{base[: max(1, 150 - len(suffix_text))]}{suffix_text}"
            suffix += 1
        return candidate

    def validate(self, attrs):
        business = attrs.get("business") or getattr(self.instance, "business", None)
        if business:
            slug_value = attrs.get("slug")
            if slug_value:
                prepared_slug = slugify(slug_value)
            else:
                title_value = attrs.get("title") or getattr(self.instance, "title", "")
                prepared_slug = slugify(title_value)
            attrs["slug"] = self._build_unique_slug(business.id, prepared_slug)
        return attrs

    class Meta:
        model = Item
        fields = "__all__"
        read_only_fields = ("id", "created_at", "updated_at", "views_count")
        validators = []
