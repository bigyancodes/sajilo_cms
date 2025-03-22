# accounts/permissions.py
from rest_framework.permissions import BasePermission
from .models import UserRoles

class IsPatient(BasePermission):
    """Allows access only to users with the PATIENT role."""
    def has_permission(self, request, view):
        return bool(request.user.is_authenticated and request.user.role == UserRoles.PATIENT)

class IsDoctor(BasePermission):
    """Allows access only to verified users with the DOCTOR role."""
    def has_permission(self, request, view):
        return bool(
            request.user.is_authenticated and 
            request.user.role == UserRoles.DOCTOR and 
            request.user.is_verified
        )

class IsReceptionist(BasePermission):
    """Allows access only to verified users with the RECEPTIONIST role."""
    def has_permission(self, request, view):
        return bool(
            request.user.is_authenticated and 
            request.user.role == UserRoles.RECEPTIONIST and 
            request.user.is_verified
        )

class IsPharmacist(BasePermission):
    """Allows access only to verified users with the PHARMACIST role."""
    def has_permission(self, request, view):
        return bool(
            request.user.is_authenticated and 
            request.user.role == UserRoles.PHARMACIST and 
            request.user.is_verified
        )

class IsStaff(BasePermission):
    """Allows access only to verified staff (DOCTOR, RECEPTIONIST, PHARMACIST)."""
    def has_permission(self, request, view):
        return bool(
            request.user.is_authenticated and 
            request.user.role in [UserRoles.DOCTOR, UserRoles.RECEPTIONIST, UserRoles.PHARMACIST] and 
            request.user.is_verified
        )

class IsAdminOrSuperuser(BasePermission):
    """Allows access only to users with the ADMIN role or superusers."""
    def has_permission(self, request, view):
        return bool(
            request.user.is_authenticated and 
            (request.user.role == UserRoles.ADMIN or request.user.is_superuser)
        )

class IsOwnerOrAdmin(BasePermission):
    """Allows access to the object owner or an admin/superuser."""
    def has_object_permission(self, request, view, obj):
        return bool(
            request.user.is_authenticated and 
            (obj == request.user or request.user.role == UserRoles.ADMIN or request.user.is_superuser)
        )

class IsVerified(BasePermission):
    """Allows access only to verified users (regardless of role)."""
    def has_permission(self, request, view):
        return bool(request.user.is_authenticated and request.user.is_verified)