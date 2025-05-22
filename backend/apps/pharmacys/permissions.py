# pharmacy/permissions.py
from rest_framework.permissions import BasePermission
from apps.accounts.models import UserRoles

class IsPatientOrReadOnly(BasePermission):
    """
    Allows patients to have full access, others only read access
    """
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        
        if request.method in ['GET', 'HEAD', 'OPTIONS']:
            return True
        
        return request.user.role == UserRoles.PATIENT

class IsPharmacistOrStaff(BasePermission):
    """
    Allows pharmacists and admin full access
    """
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        
        return request.user.role in [UserRoles.PHARMACIST, UserRoles.ADMIN] and request.user.is_verified

class IsPharmacistForWrite(BasePermission):
    """
    Allows everyone to read, but only pharmacists and admin to write
    """
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        
        if request.method in ['GET', 'HEAD', 'OPTIONS']:
            return True
        
        return request.user.role in [UserRoles.PHARMACIST, UserRoles.ADMIN] and request.user.is_verified

class IsPatientOwnerOrPharmacist(BasePermission):
    """
    Allows patients to access their own data, pharmacists to access all
    """
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        
        return request.user.role in [UserRoles.PATIENT, UserRoles.PHARMACIST, UserRoles.ADMIN, UserRoles.RECEPTIONIST]
    
    def has_object_permission(self, request, view, obj):
        if request.user.role in [UserRoles.PHARMACIST, UserRoles.ADMIN]:
            return True
        
        if request.user.role == UserRoles.RECEPTIONIST:
            return request.method in ['GET', 'HEAD', 'OPTIONS']
        
        if request.user.role == UserRoles.PATIENT:
            # Check if patient owns the object
            if hasattr(obj, 'user'):
                return obj.user == request.user
            elif hasattr(obj, 'order') and hasattr(obj.order, 'user'):
                return obj.order.user == request.user
            elif hasattr(obj, 'cart') and hasattr(obj.cart, 'user'):
                return obj.cart.user == request.user
        
        return False

class IsOwnerOrStaff(BasePermission):
    """
    Allows users to access their own data, staff to access all
    """
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        
        return True
    
    def has_object_permission(self, request, view, obj):
        # Staff can access everything
        if request.user.role in [UserRoles.PHARMACIST, UserRoles.ADMIN, UserRoles.RECEPTIONIST] and request.user.is_verified:
            return True
        
        # Patients can only access their own data
        if request.user.role == UserRoles.PATIENT:
            if hasattr(obj, 'user'):
                return obj.user == request.user
        
        return False

class CanManageStock(BasePermission):
    """
    Only pharmacists and admin can manage stock
    """
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        
        return request.user.role in [UserRoles.PHARMACIST, UserRoles.ADMIN] and request.user.is_verified

class CanProcessOrders(BasePermission):
    """
    Only pharmacists and admin can process orders
    """
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        
        if request.method in ['GET', 'HEAD', 'OPTIONS']:
            return request.user.role in [UserRoles.PATIENT, UserRoles.PHARMACIST, UserRoles.ADMIN, UserRoles.RECEPTIONIST]
        
        return request.user.role in [UserRoles.PHARMACIST, UserRoles.ADMIN] and request.user.is_verified

class CanViewReports(BasePermission):
    """
    Staff can view reports, admin sees all
    """
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        
        return request.user.role in [UserRoles.PHARMACIST, UserRoles.ADMIN, UserRoles.RECEPTIONIST] and request.user.is_verified

class CanAccessAuditLogs(BasePermission):
    """
    Only admin can access audit logs
    """
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        
        return request.user.role == UserRoles.ADMIN and request.user.is_verified