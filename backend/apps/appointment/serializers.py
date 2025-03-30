from rest_framework import serializers
from django.utils import timezone
from django.contrib.auth import get_user_model
from .models import Appointment, TimeOff, AvailableTimeSlot, AppointmentStatus
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

class AppointmentSerializer(serializers.ModelSerializer):
    doctor_name = serializers.SerializerMethodField()
    patient_name = serializers.CharField(required=False, allow_blank=True)
    patient_email = serializers.EmailField(required=False, allow_blank=True)
    patient_phone = serializers.CharField(required=False, allow_blank=True)
    can_modify = serializers.SerializerMethodField()
    end_time = serializers.DateTimeField(required=False)  # Make end_time optional
    
    class Meta:
        model = Appointment
        fields = [
            'id', 'doctor', 'doctor_name', 'patient', 'patient_name', 'patient_email', 
            'patient_phone', 'appointment_time', 'end_time', 'reason', 'status', 
            'notes', 'created_at', 'updated_at', 'can_modify'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'can_modify']
    
    def get_doctor_name(self, obj):
        return f"Dr. {obj.doctor.first_name} {obj.doctor.last_name}"
    
    def get_can_modify(self, obj):
        return obj.can_cancel_or_reschedule()
    
    def to_representation(self, instance):
        # Get the default representation
        representation = super().to_representation(instance)
        
        # If this is a registered patient, populate the patient details fields
        if instance.patient:
            representation['patient_name'] = f"{instance.patient.first_name} {instance.patient.last_name}".strip()
            representation['patient_email'] = instance.patient.email
            representation['patient_phone'] = getattr(instance.patient, 'phone', '')
            
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