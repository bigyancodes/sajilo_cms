# pharmacy/serializers.py
from rest_framework import serializers
from django.db import transaction
from decimal import Decimal
from django.utils import timezone
from .models import (
    Category, Medicine, StockBatch, StockMovement, Cart, CartItem,
    Order, OrderItem, Payment, AuditLog
)

class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ['id', 'name', 'description', 'created_at', 'created_by']
        read_only_fields = ['created_at', 'created_by']

class MedicineListSerializer(serializers.ModelSerializer):
    """Serializer for listing medicines (minimal data)"""
    category_name = serializers.CharField(source='category.name', read_only=True)
    current_stock = serializers.ReadOnlyField()
    available_stock = serializers.ReadOnlyField()
    is_in_stock = serializers.ReadOnlyField()
    is_low_stock = serializers.ReadOnlyField()
    
    class Meta:
        model = Medicine
        fields = [
            'id', 'name', 'generic_name', 'manufacturer', 'category_name',
            'dosage_form', 'strength', 'unit_price', 'prescription_required',
            'current_stock', 'available_stock', 'is_in_stock', 'is_low_stock'
        ]

class MedicineDetailSerializer(serializers.ModelSerializer):
    """Serializer for medicine details"""
    category_name = serializers.CharField(source='category.name', read_only=True)
    current_stock = serializers.ReadOnlyField()
    available_stock = serializers.ReadOnlyField()
    is_in_stock = serializers.ReadOnlyField()
    is_low_stock = serializers.ReadOnlyField()
    
    class Meta:
        model = Medicine
        fields = [
            'id', 'name', 'generic_name', 'manufacturer', 'category',
            'category_name', 'dosage_form', 'strength', 'unit_price',
            'minimum_stock_level', 'prescription_required', 'description',
            'side_effects', 'is_active', 'created_at', 'updated_at',
            'current_stock', 'available_stock', 'is_in_stock', 'is_low_stock'
        ]
        read_only_fields = ['created_at', 'updated_at']

class MedicineCreateUpdateSerializer(serializers.ModelSerializer):
    """Serializer for creating/updating medicines"""
    class Meta:
        model = Medicine
        fields = [
            'name', 'generic_name', 'manufacturer', 'category',
            'dosage_form', 'strength', 'unit_price', 'minimum_stock_level',
            'prescription_required', 'description', 'side_effects', 'is_active'
        ]
    
    def validate_unit_price(self, value):
        if value <= 0:
            raise serializers.ValidationError("Unit price must be greater than 0")
        return value

class StockBatchSerializer(serializers.ModelSerializer):
    medicine_name = serializers.CharField(source='medicine.name', read_only=True)
    is_expired = serializers.ReadOnlyField()
    days_to_expiry = serializers.ReadOnlyField()
    
    class Meta:
        model = StockBatch
        fields = [
            'id', 'medicine', 'medicine_name', 'batch_number', 'quantity',
            'cost_price', 'expiry_date', 'purchase_date', 'supplier', 'created_at',
            'is_expired', 'days_to_expiry'
        ]
        read_only_fields = ['created_at']
    
    def validate_expiry_date(self, value):
        if value <= timezone.now().date():
            raise serializers.ValidationError("Expiry date must be in the future")
        return value

class StockMovementSerializer(serializers.ModelSerializer):
    medicine_name = serializers.CharField(source='medicine.name', read_only=True)
    batch_number = serializers.CharField(source='batch.batch_number', read_only=True)
    created_by_name = serializers.CharField(source='created_by.get_full_name', read_only=True)
    
    class Meta:
        model = StockMovement
        fields = [
            'id', 'medicine', 'medicine_name', 'batch', 'batch_number',
            'movement_type', 'quantity', 'reference', 'notes', 'created_at',
            'created_by_name'
        ]
        read_only_fields = ['created_at', 'created_by']

