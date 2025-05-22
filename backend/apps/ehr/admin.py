from django.contrib import admin
from .models import MedicalRecord, MedicalAttachment, MedicalRecordAudit, Prescription

class PrescriptionInline(admin.TabularInline):
    model = Prescription
    extra = 0

class MedicalAttachmentInline(admin.TabularInline):
    model = MedicalAttachment
    extra = 0
    readonly_fields = ['file_name', 'uploaded_at', 'uploaded_by']

class MedicalRecordAuditInline(admin.TabularInline):
    model = MedicalRecordAudit
    extra = 0
    readonly_fields = ['action', 'field_modified', 'old_value', 'new_value', 'performed_by', 'timestamp', 'ip_address', 'user_agent']
    can_delete = False
    max_num = 0

@admin.register(MedicalRecord)
class MedicalRecordAdmin(admin.ModelAdmin):
    list_display = ['id', 'get_patient_name', 'get_doctor_name', 'created_at', 'is_locked', 'has_follow_up']
    list_filter = ['is_locked', 'created_at']
    search_fields = ['appointment__patient__first_name', 'appointment__patient__last_name', 
                     'appointment__doctor__first_name', 'appointment__doctor__last_name']
    readonly_fields = ['id', 'created_at', 'updated_at', 'get_previous_record_info', 'get_follow_up_records']
    inlines = [PrescriptionInline, MedicalAttachmentInline, MedicalRecordAuditInline]
    fieldsets = (
        ('Appointment Information', {
            'fields': ('appointment', 'created_by', 'is_locked', 'created_at', 'updated_at')
        }),
        ('Follow-up Information', {
            'fields': ('previous_record', 'get_previous_record_info', 'get_follow_up_records')
        }),
        ('Medical Details', {
            'fields': ('chief_complaint', 'observations', 'diagnosis', 'treatment_plan', 'notes')
        }),
    )
    
    def get_patient_name(self, obj):
        if obj.appointment.patient:
            return f"{obj.appointment.patient.first_name} {obj.appointment.patient.last_name}"
        return obj.appointment.patient_name
    get_patient_name.short_description = 'Patient'
    
    def get_doctor_name(self, obj):
        doctor = obj.appointment.doctor
        return f"Dr. {doctor.first_name} {doctor.last_name}"
    get_doctor_name.short_description = 'Doctor'
    
    def has_follow_up(self, obj):
        return obj.follow_up_records.exists()
    has_follow_up.boolean = True
    has_follow_up.short_description = 'Has Follow-up'
    
    def get_previous_record_info(self, obj):
        if obj.previous_record:
            previous = obj.previous_record
            return f"Visit on {previous.appointment.appointment_time.strftime('%Y-%m-%d')} with {previous.appointment.doctor.first_name} {previous.appointment.doctor.last_name}"
        return "No previous record"
    get_previous_record_info.short_description = 'Previous Visit'
    
    def get_follow_up_records(self, obj):
        follow_ups = obj.follow_up_records.all()
        if follow_ups:
            return ", ".join([
                f"Visit on {record.appointment.appointment_time.strftime('%Y-%m-%d')}"
                for record in follow_ups
            ])
        return "No follow-up records"
    get_follow_up_records.short_description = 'Follow-up Visits'

@admin.register(MedicalAttachment)
class MedicalAttachmentAdmin(admin.ModelAdmin):
    list_display = ['id', 'file_name', 'file_type', 'uploaded_by', 'uploaded_at']
    list_filter = ['file_type', 'uploaded_at']
    search_fields = ['file_name', 'description']
    readonly_fields = ['id', 'uploaded_at']

@admin.register(MedicalRecordAudit)
class MedicalRecordAuditAdmin(admin.ModelAdmin):
    list_display = ['id', 'medical_record', 'action', 'field_modified', 'performed_by', 'timestamp']
    list_filter = ['action', 'timestamp']
    search_fields = ['medical_record__id', 'performed_by__email']
    readonly_fields = ['id', 'medical_record', 'action', 'field_modified', 'old_value', 'new_value', 
                      'performed_by', 'timestamp', 'ip_address', 'user_agent']

@admin.register(Prescription)
class PrescriptionAdmin(admin.ModelAdmin):
    list_display = ['id', 'medication', 'dosage', 'frequency', 'medical_record', 'created_at']
    list_filter = ['created_at']
    search_fields = ['medication', 'instructions']
    readonly_fields = ['created_at']