from django.core.mail import send_mail
from django.conf import settings
from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from .models import Medicine, OrderMedicine

def send_low_stock_alert(medicine):
    subject = f"Low Stock Alert: {medicine.name}"
    message = f"Stock for {medicine.name} is at {medicine.stock_quantity}, below threshold of {medicine.low_stock_threshold}."
    send_mail(
        subject,
        message,
        settings.DEFAULT_FROM_EMAIL,
        [settings.ADMIN_EMAIL],
        fail_silently=True
    )

@receiver(post_save, sender=OrderMedicine)
def update_order_billing_on_medicine_change(sender, instance, **kwargs):
    """
    Update the billing total_amount when an OrderMedicine is created or updated
    """
    order = instance.order
    if hasattr(order, 'billing'):
        order.billing.total_amount = order.calculate_total()
        order.billing.save()

@receiver(post_delete, sender=OrderMedicine)
def update_order_billing_on_medicine_delete(sender, instance, **kwargs):
    """
    Update the billing total_amount when an OrderMedicine is deleted
    """
    order = instance.order
    if hasattr(order, 'billing'):
        order.billing.total_amount = order.calculate_total()
        order.billing.save()