from django.db import models
from django.conf import settings
from apps.appointment.models import Appointment, AppointmentStatus
import uuid
import os

# Define the medical record status choices
class MedicalRecordStatus(models.TextChoices):
    PROCESSING = 'PROCESSING', 'Processing'
    COMPLETED = 'COMPLETED', 'Completed'

def medical_attachment_path(instance, filename):
    """Generate a unique file path for medical record attachments."""
    ext = filename.split('.')[-1]
    new_filename = f"{uuid.uuid4()}.{ext}"
    return f'medical_attachments/{instance.medical_record.id}/{new_filename}'

class MedicalRecord(models.Model):
    """Model for storing medical documentation for appointments"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    appointment = models.OneToOneField(
        Appointment,
        on_delete=models.CASCADE,
        related_name='medical_record'
    )
    chief_complaint = models.TextField(blank=True)
    observations = models.TextField(blank=True)
    diagnosis = models.TextField(blank=True)
    treatment_plan = models.TextField(blank=True)
    notes = models.TextField(blank=True)
    is_locked = models.BooleanField(default=False, help_text="Locked when appointment is completed")
    # Add status field to track if the record is in progress or completed
    status = models.CharField(
        max_length=20,
        choices=MedicalRecordStatus.choices,
        default=MedicalRecordStatus.PROCESSING,
        help_text="Status of the medical record"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name='created_medical_records',
        null=True
    )
    # Added new field for follow-up functionality
    previous_record = models.ForeignKey(
        'self',
        on_delete=models.SET_NULL,
        related_name='follow_up_records',
        null=True,
        blank=True
    )
    
    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['appointment']),
            models.Index(fields=['created_at']),
            models.Index(fields=['created_by']),
        ]
    
    def __str__(self):
        return f"Medical Record for {self.appointment}"
    
    def save(self, *args, **kwargs):
        # If the appointment is completed, set the is_locked flag
        # but we'll keep the record editable
        if self.appointment.status == AppointmentStatus.COMPLETED and not self.is_locked:
            self.is_locked = True
            # If the record is locked and no status is explicitly set, mark as completed
            if 'update_fields' not in kwargs or 'status' not in kwargs['update_fields']:
                self.status = MedicalRecordStatus.COMPLETED
        super().save(*args, **kwargs)
        
    def mark_as_completed(self):
        """Mark the medical record as completed"""
        self.status = MedicalRecordStatus.COMPLETED
        self.save(update_fields=['status', 'updated_at'])
        return True
        
    def mark_as_processing(self):
        """Mark the medical record as processing (in progress)"""
        self.status = MedicalRecordStatus.PROCESSING
        self.save(update_fields=['status', 'updated_at'])
        return True

class Prescription(models.Model):
    """Model for storing prescriptions within medical records"""
    medical_record = models.ForeignKey(
        MedicalRecord,
        on_delete=models.CASCADE,
        related_name='prescriptions'
    )
    medication = models.CharField(max_length=255)
    dosage = models.CharField(max_length=100)
    frequency = models.CharField(max_length=100)
    duration = models.CharField(max_length=100)
    instructions = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['medication']
    
    def __str__(self):
        return f"{self.medication} - {self.dosage}"

class MedicalAttachment(models.Model):
    """Model for storing attachments to medical records (lab reports, scans, etc.)"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    medical_record = models.ForeignKey(
        MedicalRecord,
        on_delete=models.CASCADE,
        related_name='attachments'
    )
    file = models.FileField(upload_to=medical_attachment_path)
    file_name = models.CharField(max_length=255)
    file_type = models.CharField(max_length=100, choices=(
        ('LAB_REPORT', 'Lab Report'),
        ('IMAGING', 'Imaging/Scan'),
        ('PRESCRIPTION', 'Prescription'),
        ('OTHER', 'Other Document')
    ))
    description = models.TextField(blank=True)
    uploaded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name='uploaded_medical_attachments',
        null=True
    )
    uploaded_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-uploaded_at']
    
    def __str__(self):
        return f"{self.get_file_type_display()} - {self.file_name}"
    
    def save(self, *args, **kwargs):
        if not self.file_name and self.file:
            self.file_name = os.path.basename(self.file.name)
        super().save(*args, **kwargs)
    
    @property
    def file_extension(self):
        if self.file_name:
            return self.file_name.split('.')[-1].lower()
        return ""

class MedicalRecordAudit(models.Model):
    """Model for tracking changes to medical records"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    medical_record = models.ForeignKey(
        MedicalRecord,
        on_delete=models.CASCADE,
        related_name='audit_logs'
    )
    action = models.CharField(max_length=50, choices=(
        ('CREATE', 'Created'),
        ('UPDATE', 'Updated'),
        ('VIEW', 'Viewed'),
        ('EXPORT', 'Exported'),
        ('LOCK', 'Locked'),
    ))
    field_modified = models.CharField(max_length=100, blank=True)
    old_value = models.TextField(blank=True)
    new_value = models.TextField(blank=True)
    performed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name='medical_record_actions',
        null=True
    )
    timestamp = models.DateTimeField(auto_now_add=True)
    ip_address = models.GenericIPAddressField(blank=True, null=True)
    user_agent = models.TextField(blank=True)
    
    class Meta:
        ordering = ['-timestamp']
        indexes = [
            models.Index(fields=['medical_record']),
            models.Index(fields=['timestamp']),
            models.Index(fields=['performed_by']),
        ]
    
    def __str__(self):
        return f"{self.get_action_display()} - {self.medical_record} - {self.timestamp}"