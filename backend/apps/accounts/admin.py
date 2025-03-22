from django.contrib import admin
from .models import CustomUser, DoctorProfile

@admin.register(CustomUser)
class CustomUserAdmin(admin.ModelAdmin):
    list_display = ('email', 'role', 'is_verified')

@admin.register(DoctorProfile)
class DoctorProfileAdmin(admin.ModelAdmin):
    list_display = ('user', 'license_number', 'specialty')