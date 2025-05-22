from rest_framework import serializers
from django.utils import timezone
from django.contrib.auth import get_user_model
from .models import Appointment, TimeOff, AvailableTimeSlot, AppointmentStatus, PaymentStatus, PaymentMethod, AppointmentPricing, Bill
from .models import APPOINTMENT_DURATION_MINUTES, CANCELLATION_WINDOW_HOURS
from django.db.models import Q
from datetime import timedelta

User = get_user_model()
# Fixed TimeOffSerializer (paste this in your serializers.py file)
class TimeOffSerializer(serializers.ModelSerializer):
    doctor_name = serializers.SerializerMethodField()
    is_approved = serializers.BooleanField(read_only=True)
    
    class Meta:
        model = TimeOff
        fields = ['id', 'doctor', 'doctor_name', 'start_time', 'end_time', 'reason', 'is_approved', 'created_at']
        read_only_fields = ['created_at', 'is_approved']
        extra_kwargs = {
            'doctor': {'required': False}  # Make doctor field optional
        }
    
    def get_doctor_name(self, obj):
        return f"Dr. {obj.doctor.first_name} {obj.doctor.last_name}"
    
    def to_representation(self, instance):
        representation = super().to_representation(instance)
        
        # Convert time fields to ISO format with timezone info
        if hasattr(instance, 'start_time') and instance.start_time:
            # Make sure it's timezone-aware
            if instance.start_time.tzinfo is None:
                start_time = timezone.make_aware(instance.start_time, timezone.utc)
            else:
                start_time = instance.start_time
            
            representation['start_time'] = start_time.isoformat()
        
        if hasattr(instance, 'end_time') and instance.end_time:
            # Make sure it's timezone-aware
            if instance.end_time.tzinfo is None:
                end_time = timezone.make_aware(instance.end_time, timezone.utc)
            else:
                end_time = instance.end_time
            
            representation['end_time'] = end_time.isoformat()
        
        return representation
    
    def validate(self, data):
        if data['start_time'] >= data['end_time']:
            raise serializers.ValidationError("End time must be after start time")
        if data['start_time'] < timezone.now():
            raise serializers.ValidationError("Cannot create time off in the past")
        
        # Only check for doctor if not provided in data
        doctor = data.get('doctor')
        if doctor and doctor.role != 'DOCTOR':
            raise serializers.ValidationError("Invalid doctor selected")
        
        # If doctor is provided, check for overlapping time offs
        if doctor:
            overlapping = TimeOff.objects.filter(
                doctor=doctor,
                start_time__lt=data['end_time'],
                end_time__gt=data['start_time']
            )
            if self.instance:
                overlapping = overlapping.exclude(pk=self.instance.pk)
            if overlapping.exists():
                overlap = overlapping.first()
                overlap_time = f"{overlap.start_time.strftime('%Y-%m-%d %H:%M')} to {overlap.end_time.strftime('%Y-%m-%d %H:%M')}"
                raise serializers.ValidationError(f"This time off period overlaps with an existing one ({overlap_time})")
        
        return data
        
class TimeOffApprovalSerializer(serializers.ModelSerializer):
    class Meta:
        model = TimeOff
        fields = ['id', 'is_approved']
        read_only_fields = ['id']

class AvailableTimeSlotSerializer(serializers.ModelSerializer):
    day_name = serializers.SerializerMethodField()
    
    class Meta:
        model = AvailableTimeSlot
        fields = ['id', 'doctor', 'day_of_week', 'day_name', 'start_time', 'end_time']
    
    def get_day_name(self, obj):
        day_names = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
        return day_names[obj.day_of_week]
    
    def validate(self, data):
        if data['start_time'] >= data['end_time']:
            raise serializers.ValidationError("End time must be after start time")
        doctor = data.get('doctor')
        if not doctor or doctor.role != 'DOCTOR':
            raise serializers.ValidationError("Invalid doctor selected")
        overlapping = AvailableTimeSlot.objects.filter(
            doctor=doctor,
            day_of_week=data['day_of_week'],
            start_time__lt=data['end_time'],
            end_time__gt=data['start_time']
        )
        if self.instance:
            overlapping = overlapping.exclude(pk=self.instance.pk)
        if overlapping.exists():
            raise serializers.ValidationError("This time slot overlaps with an existing one")
        return data

