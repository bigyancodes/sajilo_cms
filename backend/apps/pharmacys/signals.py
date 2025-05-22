# pharmacy/signals.py
import logging
from django.db.models.signals import post_save, pre_save, post_delete
from django.dispatch import receiver
from django.utils import timezone
from .models import Order, OrderItem, StockBatch, StockMovement, AuditLog, Payment, Medicine

logger = logging.getLogger(__name__)



@receiver(post_save, sender=Order)
def order_status_change_handler(sender, instance, created, **kwargs):
    """Handle order status changes"""
    if created:
        # Log order creation
        AuditLog.objects.create(
            user=instance.user,
            action=AuditLog.ACTION_TYPES.ORDER_CREATED,
            model_name='Order',
            object_id=str(instance.id),
            object_repr=f"Order {instance.order_number}"
        )
        
        # Notification creation removed
        
        # Pharmacist notifications removed

    else:
        # Handle status changes
        if instance.status == Order.STATUS_CHOICES.CONFIRMED:
            if not instance.confirmed_at:
                instance.confirmed_at = timezone.now()
                instance.save(update_fields=['confirmed_at'])
            
            AuditLog.objects.create(
                user=instance.processed_by or instance.user,
                action=AuditLog.ACTION_TYPES.ORDER_CONFIRMED,
                model_name='Order',
                object_id=str(instance.id),
                object_repr=f"Order {instance.order_number}"
            )
            
            # Order confirmation notification removed
        
        elif instance.status == Order.STATUS_CHOICES.PROCESSING:
            # Order processing notification removed
        
        elif instance.status == Order.STATUS_CHOICES.READY:
            # Order ready notification removed
        
        elif instance.status == Order.STATUS_CHOICES.SHIPPED:
            # Order shipped notification removed
        
        elif instance.status == Order.STATUS_CHOICES.DELIVERED:
            if not instance.delivered_at:
                instance.delivered_at = timezone.now()
                instance.save(update_fields=['delivered_at'])
            
            AuditLog.objects.create(
                user=instance.processed_by or instance.user,
                action=AuditLog.ACTION_TYPES.ORDER_FULFILLED,
                model_name='Order',
                object_id=str(instance.id),
                object_repr=f"Order {instance.order_number}"
            )
            
            # Order delivered notification removed
        
        elif instance.status == Order.STATUS_CHOICES.CANCELLED:
            # Order cancelled notification removed

@receiver(post_save, sender=Payment)
def payment_status_handler(sender, instance, created, **kwargs):
    """Handle payment status changes"""
    if created or instance.tracker.has_changed('status'):
        # Handle successful payment
        if instance.status == Payment.PAYMENT_STATUS_CHOICES.SUCCESS:
            logger.info(f"Payment successful for order #{instance.order.order_number}")
            # Payment notifications removed
        
        # Handle failed payment
        elif instance.status == Payment.PAYMENT_STATUS_CHOICES.FAILED:
            logger.info(f"Payment failed for order #{instance.order.order_number}")

@receiver(post_save, sender=StockBatch)
def stock_batch_created(sender, instance, created, **kwargs):
    """Create stock movement when new batch is added"""
    if created:
        StockMovement.objects.create(
            medicine=instance.medicine,
            batch=instance,
            movement_type=StockMovement.MOVEMENT_TYPES.IN,
            quantity=instance.quantity,
            reference=f"New Batch: {instance.batch_number}",
            created_by=instance.created_by
        )
        
        AuditLog.objects.create(
            user=instance.created_by,
            action=AuditLog.ACTION_TYPES.STOCK_ADDED,
            model_name='StockBatch',
            object_id=str(instance.id),
            object_repr=f"{instance.medicine.name} - Batch {instance.batch_number}"
        )

@receiver(pre_save, sender=OrderItem)
def validate_order_item_stock(sender, instance, **kwargs):
    """Validate stock availability before saving order item"""
    if instance.pk is None:  # New order item
        if instance.medicine.available_stock < instance.quantity:
            raise ValueError(f"Insufficient stock for {instance.medicine.name}")

@receiver(post_save, sender=OrderItem)
def update_stock_after_order(sender, instance, created, **kwargs):
    """Update stock when order item is created"""
    if created:
        # Deduct stock from the appropriate batch
        # This is handled in the OrderCreateSerializer, but we can add logging here
        AuditLog.objects.create(
            user=instance.order.user,
            action=AuditLog.ACTION_TYPES.STOCK_REMOVED,
            model_name='OrderItem',
            object_id=str(instance.id),
            object_repr=f"{instance.medicine.name} x{instance.quantity}"
        )
        
        # Check if stock is below minimum level and notify pharmacists
        medicine = instance.medicine
        available_stock = medicine.available_stock
        
        if available_stock <= medicine.minimum_stock_level:
            # Low stock notification logic removed
            logger.info(f"Low stock detected for {medicine.name}. Current stock: {available_stock}, Minimum: {medicine.minimum_stock_level}")

@receiver(post_delete, sender=StockBatch)
def log_stock_batch_deletion(sender, instance, **kwargs):
    """Log when stock batch is deleted"""
    AuditLog.objects.create(
        user=None,  # System action
        action=AuditLog.ACTION_TYPES.DELETE,
        model_name='StockBatch',
        object_id=str(instance.id),
        object_repr=f"{instance.medicine.name} - Batch {instance.batch_number}"
    )