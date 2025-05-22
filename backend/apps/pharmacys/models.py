# pharmacy/models.py
from django.db import models
from django.contrib.auth import get_user_model
from django.core.validators import MinValueValidator, MaxValueValidator
from decimal import Decimal
import uuid
from django.utils import timezone

User = get_user_model()

class Category(models.Model):
    """Medicine categories for organization"""
    name = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    
    class Meta:
        verbose_name_plural = "Categories"
        ordering = ['name']
    
    def __str__(self):
        return self.name

class Medicine(models.Model):
    """Medicines/Products in the pharmacy"""
    class DOSAGE_FORMS(models.TextChoices):
        TABLET = 'TABLET', 'Tablet'
        CAPSULE = 'CAPSULE', 'Capsule'
        SYRUP = 'SYRUP', 'Syrup'
        INJECTION = 'INJECTION', 'Injection'
        CREAM = 'CREAM', 'Cream'
        OINTMENT = 'OINTMENT', 'Ointment'
        DROPS = 'DROPS', 'Drops'
        SPRAY = 'SPRAY', 'Spray'
        POWDER = 'POWDER', 'Powder'
        OTHER = 'OTHER', 'Other'
    
    name = models.CharField(max_length=200, db_index=True)
    generic_name = models.CharField(max_length=200, blank=True)
    manufacturer = models.CharField(max_length=200)
    category = models.ForeignKey(Category, on_delete=models.CASCADE, related_name='medicines')
    dosage_form = models.CharField(max_length=20, choices=DOSAGE_FORMS.choices)
    strength = models.CharField(max_length=50)  # e.g., "500mg", "10ml"
    unit_price = models.DecimalField(max_digits=10, decimal_places=2, validators=[MinValueValidator(0)])
    minimum_stock_level = models.PositiveIntegerField(default=10)
    prescription_required = models.BooleanField(default=False)
    description = models.TextField(blank=True)
    side_effects = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    updated_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='updated_medicines')
    
    class Meta:
        ordering = ['name']
        indexes = [
            models.Index(fields=['name', 'is_active']),
            models.Index(fields=['category', 'is_active']),
        ]
    
    def __str__(self):
        return f"{self.name} ({self.strength})"
    
    @property
    def current_stock(self):
        """Get current stock quantity"""
        return self.stock_movements.aggregate(
            total=models.Sum('quantity', default=0)
        )['total']
    
    @property
    def available_stock(self):
        """Get available stock (non-expired)"""
        return self.stock_batches.filter(
            expiry_date__gt=timezone.now().date(),
            quantity__gt=0
        ).aggregate(
            total=models.Sum('quantity', default=0)
        )['total']
    
    def is_in_stock(self):
        """Check if medicine is in stock and not expired"""
        return self.available_stock > 0
    
    def is_low_stock(self):
        """Check if medicine is below minimum stock level"""
        return self.available_stock <= self.minimum_stock_level

class StockBatch(models.Model):
    """Individual batches of medicines with expiry dates"""
    medicine = models.ForeignKey(Medicine, on_delete=models.CASCADE, related_name='stock_batches')
    batch_number = models.CharField(max_length=100)
    quantity = models.PositiveIntegerField(validators=[MinValueValidator(0)])
    cost_price = models.DecimalField(max_digits=10, decimal_places=2, validators=[MinValueValidator(0)])
    expiry_date = models.DateField()
    purchase_date = models.DateField(default=timezone.now)
    supplier = models.CharField(max_length=200, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    
    class Meta:
        unique_together = ['medicine', 'batch_number']
        ordering = ['expiry_date', 'created_at']
    
    def __str__(self):
        return f"{self.medicine.name} - Batch: {self.batch_number}"
    
    def is_expired(self):
        """Check if batch is expired"""
        return self.expiry_date <= timezone.now().date()
    
    def days_to_expiry(self):
        """Get days until expiry"""
        return (self.expiry_date - timezone.now().date()).days

class StockMovement(models.Model):
    """Track all stock movements (in/out)"""
    class MOVEMENT_TYPES(models.TextChoices):
        IN = 'IN', 'Stock In'
        OUT = 'OUT', 'Stock Out'
        ADJUSTMENT = 'ADJUSTMENT', 'Adjustment'
        EXPIRED = 'EXPIRED', 'Expired'
        RETURNED = 'RETURNED', 'Returned'
    
    medicine = models.ForeignKey(Medicine, on_delete=models.CASCADE, related_name='stock_movements')
    batch = models.ForeignKey(StockBatch, on_delete=models.CASCADE, null=True, blank=True)
    movement_type = models.CharField(max_length=20, choices=MOVEMENT_TYPES.choices)
    quantity = models.IntegerField()  # Positive for IN, negative for OUT
    reference = models.CharField(max_length=100, blank=True)  # Order ID, Supplier, etc.
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    
    class Meta:
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.medicine.name} - {self.movement_type}: {self.quantity}"