class WeeklyScheduleSerializer(serializers.Serializer):
    doctor_id = serializers.IntegerField()
    schedule = serializers.ListField(
        child=serializers.DictField(
            child=serializers.CharField(),
            allow_empty=True
        )
    )
    
    def validate(self, data):
        try:
            doctor = User.objects.get(id=data['doctor_id'], role='DOCTOR')
            data['doctor'] = doctor
        except User.DoesNotExist:
            raise serializers.ValidationError("Doctor not found")
        valid_days = range(0, 7)
        for slot in data['schedule']:
            if 'day' not in slot or 'start' not in slot or 'end' not in slot:
                raise serializers.ValidationError("Each schedule entry must have day, start, and end")
            try:
                day = int(slot['day'])
                if day not in valid_days:
                    raise serializers.ValidationError(f"Day must be between 0-6, got {day}")
                slot['day'] = day
            except ValueError:
                raise serializers.ValidationError("Day must be a number between 0-6")
        return data
    
    def create(self, validated_data):
        doctor = validated_data['doctor']
        schedule = validated_data['schedule']
        return AvailableTimeSlot.create_weekly_schedule(doctor, schedule)

class AppointmentPricingSerializer(serializers.ModelSerializer):
    doctor_name = serializers.SerializerMethodField()
    
    class Meta:
        model = AppointmentPricing
        fields = ['id', 'doctor', 'doctor_name', 'price', 'description', 'is_active', 'created_at', 'updated_at']
        read_only_fields = ['created_at', 'updated_at']
        
    def get_doctor_name(self, obj):
        return f"Dr. {obj.doctor.first_name} {obj.doctor.last_name}"

