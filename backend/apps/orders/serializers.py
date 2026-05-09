from decimal import Decimal

from rest_framework import serializers

from apps.catalog.models import Item

from .models import Order, OrderItem


class OrderItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = OrderItem
        fields = "__all__"
        read_only_fields = ("id",)


class OrderItemWriteSerializer(serializers.Serializer):
    item_id = serializers.IntegerField()
    quantity = serializers.IntegerField(min_value=1, default=1)


class OrderSerializer(serializers.ModelSerializer):
    lines = OrderItemSerializer(many=True, read_only=True)
    line_items = OrderItemWriteSerializer(many=True, write_only=True, required=False)

    class Meta:
        model = Order
        fields = "__all__"
        read_only_fields = ("id", "created_at", "total_amount")

    def create(self, validated_data):
        line_items = validated_data.pop("line_items", None) or []
        if not line_items:
            raise serializers.ValidationError({"line_items": "Kamida bitta mahsulot qatori kerak."})
        business = validated_data.get("business")
        if not business:
            raise serializers.ValidationError({"business": "Biznes majburiy."})
        total = Decimal("0")
        order = Order.objects.create(**validated_data, total_amount=0)
        resolved = []
        for row in line_items:
            item_id = row["item_id"]
            qty = int(row.get("quantity") or 1)
            item = Item.objects.filter(pk=item_id, business_id=business.id).first()
            if not item:
                order.delete()
                raise serializers.ValidationError({"line_items": f"Pozitsiya topilmadi: {item_id}"})
            price = item.price or Decimal("0")
            line_total = price * qty
            total += line_total
            resolved.append((item, qty, price))
        for item, qty, price in resolved:
            OrderItem.objects.create(
                order=order,
                item=item,
                quantity=qty,
                price=price,
                total=price * qty,
            )
        order.total_amount = total
        order.save(update_fields=["total_amount"])
        return order

    def update(self, instance, validated_data):
        validated_data.pop("line_items", None)
        return super().update(instance, validated_data)
