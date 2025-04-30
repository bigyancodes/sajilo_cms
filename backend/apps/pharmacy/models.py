from django.db import models
from django.core.validators import MinValueValidator
from django.utils import timezone
from django.core.exceptions import ValidationError
from apps.accounts.models import CustomUser, UserRoles
from decimal import Decimal

class Medicine(models.Model):
    name = models.CharField(max_length=255, unique=True)
    generic_name = models.CharField(max_length=255, blank=True)
    description = models.TextField(blank=True)
    manufacturer = models.CharField(max_length=255)
    manufacture_date = models.DateField()
    expiration_date = models.DateField()
    price = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0'))]
    )
    stock_quantity = models.PositiveIntegerField(default=0)
    low_stock_threshold = models.PositiveIntegerField(default=10)
    category = models.CharField(max_length=100, blank=True)
    barcode = models.CharField(max_length=50, unique=True, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['name']
        indexes = [
            models.Index(fields=['name']),
            models.Index(fields=['expiration_date']),
            models.Index(fields=['stock_quantity']),
            models.Index(fields=['barcode']),
        ]

    def __str__(self):
        return self.name

    @property
    def is_expired(self):
        return self.expiration_date < timezone.now().date()

    def clean(self):
        if self.manufacture_date > self.expiration_date:
            raise ValidationError("Manufacture date cannot be after expiration date")
        if self.stock_quantity < 0:
            raise ValidationError("Stock quantity cannot be negative")

    def adjust_stock(self, quantity, transaction_type, reason='', performed_by=None):
        if transaction_type not in ['ADD', 'REMOVE']:
            raise ValueError("Invalid transaction type")
        if transaction_type == 'REMOVE' and self.stock_quantity < quantity:
            raise ValueError("Insufficient stock")
        
        old_quantity = self.stock_quantity
        if transaction_type == 'ADD':
            self.stock_quantity += quantity
        else:
            self.stock_quantity -= quantity
        
        self.save()
        StockTransaction.objects.create(
            medicine=self,
            transaction_type=transaction_type,
            quantity=quantity,
            reason=reason,
            performed_by=performed_by
        )
        AuditLog.objects.create(
            action='UPDATE',
            model_name='Medicine',
            object_id=str(self.id),
            performed_by=performed_by,
            details=f"Stock changed from {old_quantity} to {self.stock_quantity} ({transaction_type})"
        )

        if self.stock_quantity <= self.low_stock_threshold:
            from .signals import send_low_stock_alert
            send_low_stock_alert(self)

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)

class Order(models.Model):
    STATUS_CHOICES = [
        ('PENDING', 'Pending'),
        ('FULFILLED', 'Fulfilled'),
        ('CANCELLED', 'Cancelled'),
    ]
    patient = models.ForeignKey(
        CustomUser,
        on_delete=models.CASCADE,
        related_name='pharmacy_orders',
        limit_choices_to={'role': UserRoles.PATIENT}
    )
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PENDING')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['patient', 'status']),
            models.Index(fields=['created_at']),
        ]

    def __str__(self):
        return f"Order {self.id} by {self.patient}"

    def calculate_total(self):
        return sum(
            om.quantity * om.medicine.price
            for om in self.ordermedicine_set.all()
        )

    def fulfill(self, performed_by=None):
        if self.status != 'PENDING':
            raise ValueError("Order is not pending")
        for order_medicine in self.ordermedicine_set.all():
            order_medicine.medicine.adjust_stock(
                order_medicine.quantity,
                'REMOVE',
                reason=f'Order {self.id} fulfilled',
                performed_by=performed_by
            )
            if order_medicine.prescription:
                order_medicine.prescription.fulfillment_status = 'FULFILLED_HERE'
                order_medicine.prescription.save()
        self.status = 'FULFILLED'
        self.save()
        AuditLog.objects.create(
            action='UPDATE',
            model_name='Order',
            object_id=str(self.id),
            performed_by=performed_by,
            details=f"Order fulfilled, status changed to {self.status}"
        )

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        if not hasattr(self, 'billing'):
            Billing.objects.create(
                order=self,
                total_amount=self.calculate_total()
            )
        else:
            self.billing.total_amount = self.calculate_total()
            self.billing.save()

class OrderMedicine(models.Model):
    order = models.ForeignKey(Order, on_delete=models.CASCADE)
    medicine = models.ForeignKey(Medicine, on_delete=models.CASCADE)
    quantity = models.PositiveIntegerField()
    prescription = models.ForeignKey(
        'ehr.Prescription',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='order_medicines'
    )

    class Meta:
        indexes = [
            models.Index(fields=['medicine', 'order']),
            models.Index(fields=['prescription']),
        ]

    def clean(self):
        if self.prescription and self.medicine != self.prescription.medicine:
            raise ValidationError("Medicine must match the prescription's medicine")
        if self.quantity <= 0:
            raise ValidationError("Quantity must be positive")

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)

class Billing(models.Model):
    order = models.OneToOneField(
        Order,
        on_delete=models.CASCADE,
        related_name='billing'
    )
    total_amount = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0'))]
    )
    payment_status = models.CharField(
        max_length=20,
        choices=[('PAID', 'Paid'), ('UNPAID', 'Unpaid')],
        default='UNPAID'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['order']),
            models.Index(fields=['payment_status']),
        ]

    def __str__(self):
        return f"Billing for Order {self.order.id}"

    def clean(self):
        if self.total_amount < 0:
            raise ValidationError("Total amount cannot be negative")

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)

class StockTransaction(models.Model):
    TRANSACTION_TYPES = [
        ('ADD', 'Add to Stock'),
        ('REMOVE', 'Remove from Stock'),
    ]
    medicine = models.ForeignKey(
        Medicine,
        on_delete=models.CASCADE,
        related_name='stock_transactions'
    )
    transaction_type = models.CharField(max_length=10, choices=TRANSACTION_TYPES)
    quantity = models.PositiveIntegerField()
    reason = models.CharField(max_length=255, blank=True)
    performed_by = models.ForeignKey(
        CustomUser,
        on_delete=models.SET_NULL,
        null=True,
        related_name='stock_transactions'
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['medicine', 'transaction_type']),
            models.Index(fields=['created_at']),
        ]

    def __str__(self):
        return f"{self.transaction_type} {self.quantity} of {self.medicine.name}"

    def clean(self):
        if self.quantity <= 0:
            raise ValidationError("Quantity must be positive")

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)

class AuditLog(models.Model):
    ACTION_CHOICES = [
        ('CREATE', 'Create'),
        ('UPDATE', 'Update'),
        ('DELETE', 'Delete'),
    ]
    action = models.CharField(max_length=50, choices=ACTION_CHOICES)
    model_name = models.CharField(max_length=50)
    object_id = models.CharField(max_length=50)
    performed_by = models.ForeignKey(
        CustomUser,
        on_delete=models.SET_NULL,
        null=True,
        related_name='pharmacy_audit_logs'
    )
    details = models.TextField(blank=True)
    timestamp = models.DateTimeField(auto_now_add=True)
    ip_address = models.GenericIPAddressField(blank=True, null=True)
    user_agent = models.TextField(blank=True)

    class Meta:
        ordering = ['-timestamp']
        indexes = [
            models.Index(fields=['model_name', 'object_id']),
            models.Index(fields=['timestamp']),
            models.Index(fields=['performed_by']),
        ]

    def __str__(self):
        return f"{self.action} on {self.model_name} {self.object_id} at {self.timestamp}"