class BillSerializer(serializers.ModelSerializer):
    class Meta:
        model = Bill
        fields = [
            'id', 'appointment', 'amount', 'status', 'payment_method',
            'stripe_payment_id', 'transaction_date', 'notes',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['created_at', 'updated_at', 'id']
    
    def to_representation(self, instance):
        # Get the default representation
        representation = super().to_representation(instance)
        
        # Include basic appointment data without creating a circular reference
        if instance.appointment:
            # Format date and time for display
            appointment_date = None
            appointment_time_str = None
            if instance.appointment.appointment_time:
                appointment_date = instance.appointment.appointment_time.strftime('%Y-%m-%d')
                appointment_time_str = instance.appointment.appointment_time.strftime('%H:%M')
            
            # Get patient information
            patient_name = ''
            patient_email = ''
            patient_phone = ''
            
            if instance.appointment.patient:
                patient = instance.appointment.patient
                patient_name = f"{patient.first_name} {patient.last_name}".strip()
                patient_email = patient.email
                patient_phone = getattr(patient, 'phone', '')
            else:
                patient_name = instance.appointment.patient_name or ''
                patient_email = instance.appointment.patient_email or ''
                patient_phone = instance.appointment.patient_phone or ''
            
            # Include only essential appointment fields to avoid circular reference
            representation['appointment_details'] = {
                'id': instance.appointment.id,
                'appointment_date': appointment_date,
                'appointment_time': appointment_time_str,
                'appointment_time_iso': instance.appointment.appointment_time.isoformat() if instance.appointment.appointment_time else None,
                'status': instance.appointment.status,
                'doctor_name': f"Dr. {instance.appointment.doctor.first_name} {instance.appointment.doctor.last_name}" if instance.appointment.doctor else None,
                'patient_name': patient_name,
                'patient_email': patient_email,
                'patient_phone': patient_phone,
                'reason': instance.appointment.reason
            }
            
            # Add created_at date for the bill
            if instance.created_at:
                representation['bill_date'] = instance.created_at.strftime('%Y-%m-%d')
        
        return representation
        
    # Appointment details are now handled directly in to_representation

class AppointmentSerializer(serializers.ModelSerializer):
    doctor_name = serializers.SerializerMethodField()
    patient_name = serializers.CharField(required=False, allow_blank=True)
    patient_email = serializers.EmailField(required=False, allow_blank=True)
    patient_phone = serializers.CharField(required=False, allow_blank=True)
    can_modify = serializers.SerializerMethodField()
    payment_method = serializers.ChoiceField(
        choices=[(method.value, method.name) for method in PaymentMethod],
        required=False,
        default=PaymentMethod.LATER,
        write_only=True
    )
    end_time = serializers.DateTimeField(required=False)  # Make end_time optional
    
    class Meta:
        model = Appointment
        fields = [
            'id', 'doctor', 'doctor_name', 'patient', 'patient_name', 'patient_email', 
            'patient_phone', 'appointment_time', 'end_time', 'reason', 'status', 
            'notes', 'created_at', 'updated_at', 'can_modify', 'payment_method'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'can_modify']
    
    def get_doctor_name(self, obj):
        return f"Dr. {obj.doctor.first_name} {obj.doctor.last_name}"
    
    def get_can_modify(self, obj):
        return obj.can_cancel_or_reschedule()
    
    def to_representation(self, instance):
        # Get the default representation
        representation = super().to_representation(instance)
        
        # Ensure appointment times are in ISO format with timezone info
        if hasattr(instance, 'appointment_time') and instance.appointment_time:
            # Make sure it's timezone-aware and in UTC
            if instance.appointment_time.tzinfo is None:
                appointment_time = timezone.make_aware(instance.appointment_time, timezone.utc)
            else:
                appointment_time = instance.appointment_time
            
            representation['appointment_time'] = appointment_time.isoformat()
        
        if hasattr(instance, 'end_time') and instance.end_time:
            # Make sure it's timezone-aware and in UTC
            if instance.end_time.tzinfo is None:
                end_time = timezone.make_aware(instance.end_time, timezone.utc)
            else:
                end_time = instance.end_time
                
            representation['end_time'] = end_time.isoformat()
        
        # If this is a registered patient, populate the patient details fields
        if instance.patient:
            representation['patient_name'] = f"{instance.patient.first_name} {instance.patient.last_name}".strip()
            representation['patient_email'] = instance.patient.email
            representation['patient_phone'] = getattr(instance.patient, 'phone', '')
        
        # Include medical record information if it exists
        try:
            if hasattr(instance, 'medical_record') and instance.medical_record:
                representation['medical_record'] = {
                    'id': str(instance.medical_record.id),
                    'status': instance.medical_record.status,
                    'is_locked': instance.medical_record.is_locked
                }
        except Exception as e:
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"Error getting medical record for appointment {instance.id}: {str(e)}")
        
        # Include basic bill information without creating a circular reference
        try:
            bill = Bill.objects.filter(appointment=instance).first()
            if bill:
                representation['bill'] = {
                    'id': bill.id,
                    'amount': str(bill.amount),
                    'status': bill.status,
                    'payment_method': bill.payment_method,
                    'stripe_payment_id': bill.stripe_payment_id,
                    'transaction_date': bill.transaction_date.isoformat() if bill.transaction_date else None
                }
        except Exception as e:
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"Error getting bill for appointment {instance.id}: {str(e)}")
        
        return representation
    
    def validate(self, data):
        request = self.context.get('request')
        user = request.user if request else None
        appointment_time = data.get('appointment_time')
        
        # Automatically set end_time if not provided
        if appointment_time and 'end_time' not in data:
            data['end_time'] = appointment_time + timedelta(minutes=APPOINTMENT_DURATION_MINUTES)
        
        end_time = data.get('end_time')
        
        if appointment_time and end_time:
            if appointment_time >= end_time:
                raise serializers.ValidationError("End time must be after appointment time")
        
        if self.instance and appointment_time:
            if not self.instance.can_cancel_or_reschedule():
                raise serializers.ValidationError(
                    f"Appointments cannot be modified less than {CANCELLATION_WINDOW_HOURS} hours before the scheduled time"
                )
        
        # Check if patient info is available
        patient = data.get('patient')
        patient_name = data.get('patient_name', '')
        patient_email = data.get('patient_email', '')
        
        # Skip patient validation if user is a patient (they will be set as patient in perform_create)
        if user and user.is_authenticated and user.role == 'PATIENT':
            # No need to validate patient info, as the logged-in patient will be used
            pass
        elif not patient and not (patient_name and patient_email):
            # For non-patients (admins, receptionists), require patient info
            raise serializers.ValidationError(
                "Either a registered patient or walk-in patient info must be provided"
            )
        
        doctor = data.get('doctor', getattr(self.instance, 'doctor', None))
        if not doctor or doctor.role != 'DOCTOR':
            raise serializers.ValidationError("Invalid doctor selected")
        
        # Validate payment method if provided
        payment_method = data.get('payment_method')
        if payment_method and payment_method not in [method.value for method in PaymentMethod]:
            raise serializers.ValidationError(f"Invalid payment method. Valid options are: {', '.join([method.value for method in PaymentMethod])}")
            
        if appointment_time and end_time:
            overlapping_query = Q(
                doctor=doctor,
                appointment_time__lt=end_time,
                end_time__gt=appointment_time,
                status__in=[AppointmentStatus.PENDING, AppointmentStatus.CONFIRMED]
            )
            overlapping = Appointment.objects.filter(overlapping_query)
            if self.instance:
                overlapping = overlapping.exclude(pk=self.instance.pk)
            if overlapping.exists():
                raise serializers.ValidationError("This appointment conflicts with an existing one")
            
            time_off = TimeOff.objects.filter(
                doctor=doctor,
                is_approved=True,
                start_time__lt=end_time,
                end_time__gt=appointment_time
            )
            if time_off.exists():
                raise serializers.ValidationError("Doctor is not available during this time period")
        
        return data
    
    def create(self, validated_data):
        request = self.context.get('request')
        if request and request.user:
            validated_data['created_by'] = request.user
        return super().create(validated_data)

