from django.db.models.signals import pre_save, post_save
from django.dispatch import receiver
from django.utils import timezone
from .models import Appointment, AppointmentStatus, TimeOff
import logging

logger = logging.getLogger(__name__)

@receiver(pre_save, sender=Appointment)
def update_missed_appointments_on_save(sender, instance, **kwargs):
    """
    Signal to automatically mark appointments as missed if they're in the past
    but still pending/confirmed
    """
    # Only check appointments that are pending/confirmed
    if instance.status in [AppointmentStatus.PENDING, AppointmentStatus.CONFIRMED]:
        if instance.appointment_time < timezone.now():
            instance.status = AppointmentStatus.MISSED
            logger.info(f"Automatically marked appointment {instance.id} as missed")

@receiver(post_save, sender=TimeOff)
def log_time_off_creation(sender, instance, created, **kwargs):
    """Log when time off is created or approved"""
    if created:
        logger.info(f"Time off created for Dr. {instance.doctor}: {instance.start_time} to {instance.end_time}")
    elif instance.is_approved:
        logger.info(f"Time off approved for Dr. {instance.doctor}: {instance.start_time} to {instance.end_time}")