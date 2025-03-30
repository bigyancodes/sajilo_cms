from django.contrib import admin
from .models import Appointment, TimeOff, AvailableTimeSlot

@admin.register(Appointment)
class AppointmentAdmin(admin.ModelAdmin):
    list_display = [
        'id', 'doctor', 'get_patient_info', 'appointment_time', 
        'end_time', 'status', 'created_at'
    ]
    list_filter = ['status', 'appointment_time', 'doctor']
    search_fields = [
        'doctor__first_name', 'doctor__last_name', 'doctor__email',
        'patient__first_name', 'patient__last_name', 'patient__email',
        'patient_name', 'patient_email'
    ]
    date_hierarchy = 'appointment_time'
    
    def get_patient_info(self, obj):
        if obj.patient:
            return f"{obj.patient.first_name} {obj.patient.last_name} ({obj.patient.email})"
        return f"{obj.patient_name} ({obj.patient_email})"
    get_patient_info.short_description = 'Patient'

@admin.register(TimeOff)
class TimeOffAdmin(admin.ModelAdmin):
    list_display = ['doctor', 'start_time', 'end_time', 'reason', 'created_at']
    list_filter = ['doctor', 'start_time']
    search_fields = ['doctor__first_name', 'doctor__last_name', 'doctor__email', 'reason']
    date_hierarchy = 'start_time'

@admin.register(AvailableTimeSlot)
class AvailableTimeSlotAdmin(admin.ModelAdmin):
    list_display = ['doctor', 'get_day_name', 'start_time', 'end_time']
    list_filter = ['doctor', 'day_of_week']
    search_fields = ['doctor__first_name', 'doctor__last_name', 'doctor__email']
    
    def get_day_name(self, obj):
        day_names = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
        return day_names[obj.day_of_week]
    get_day_name.short_description = 'Day'