class AppointmentUpdateSerializer(AppointmentSerializer):
    class Meta(AppointmentSerializer.Meta):
        read_only_fields = AppointmentSerializer.Meta.read_only_fields + ['doctor', 'patient']
    
    def validate(self, data):
        if 'status' in data and data['status'] == AppointmentStatus.CANCELLED:
            if not self.instance.can_cancel_or_reschedule():
                raise serializers.ValidationError(
                    f"Appointments cannot be cancelled less than {CANCELLATION_WINDOW_HOURS} hours before the scheduled time"
                )
            return data
        return super().validate(data)

class DoctorAppointmentUpdateSerializer(AppointmentSerializer):
    class Meta(AppointmentSerializer.Meta):
        read_only_fields = [field for field in AppointmentSerializer.Meta.fields if field != 'status']
    
    def validate(self, data):
        if set(data.keys()) != {'status'}:
            raise serializers.ValidationError("Doctors can only update the appointment status")
        if 'status' in data:
            current_status = self.instance.status
            new_status = data['status']
            valid_transitions = {
                AppointmentStatus.PENDING: [
                    AppointmentStatus.CONFIRMED, AppointmentStatus.CANCELLED, 
                    AppointmentStatus.COMPLETED, AppointmentStatus.MISSED
                ],
                AppointmentStatus.CONFIRMED: [
                    AppointmentStatus.COMPLETED, AppointmentStatus.CANCELLED, 
                    AppointmentStatus.MISSED
                ],
                AppointmentStatus.COMPLETED: [],
                AppointmentStatus.MISSED: [],
                AppointmentStatus.CANCELLED: [AppointmentStatus.PENDING],
            }
            if new_status not in valid_transitions.get(current_status, []):
                raise serializers.ValidationError(
                    f"Cannot change status from {current_status} to {new_status}"
                )
        return data

class AvailableTimeSlotListSerializer(serializers.Serializer):
    doctor_id = serializers.IntegerField()
    date = serializers.DateField()
    
    def validate(self, data):
        try:
            doctor = User.objects.get(id=data['doctor_id'], role='DOCTOR')
        except User.DoesNotExist:
            raise serializers.ValidationError("Doctor not found")
        data['doctor'] = doctor
        return data