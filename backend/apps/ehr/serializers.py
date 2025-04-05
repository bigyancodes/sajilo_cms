from rest_framework import serializers
from django.utils import timezone
from .models import MedicalRecord, Prescription, MedicalAttachment, MedicalRecordAudit
from apps.appointment.models import Appointment, AppointmentStatus
from apps.accounts.models import UserRoles

class PrescriptionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Prescription
        fields = ['id', 'medication', 'dosage', 'frequency', 'duration', 'instructions', 'created_at']
        read_only_fields = ['id', 'created_at']

class MedicalAttachmentSerializer(serializers.ModelSerializer):
    file_url = serializers.SerializerMethodField()
    file_type_display = serializers.CharField(source='get_file_type_display', read_only=True)
    uploaded_by_name = serializers.SerializerMethodField()
    
    class Meta:
        model = MedicalAttachment
        fields = [
            'id', 'file', 'file_url', 'file_name', 'file_type', 'file_type_display', 
            'description', 'uploaded_by', 'uploaded_by_name', 'uploaded_at'
        ]
        read_only_fields = ['id', 'file_url', 'file_type_display', 'uploaded_by_name', 'uploaded_at']
        extra_kwargs = {
            'file': {'required': True, 'write_only': True},
            'uploaded_by': {'required': False}
        }
    
    def get_file_url(self, obj):
        request = self.context.get('request')
        if request and obj.file:
            return request.build_absolute_uri(obj.file.url)
        return None
    
    def get_uploaded_by_name(self, obj):
        if obj.uploaded_by:
            return f"{obj.uploaded_by.first_name} {obj.uploaded_by.last_name}".strip()
        return None

class MedicalAuditSerializer(serializers.ModelSerializer):
    performed_by_name = serializers.SerializerMethodField()
    action_display = serializers.CharField(source='get_action_display', read_only=True)
    
    class Meta:
        model = MedicalRecordAudit
        fields = [
            'id', 'action', 'action_display', 'field_modified', 'old_value', 'new_value',
            'performed_by', 'performed_by_name', 'timestamp', 'ip_address', 'user_agent'
        ]
        read_only_fields = fields
    
    def get_performed_by_name(self, obj):
        if obj.performed_by:
            return f"{obj.performed_by.first_name} {obj.performed_by.last_name}".strip()
        return None

