from django.db.models.signals import pre_save, post_save
from django.dispatch import receiver
from django.utils import timezone
from .models import MedicalRecord, MedicalRecordAudit
from apps.appointment.models import Appointment, AppointmentStatus
import logging

logger = logging.getLogger(__name__)

@receiver(pre_save, sender=MedicalRecord)
def track_medical_record_changes(sender, instance, **kwargs):
    """
    Signal to track changes to medical records for audit purposes
    """
    if instance.pk:  # If this is an update
        try:
            old_instance = MedicalRecord.objects.get(pk=instance.pk)
            
            # Fields to track
            tracked_fields = [
                'chief_complaint', 'observations', 'diagnosis', 
                'treatment_plan', 'notes', 'is_locked'
            ]
            
            for field in tracked_fields:
                old_value = getattr(old_instance, field)
                new_value = getattr(instance, field)
                
                if old_value != new_value:
                    # Get the current user from the thread local storage if available
                    user = getattr(instance, '_current_user', None)
                    
                    audit = MedicalRecordAudit(
                        medical_record=instance,
                        action='UPDATE',
                        field_modified=field,
                        old_value=old_value or '',
                        new_value=new_value or '',
                        performed_by=user
                    )
                    
                    # Try to get request info if available
                    request = getattr(instance, '_current_request', None)
                    if request:
                        audit.ip_address = request.META.get('REMOTE_ADDR', '')
                        audit.user_agent = request.META.get('HTTP_USER_AGENT', '')
                    
                    audit.save()
                    
                    logger.info(f"Medical record {instance.id} field '{field}' changed by {user}")
        
        except MedicalRecord.DoesNotExist:
            # This shouldn't happen, but just in case
            pass

@receiver(post_save, sender=Appointment)
def manage_medical_record_on_appointment_status_change(sender, instance, created, **kwargs):
    """
    Signal to manage medical records when appointment status changes
    - When appointment is completed, lock the medical record
    - When appointment is cancelled, delete the medical record if it exists and is empty
    """
    if not created:  # Only process on updates, not creation
        if instance.status == AppointmentStatus.COMPLETED:
            # Lock medical record when appointment is completed
            try:
                medical_record = MedicalRecord.objects.get(appointment=instance)
                
                if not medical_record.is_locked:
                    medical_record.is_locked = True
                    
                    # Set current user if available
                    if hasattr(instance, '_current_user'):
                        medical_record._current_user = instance._current_user
                    
                    # Set current request if available
                    if hasattr(instance, '_current_request'):
                        medical_record._current_request = instance._current_request
                    
                    medical_record.save()
                    
                    # Create audit log for locking
                    user = getattr(instance, '_current_user', instance.doctor)
                    
                    MedicalRecordAudit.objects.create(
                        medical_record=medical_record,
                        action='LOCK',
                        performed_by=user
                    )
                    
                    logger.info(f"Medical record {medical_record.id} locked due to appointment completion")
            except MedicalRecord.DoesNotExist:
                # If no medical record exists yet, create one
                medical_record = MedicalRecord.objects.create(
                    appointment=instance,
                    created_by=instance.doctor,
                    is_locked=True
                )
                
                # Create audit log for creation and locking
                MedicalRecordAudit.objects.create(
                    medical_record=medical_record,
                    action='CREATE',
                    performed_by=instance.doctor
                )
                
                MedicalRecordAudit.objects.create(
                    medical_record=medical_record,
                    action='LOCK',
                    performed_by=instance.doctor
                )
                
                logger.info(f"Created and locked medical record for completed appointment {instance.id}")
        
        elif instance.status == AppointmentStatus.CANCELLED:
            # Delete medical record if appointment is cancelled and the record is empty
            try:
                medical_record = MedicalRecord.objects.get(appointment=instance)
                
                # Only delete if it hasn't been modified (only has default values)
                is_empty = not any([
                    medical_record.chief_complaint,
                    medical_record.observations,
                    medical_record.diagnosis,
                    medical_record.treatment_plan,
                    medical_record.prescriptions.exists(),
                    medical_record.attachments.exists()
                ])
                
                if is_empty:
                    logger.info(f"Deleting empty medical record for cancelled appointment {instance.id}")
                    medical_record.delete()
            except MedicalRecord.DoesNotExist:
                pass