class CartItemSerializer(serializers.ModelSerializer):
    medicine_name = serializers.CharField(source='medicine.name', read_only=True)
    medicine_strength = serializers.CharField(source='medicine.strength', read_only=True)
    unit_price = serializers.ReadOnlyField()
    total_price = serializers.ReadOnlyField()
    is_available = serializers.SerializerMethodField()
    
    class Meta:
        model = CartItem
        fields = [
            'id', 'medicine', 'medicine_name', 'medicine_strength',
            'quantity', 'unit_price', 'total_price', 'created_at',
            'updated_at', 'is_available'
        ]
        read_only_fields = ['created_at', 'updated_at']
    
    def get_is_available(self, obj):
        """Check if medicine is available in required quantity"""
        return obj.medicine.available_stock >= obj.quantity
    
    def validate_quantity(self, value):
        if value <= 0:
            raise serializers.ValidationError("Quantity must be greater than 0")
        return value
    
    def validate(self, data):
        medicine = data.get('medicine')
        quantity = data.get('quantity')
        
        if medicine and quantity and medicine.available_stock < quantity:
            raise serializers.ValidationError(
                f"Only {medicine.available_stock} units available for {medicine.name}"
            )
        
        return data

class CartSerializer(serializers.ModelSerializer):
    items = CartItemSerializer(many=True, read_only=True)
    total_amount = serializers.ReadOnlyField()
    total_items = serializers.ReadOnlyField()
    
    class Meta:
        model = Cart
        fields = [
            'id', 'user', 'items', 'total_amount', 'total_items',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['user', 'created_at', 'updated_at']

class OrderItemSerializer(serializers.ModelSerializer):
    medicine_name = serializers.CharField(source='medicine.name', read_only=True)
    medicine_strength = serializers.CharField(source='medicine.strength', read_only=True)
    batch_number = serializers.CharField(source='batch.batch_number', read_only=True)
    
    class Meta:
        model = OrderItem
        fields = [
            'id', 'medicine', 'medicine_name', 'medicine_strength',
            'batch', 'batch_number', 'quantity', 'unit_price', 'total_price'
        ]

class OrderListSerializer(serializers.ModelSerializer):
    """Serializer for listing orders"""
    user_email = serializers.CharField(source='user.email', read_only=True)
    user_name = serializers.CharField(source='user.get_full_name', read_only=True)
    items_count = serializers.SerializerMethodField()
    
    class Meta:
        model = Order
        fields = [
            'id', 'order_number', 'user_email', 'user_name', 'status',
            'payment_status', 'delivery_type', 'total_amount', 'created_at',
            'items_count'
        ]
    
    def get_items_count(self, obj):
        return obj.items.count()

class OrderDetailSerializer(serializers.ModelSerializer):
    """Serializer for order details"""
    user_email = serializers.CharField(source='user.email', read_only=True)
    user_name = serializers.CharField(source='user.get_full_name', read_only=True)
    items = OrderItemSerializer(many=True, read_only=True)
    processed_by_name = serializers.CharField(source='processed_by.get_full_name', read_only=True)
    
    class Meta:
        model = Order
        fields = [
            'id', 'order_number', 'user', 'user_email', 'user_name',
            'status', 'payment_status', 'delivery_type', 'delivery_address',
            'delivery_phone', 'delivery_notes', 'subtotal', 'delivery_fee',
            'tax_amount', 'total_amount', 'processed_by', 'processed_by_name',
            'created_at', 'updated_at', 'confirmed_at', 'delivered_at', 'items'
        ]
        read_only_fields = [
            'order_number', 'user', 'subtotal', 'total_amount',
            'created_at', 'updated_at', 'confirmed_at', 'delivered_at'
        ]

class OrderCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating orders"""
    class Meta:
        model = Order
        fields = [
            'delivery_type', 'delivery_address', 'delivery_phone', 'delivery_notes'
        ]
    
    def validate_delivery_address(self, value):
        delivery_type = self.initial_data.get('delivery_type')
        if delivery_type == 'DELIVERY' and not value:
            raise serializers.ValidationError("Delivery address is required for home delivery")
        return value
    
    def create(self, validated_data):
        # Ensure we have the request context
        if 'request' not in self.context:
            raise serializers.ValidationError("Internal error: Request context missing")
            
        user = self.context['request'].user
        
        # Get user's cart
        try:
            cart = user.cart
        except Cart.DoesNotExist:
            # Create an empty cart if it doesn't exist
            cart = Cart.objects.create(user=user)
            raise serializers.ValidationError("Your cart is empty. Please add items before checkout.")
        
        # Check if cart has items
        if not cart.items.exists():
            raise serializers.ValidationError("Your cart is empty. Please add items before checkout.")
        
        with transaction.atomic():
            try:
                # Calculate totals
                subtotal = cart.total_amount
                tax_amount = subtotal * Decimal('0.13')  # 13% tax
                delivery_fee = Decimal('100.00') if validated_data.get('delivery_type') == 'DELIVERY' else Decimal('0.00')
                total_amount = subtotal + tax_amount + delivery_fee
                
                # Create order
                order = Order.objects.create(
                    user=user,
                    subtotal=subtotal,
                    tax_amount=tax_amount,
                    delivery_fee=delivery_fee,
                    total_amount=total_amount,
                    **validated_data
                )
                
                # Create order items without complex batch handling
                for cart_item in cart.items.all():
                    # Simple stock check
                    medicine = cart_item.medicine
                    
                    # Find a valid batch for the order item
                    valid_batch = StockBatch.objects.filter(
                        medicine=medicine,
                        quantity__gt=0,
                        expiry_date__gt=timezone.now().date()
                    ).order_by('expiry_date').first()
                    
                    if not valid_batch:
                        raise serializers.ValidationError(f"No valid batch found for {medicine.name}")
                    
                    # Create order item with batch reference
                    OrderItem.objects.create(
                        order=order,
                        medicine=medicine,
                        batch=valid_batch,
                        quantity=cart_item.quantity,
                        unit_price=medicine.unit_price,
                        total_price=medicine.unit_price * cart_item.quantity
                    )
                    
                    # Find a valid batch for the stock movement
                    valid_batch = StockBatch.objects.filter(
                        medicine=medicine,
                        quantity__gt=0,
                        expiry_date__gt=timezone.now().date()
                    ).order_by('expiry_date').first()
                    
                    if not valid_batch:
                        raise serializers.ValidationError(f"No valid batch found for {medicine.name}")
                    
                    # Create a stock movement with batch reference
                    StockMovement.objects.create(
                        medicine=medicine,
                        batch=valid_batch,
                        movement_type='OUT',
                        quantity=-cart_item.quantity,  # Negative for outgoing stock
                        reference=f"Order {order.order_number}",
                        created_by=user
                    )
                    
                    # Update batch quantity
                    valid_batch.quantity -= cart_item.quantity
                    valid_batch.save()
                
                # Clear cart
                cart.items.all().delete()
                
                return order
                
            except Exception as e:
                # Log any errors
                logger.error(f"Order creation failed: {str(e)}")
                import traceback
                logger.error(traceback.format_exc())
                raise serializers.ValidationError(f"Error creating order: {str(e)}")

class PaymentSerializer(serializers.ModelSerializer):
    order_number = serializers.CharField(source='order.order_number', read_only=True)
    processed_by_name = serializers.CharField(source='processed_by.get_full_name', read_only=True)
    
    class Meta:
        model = Payment
        fields = [
            'id', 'order', 'order_number', 'payment_method', 'amount',
            'status', 'transaction_id', 'notes', 'created_at', 'updated_at',
            'processed_by_name'
        ]
        read_only_fields = ['created_at', 'updated_at']

class AuditLogSerializer(serializers.ModelSerializer):
    user_name = serializers.CharField(source='user.get_full_name', read_only=True)
    user_email = serializers.CharField(source='user.email', read_only=True)
    
    class Meta:
        model = AuditLog
        fields = [
            'id', 'user', 'user_name', 'user_email', 'action', 'model_name',
            'object_id', 'object_repr', 'changes', 'ip_address', 'user_agent',
            'created_at'
        ]
        read_only_fields = '__all__'

# Report Serializers
class LowStockReportSerializer(serializers.Serializer):
    """Serializer for low stock report"""
    medicine_id = serializers.IntegerField()
    medicine_name = serializers.CharField()
    current_stock = serializers.IntegerField()
    minimum_stock_level = serializers.IntegerField()
    shortage = serializers.IntegerField()

class ExpiryReportSerializer(serializers.Serializer):
    """Serializer for expiry report"""
    batch_id = serializers.IntegerField()
    medicine_name = serializers.CharField()
    batch_number = serializers.CharField()
    quantity = serializers.IntegerField()
    expiry_date = serializers.DateField()
    days_to_expiry = serializers.IntegerField()
    is_expired = serializers.BooleanField()

class SalesReportSerializer(serializers.Serializer):
    """Serializer for sales report"""
    period = serializers.CharField()
    total_orders = serializers.IntegerField()
    total_revenue = serializers.DecimalField(max_digits=10, decimal_places=2)
    total_items_sold = serializers.IntegerField()
    average_order_value = serializers.DecimalField(max_digits=10, decimal_places=2)


# NotificationSerializer removed