class Cart(models.Model):
    """Shopping cart for patients"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='cart')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"Cart - {self.user.email}"
    
    @property
    def total_amount(self):
        """Calculate total cart amount"""
        return sum(item.total_price for item in self.items.all())
    
    @property
    def total_items(self):
        """Get total number of items in cart"""
        return sum(item.quantity for item in self.items.all())

class CartItem(models.Model):
    """Individual items in a cart"""
    cart = models.ForeignKey(Cart, on_delete=models.CASCADE, related_name='items')
    medicine = models.ForeignKey(Medicine, on_delete=models.CASCADE)
    quantity = models.PositiveIntegerField(validators=[MinValueValidator(1)])
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        unique_together = ['cart', 'medicine']
    
    def __str__(self):
        return f"{self.cart.user.email} - {self.medicine.name} x{self.quantity}"
    
    @property
    def unit_price(self):
        """Get current unit price of medicine"""
        return self.medicine.unit_price
    
    @property
    def total_price(self):
        """Calculate total price for this item"""
        return self.unit_price * self.quantity

class Order(models.Model):
    """Customer orders"""
    class STATUS_CHOICES(models.TextChoices):
        PENDING = 'PENDING', 'Pending'
        CONFIRMED = 'CONFIRMED', 'Confirmed'
        PROCESSING = 'PROCESSING', 'Processing'
        READY = 'READY', 'Ready for Pickup/Delivery'
        SHIPPED = 'SHIPPED', 'Shipped'
        DELIVERED = 'DELIVERED', 'Delivered'
        CANCELLED = 'CANCELLED', 'Cancelled'
        RETURNED = 'RETURNED', 'Returned'
    
    class PAYMENT_STATUS_CHOICES(models.TextChoices):
        PENDING = 'PENDING', 'Pending'
        PAID = 'PAID', 'Paid'
        FAILED = 'FAILED', 'Failed'
        REFUNDED = 'REFUNDED', 'Refunded'
    
    class DELIVERY_TYPE_CHOICES(models.TextChoices):
        PICKUP = 'PICKUP', 'Pickup'
        DELIVERY = 'DELIVERY', 'Home Delivery'
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    order_number = models.CharField(max_length=20, unique=True, db_index=True)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='orders')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES.choices, default=STATUS_CHOICES.PENDING)
    payment_status = models.CharField(max_length=20, choices=PAYMENT_STATUS_CHOICES.choices, default=PAYMENT_STATUS_CHOICES.PENDING)
    delivery_type = models.CharField(max_length=20, choices=DELIVERY_TYPE_CHOICES.choices, default=DELIVERY_TYPE_CHOICES.PICKUP)
    
    # Delivery information
    delivery_address = models.TextField(blank=True)
    delivery_phone = models.CharField(max_length=20, blank=True)
    delivery_notes = models.TextField(blank=True)
    
    # Financial information
    subtotal = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0.00'))
    delivery_fee = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0.00'))
    tax_amount = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0.00'))
    total_amount = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0.00'))
    
    # Staff assignments
    processed_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='processed_orders')
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)
    confirmed_at = models.DateTimeField(null=True, blank=True)
    delivered_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', 'status']),
            models.Index(fields=['order_number']),
            models.Index(fields=['created_at', 'status']),
        ]
    
    def __str__(self):
        return f"Order {self.order_number} - {self.user.email}"
    
    def save(self, *args, **kwargs):
        if not self.order_number:
            # Generate order number
            import random
            import string
            while True:
                order_number = 'PH' + ''.join(random.choices(string.digits, k=8))
                if not Order.objects.filter(order_number=order_number).exists():
                    self.order_number = order_number
                    break
        super().save(*args, **kwargs)

class OrderItem(models.Model):
    """Individual items in an order"""
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name='items')
    medicine = models.ForeignKey(Medicine, on_delete=models.CASCADE)
    batch = models.ForeignKey(StockBatch, on_delete=models.CASCADE, null=True, blank=True)
    quantity = models.PositiveIntegerField(validators=[MinValueValidator(1)])
    unit_price = models.DecimalField(max_digits=10, decimal_places=2)  # Price at time of order
    total_price = models.DecimalField(max_digits=10, decimal_places=2)
    
    class Meta:
        unique_together = ['order', 'medicine']
    
    def __str__(self):
        return f"{self.order.order_number} - {self.medicine.name} x{self.quantity}"
    
    def save(self, *args, **kwargs):
        # Calculate total price
        self.total_price = self.unit_price * self.quantity
        super().save(*args, **kwargs)

class Payment(models.Model):
    """Payment records for orders"""
    class PAYMENT_METHODS(models.TextChoices):
        CASH = 'CASH', 'Cash'
        CARD = 'CARD', 'Credit/Debit Card'
        ESEWA = 'ESEWA', 'eSewa'
        KHALTI = 'KHALTI', 'Khalti'
        BANK_TRANSFER = 'BANK_TRANSFER', 'Bank Transfer'
        OTHER = 'OTHER', 'Other'
    
    class PAYMENT_STATUS_CHOICES(models.TextChoices):
        PENDING = 'PENDING', 'Pending'
        SUCCESS = 'SUCCESS', 'Success'
        FAILED = 'FAILED', 'Failed'
        CANCELLED = 'CANCELLED', 'Cancelled'
        REFUNDED = 'REFUNDED', 'Refunded'
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name='payments')
    payment_method = models.CharField(max_length=20, choices=PAYMENT_METHODS.choices)
    amount = models.DecimalField(max_digits=10, decimal_places=2, validators=[MinValueValidator(0)])
    status = models.CharField(max_length=20, choices=PAYMENT_STATUS_CHOICES.choices, default=PAYMENT_STATUS_CHOICES.PENDING)
    transaction_id = models.CharField(max_length=100, blank=True)
    payment_gateway_response = models.JSONField(blank=True, null=True)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    processed_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    
    class Meta:
        ordering = ['-created_at']
    
    def __str__(self):
        return f"Payment {self.id} - {self.order.order_number} - {self.amount}"

class AuditLog(models.Model):
    """Audit trail for all important actions"""
    class ACTION_TYPES(models.TextChoices):
        CREATE = 'CREATE', 'Created'
        UPDATE = 'UPDATE', 'Updated'
        DELETE = 'DELETE', 'Deleted'
        LOGIN = 'LOGIN', 'Logged In'
        LOGOUT = 'LOGOUT', 'Logged Out'
        ORDER_CREATED = 'ORDER_CREATED', 'Order Created'
        ORDER_CONFIRMED = 'ORDER_CONFIRMED', 'Order Confirmed'
        ORDER_FULFILLED = 'ORDER_FULFILLED', 'Order Fulfilled'
        PAYMENT_PROCESSED = 'PAYMENT_PROCESSED', 'Payment Processed'
        STOCK_ADDED = 'STOCK_ADDED', 'Stock Added'
        STOCK_REMOVED = 'STOCK_REMOVED', 'Stock Removed'
    
    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    action = models.CharField(max_length=30, choices=ACTION_TYPES.choices)
    model_name = models.CharField(max_length=50, blank=True)
    object_id = models.CharField(max_length=100, blank=True)
    object_repr = models.CharField(max_length=200, blank=True)
    changes = models.JSONField(blank=True, null=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    
    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', 'created_at']),
            models.Index(fields=['action', 'created_at']),
            models.Index(fields=['model_name', 'object_id']),
        ]
    
    def __str__(self):
        return f"{self.action} - {self.object_repr} by {self.user or 'System'} at {self.created_at}"


# Notification model removed