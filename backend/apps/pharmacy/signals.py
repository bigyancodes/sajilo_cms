from django.core.mail import send_mail
from django.conf import settings
from .models import Medicine

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