class MedicalRecordSerializer(serializers.ModelSerializer):
    prescriptions = PrescriptionSerializer(many=True, required=False)
    attachments = MedicalAttachmentSerializer(many=True, read_only=True)
    audit_logs = MedicalAuditSerializer(many=True, read_only=True)
    patient_name = serializers.SerializerMethodField()
    doctor_name = serializers.SerializerMethodField()
    appointment_time = serializers.SerializerMethodField()
    appointment_status = serializers.CharField(source='appointment.status', read_only=True)
    # Add field for setting previous record by ID
    previous_record_id = serializers.UUIDField(required=False, allow_null=True, write_only=True)
    # Add serialized information about previous record if it exists
    previous_record_info = serializers.SerializerMethodField()
    # Add info about follow-up records
    follow_up_records = serializers.SerializerMethodField()
    
    class Meta:
        model = MedicalRecord
        fields = [
            'id', 'appointment', 'chief_complaint', 'observations', 'diagnosis',
            'treatment_plan', 'notes', 'is_locked', 'prescriptions', 'attachments',
            'audit_logs', 'created_at', 'updated_at', 'patient_name', 'doctor_name', 
            'appointment_time', 'appointment_status', 'previous_record', 'previous_record_id',
            'previous_record_info', 'follow_up_records'
        ]
        read_only_fields = ['id', 'is_locked', 'created_at', 'updated_at', 'audit_logs', 
                           'previous_record_info', 'follow_up_records']
    
    def get_patient_name(self, obj):
        if obj.appointment.patient:
            return f"{obj.appointment.patient.first_name} {obj.appointment.patient.last_name}".strip()
        return obj.appointment.patient_name
    
    def get_doctor_name(self, obj):
        doctor = obj.appointment.doctor
        return f"Dr. {doctor.first_name} {doctor.last_name}".strip()
    
    def get_appointment_time(self, obj):
        return obj.appointment.appointment_time
    
    def get_previous_record_info(self, obj):
        if obj.previous_record:
            return {
                'id': obj.previous_record.id,
                'appointment_time': obj.previous_record.appointment.appointment_time,
                'doctor_name': f"Dr. {obj.previous_record.appointment.doctor.first_name} {obj.previous_record.appointment.doctor.last_name}".strip(),
            }
        return None
    
    def get_follow_up_records(self, obj):
        follow_ups = obj.follow_up_records.all()
        if follow_ups:
            return [
                {
                    'id': record.id,
                    'appointment_time': record.appointment.appointment_time,
                    'doctor_name': f"Dr. {record.appointment.doctor.first_name} {record.appointment.doctor.last_name}".strip(),
                }
                for record in follow_ups
            ]
        return []
    
    def validate_previous_record_id(self, value):
        if value:
            try:
                MedicalRecord.objects.get(id=value)
            except MedicalRecord.DoesNotExist:
                raise serializers.ValidationError("Previous medical record not found")
        return value
    
    def validate_appointment(self, appointment):
        # Ensure the appointment is in CONFIRMED or COMPLETED status
        if appointment.status not in [AppointmentStatus.CONFIRMED, AppointmentStatus.COMPLETED]:
            raise serializers.ValidationError(
                "Medical records can only be created for confirmed or completed appointments"
            )
        
        # Check if medical record already exists
        if hasattr(appointment, 'medical_record') and self.instance is None:
            raise serializers.ValidationError("Medical record already exists for this appointment")
        
        return appointment
    
    def validate(self, data):
        # Additional validation logic
        user = self.context['request'].user
        
        # Check if user is the doctor for this appointment
        if user.role == UserRoles.DOCTOR and data.get('appointment') and data['appointment'].doctor.id != user.id:
            raise serializers.ValidationError(
                {"appointment": "You can only create medical records for your own appointments"}
            )
        
        return data
    
    def create(self, validated_data):
        prescriptions_data = validated_data.pop('prescriptions', [])
        previous_record_id = validated_data.pop('previous_record_id', None)
        request = self.context.get('request')
        
        # Set created_by to the current user
        if request and request.user:
            validated_data['created_by'] = request.user
        
        # Create the medical record
        medical_record = MedicalRecord.objects.create(**validated_data)
        
        # Set previous record if id was provided
        if previous_record_id:
            try:
                previous_record = MedicalRecord.objects.get(id=previous_record_id)
                medical_record.previous_record = previous_record
                medical_record.save()
            except MedicalRecord.DoesNotExist:
                pass
        
        # Create prescriptions
        for prescription_data in prescriptions_data:
            Prescription.objects.create(medical_record=medical_record, **prescription_data)
        
        return medical_record
    
    def update(self, instance, validated_data):
        if instance.is_locked:
            # Only allow updating notes when record is locked
            notes = validated_data.pop('notes', None)
            if notes is not None:
                instance.notes = notes
                instance.save(update_fields=['notes', 'updated_at'])
            
            # Reject any other changes
            if validated_data:
                raise serializers.ValidationError(
                    "This medical record is locked. Only notes can be updated."
                )
            
            return instance
        
        # Process prescriptions
        prescriptions_data = validated_data.pop('prescriptions', None)
        if prescriptions_data is not None:
            # Replace existing prescriptions with new ones
            instance.prescriptions.all().delete()
            for prescription_data in prescriptions_data:
                Prescription.objects.create(medical_record=instance, **prescription_data)
        
        # Handle previous_record_id if provided
        previous_record_id = validated_data.pop('previous_record_id', None)
        if previous_record_id:
            try:
                previous_record = MedicalRecord.objects.get(id=previous_record_id)
                instance.previous_record = previous_record
            except MedicalRecord.DoesNotExist:
                pass
        
        # Update other fields
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        
        instance.save()
        return instance

class MedicalAttachmentCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = MedicalAttachment
        fields = ['medical_record', 'file', 'file_type', 'description']
        extra_kwargs = {
            'file': {'required': True},
            'medical_record': {'required': True},
            'file_type': {'required': True}
        }
    
    def validate_medical_record(self, medical_record):
        # Check if the user has permission to add attachments
        user = self.context['request'].user
        
        # Doctors can only add attachments to their own appointments
        if user.role == UserRoles.DOCTOR and medical_record.appointment.doctor.id != user.id:
            raise serializers.ValidationError(
                "You can only add attachments to your own appointments"
            )
        
        return medical_record
    
    def create(self, validated_data):
        request = self.context.get('request')
        
        # Set uploaded_by to the current user
        if request and request.user:
            validated_data['uploaded_by'] = request.user
        
        return super().create(validated_data)