from django.db import models
from django.conf import settings
from django.utils import timezone
from datetime import timedelta
import uuid
import logging

logger = logging.getLogger(__name__)

# Constants for the application
APPOINTMENT_DURATION_MINUTES = 25  # Appointment duration in minutes
CANCELLATION_WINDOW_HOURS = 2  # Hours before appointment that cancellation is allowed

class AppointmentStatus(models.TextChoices):
    PENDING = "PENDING", "Pending"
    CONFIRMED = "CONFIRMED", "Confirmed"
    CANCELLED = "CANCELLED", "Cancelled"
    COMPLETED = "COMPLETED", "Completed"
    MISSED = "MISSED", "Missed"

class TimeOff(models.Model):
    """Model to track when doctors are unavailable for appointments"""
    doctor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='time_offs',
        limit_choices_to={'role': 'DOCTOR'}
    )
    start_time = models.DateTimeField()
    end_time = models.DateTimeField()
    reason = models.CharField(max_length=255, blank=True)
    is_approved = models.BooleanField(default=False, help_text="Approved by admin")
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['start_time']
        indexes = [
            models.Index(fields=['doctor', 'start_time', 'end_time']),
            models.Index(fields=['is_approved']),
        ]
    
    def __str__(self):
        return f"{self.doctor} - {self.start_time.strftime('%Y-%m-%d %H:%M')} to {self.end_time.strftime('%Y-%m-%d %H:%M')}"
    
    def clean(self):
        from django.core.exceptions import ValidationError
        
        # Ensure start time is before end time
        if self.start_time >= self.end_time:
            raise ValidationError("End time must be after start time")
        
        # Check for overlapping time off periods
        overlapping = TimeOff.objects.filter(
            doctor=self.doctor,
            start_time__lt=self.end_time,
            end_time__gt=self.start_time
        ).exclude(pk=self.pk)
        
        if overlapping.exists():
            overlap = overlapping.first()
            raise ValidationError(f"This time off period overlaps with an existing one: {overlap}")
    
    def approve(self):
        """Approve the time off request"""
        self.is_approved = True
        self.save()
        logger.info(f"Time off request {self.id} for Dr. {self.doctor} has been approved")
        return True

class Appointment(models.Model):
    """Model for doctor appointments"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    doctor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='doctor_appointments',
        limit_choices_to={'role': 'DOCTOR'}
    )
    patient = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='patient_appointments',
        limit_choices_to={'role': 'PATIENT'},
        null=True,
        blank=True
    )
    # For walk-in patients who don't have accounts
    patient_name = models.CharField(max_length=100, blank=True)
    patient_email = models.EmailField(blank=True)
    patient_phone = models.CharField(max_length=20, blank=True)
    
    appointment_time = models.DateTimeField()
    end_time = models.DateTimeField()
    reason = models.TextField(blank=True)
    
    status = models.CharField(
        max_length=10,
        choices=AppointmentStatus.choices,
        default=AppointmentStatus.PENDING
    )
    
    notes = models.TextField(blank=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name='created_appointments',
        null=True
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-appointment_time']
        indexes = [
            models.Index(fields=['doctor', 'appointment_time']),
            models.Index(fields=['patient', 'appointment_time']),
            models.Index(fields=['status']),
        ]
    
    def __str__(self):
        patient_info = self.patient.email if self.patient else self.patient_name
        return f"{patient_info} with Dr. {self.doctor.last_name} on {self.appointment_time.strftime('%Y-%m-%d %H:%M')}"
    
    def clean(self):
        from django.core.exceptions import ValidationError
        
        # Ensure appointment end time is after start time
        if self.end_time <= self.appointment_time:
            raise ValidationError("End time must be after appointment time")
        
        # Ensure either registered patient or walk-in info is provided
        if not self.patient and not (self.patient_name and self.patient_email):
            raise ValidationError("Either a registered patient or walk-in patient info must be provided")
        
        # Check for overlapping appointments for the doctor
        overlapping = Appointment.objects.filter(
            doctor=self.doctor,
            appointment_time__lt=self.end_time,
            end_time__gt=self.appointment_time,
            status__in=[AppointmentStatus.PENDING, AppointmentStatus.CONFIRMED]
        ).exclude(pk=self.pk)
        
        if overlapping.exists():
            overlap = overlapping.first()
            raise ValidationError(f"This appointment conflicts with an existing one at {overlap.appointment_time.strftime('%Y-%m-%d %H:%M')}")
        
        # Check if doctor has approved time off during this period
        time_off = TimeOff.objects.filter(
            doctor=self.doctor,
            is_approved=True,
            start_time__lt=self.end_time,
            end_time__gt=self.appointment_time
        )
        
        if time_off.exists():
            raise ValidationError("Doctor is not available during this time period")
    
    # === Status Management Methods ===
    
    def mark_confirmed(self):
        """Mark appointment as confirmed"""
        if self.status == AppointmentStatus.PENDING:
            self.status = AppointmentStatus.CONFIRMED
            self.save()
            logger.info(f"Appointment {self.id} confirmed")
            return True
        return False
        
    def mark_completed(self):
        """Mark appointment as completed"""
        if self.status in [AppointmentStatus.PENDING, AppointmentStatus.CONFIRMED]:
            self.status = AppointmentStatus.COMPLETED
            self.save()
            logger.info(f"Appointment {self.id} completed")
            return True
        return False
    
    def cancel(self):
        """Cancel the appointment if within cancellation window"""
        if not self.can_cancel_or_reschedule():
            return False
            
        self.status = AppointmentStatus.CANCELLED
        self.save()
        logger.info(f"Appointment {self.id} cancelled")
        return True
    
    def mark_missed(self):
        """Mark appointment as missed if it's past and still pending/confirmed"""
        if self.is_past() and self.status in [AppointmentStatus.PENDING, AppointmentStatus.CONFIRMED]:
            self.status = AppointmentStatus.MISSED
            self.save()
            logger.info(f"Appointment {self.id} marked as missed")
            return True
        return False
    
    # === Time-Related Methods ===
    
    def can_cancel_or_reschedule(self):
        """
        Check if appointment can be cancelled or rescheduled
        Business rule: Must be at least CANCELLATION_WINDOW_HOURS hours before appointment time
        """
        return timezone.now() < (self.appointment_time - timedelta(hours=CANCELLATION_WINDOW_HOURS))
    
    def is_past(self):
        """Check if appointment is in the past"""
        return timezone.now() > self.appointment_time
    
    # === Class Methods ===
    
    @classmethod
    def update_missed_appointments(cls, doctor=None):
        """
        Update status of past appointments to missed
        Can be filtered by doctor if provided
        Returns the number of appointments updated
        """
        query = cls.objects.filter(
            appointment_time__lt=timezone.now(),
            status__in=[AppointmentStatus.PENDING, AppointmentStatus.CONFIRMED]
        )
        
        if doctor:
            query = query.filter(doctor=doctor)
        
        count = 0
        for appointment in query:
            appointment.status = AppointmentStatus.MISSED
            appointment.save()
            count += 1
        
        if count > 0:
            logger.info(f"Automatically marked {count} appointments as missed")
        
        return count

class AvailableTimeSlot(models.Model):
    """Model to define when doctors are available for appointments"""
    doctor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='available_slots',
        limit_choices_to={'role': 'DOCTOR'}
    )
    day_of_week = models.IntegerField(choices=(
        (0, 'Monday'),
        (1, 'Tuesday'),
        (2, 'Wednesday'),
        (3, 'Thursday'),
        (4, 'Friday'),
        (5, 'Saturday'),
        (6, 'Sunday'),
    ))
    start_time = models.TimeField()
    end_time = models.TimeField()
    
    class Meta:
        ordering = ['day_of_week', 'start_time']
        unique_together = ['doctor', 'day_of_week', 'start_time']
        indexes = [
            models.Index(fields=['doctor', 'day_of_week']),
        ]
    
    def __str__(self):
        day_names = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
        return f"{self.doctor} - {day_names[self.day_of_week]} {self.start_time.strftime('%H:%M')} to {self.end_time.strftime('%H:%M')}"
    
    def clean(self):
        from django.core.exceptions import ValidationError
        
        # Ensure start time is before end time
        if self.start_time >= self.end_time:
            raise ValidationError("End time must be after start time")
        
        # Check for overlapping time slots
        overlapping = AvailableTimeSlot.objects.filter(
            doctor=self.doctor,
            day_of_week=self.day_of_week,
            start_time__lt=self.end_time,
            end_time__gt=self.start_time
        ).exclude(pk=self.pk)
        
        if overlapping.exists():
            raise ValidationError("This time slot overlaps with an existing one")
    
    @classmethod
    def create_weekly_schedule(cls, doctor, slot_data):
        """
        Create a full week schedule for a doctor
        slot_data format: [
            {'day': 0, 'start': '09:00', 'end': '17:00'},
            {'day': 1, 'start': '09:00', 'end': '17:00'},
            # etc.
        ]
        """
        from django.utils.dateparse import parse_time
        
        created_slots = []
        for slot in slot_data:
            day = slot.get('day')
            start = parse_time(slot.get('start'))
            end = parse_time(slot.get('end'))
            
            # Delete existing slots for this day
            cls.objects.filter(doctor=doctor, day_of_week=day).delete()
            
            # Create new slot
            new_slot = cls.objects.create(
                doctor=doctor,
                day_of_week=day,
                start_time=start,
                end_time=end
            )
            created_slots.append(new_slot)
        
        return created_slots