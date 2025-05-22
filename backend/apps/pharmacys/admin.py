# pharmacy/admin.py
from django.contrib import admin
from django.db.models import Sum
from django.utils.html import format_html
from .models import (
    Category, Medicine, StockBatch, StockMovement, Cart, CartItem,
    Order, OrderItem, Payment, AuditLog
)

@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ['name', 'description', 'created_at', 'created_by']
    list_filter = ['created_at']
    search_fields = ['name', 'description']
    readonly_fields = ['created_at', 'created_by']

class StockBatchInline(admin.TabularInline):
    model = StockBatch
    extra = 0
    readonly_fields = ['created_at']

@admin.register(Medicine)
class MedicineAdmin(admin.ModelAdmin):
    list_display = [
        'name', 'manufacturer', 'category', 'unit_price', 
        'get_current_stock', 'get_available_stock', 'is_active'
    ]
    list_filter = ['category', 'dosage_form', 'is_active', 'prescription_required']
    search_fields = ['name', 'generic_name', 'manufacturer']
    list_editable = ['is_active']
    readonly_fields = ['created_at', 'updated_at', 'created_by', 'updated_by']
    inlines = [StockBatchInline]
    
    def get_current_stock(self, obj):
        return obj.current_stock
    get_current_stock.short_description = 'Current Stock'
    
    def get_available_stock(self, obj):
        stock = obj.available_stock
        if obj.is_low_stock():
            return format_html('<span style="color: red;">{}</span>', stock)
        return stock
    get_available_stock.short_description = 'Available Stock'

@admin.register(StockBatch)
class StockBatchAdmin(admin.ModelAdmin):
    list_display = [
        'medicine', 'batch_number', 'quantity', 'expiry_date', 
        'get_status', 'created_at'
    ]
    list_filter = ['expiry_date', 'created_at', 'medicine__category']
    search_fields = ['medicine__name', 'batch_number']
    readonly_fields = ['created_at', 'created_by']
    
    def get_status(self, obj):
        if obj.is_expired():
            return format_html('<span style="color: red;">Expired</span>')
        elif obj.days_to_expiry() <= 30:
            return format_html('<span style="color: orange;">Expiring Soon</span>')
        return format_html('<span style="color: green;">Valid</span>')
    get_status.short_description = 'Status'

@admin.register(StockMovement)
class StockMovementAdmin(admin.ModelAdmin):
    list_display = [
        'medicine', 'movement_type', 'quantity', 'reference', 'created_at'
    ]
    list_filter = ['movement_type', 'created_at']
    search_fields = ['medicine__name', 'reference']
    readonly_fields = ['created_at', 'created_by']

class CartItemInline(admin.TabularInline):
    model = CartItem
    extra = 0
    readonly_fields = ['total_price']

@admin.register(Cart)
class CartAdmin(admin.ModelAdmin):
    list_display = ['user', 'get_total_amount', 'get_total_items', 'updated_at']
    readonly_fields = ['created_at', 'updated_at']
    inlines = [CartItemInline]
    
    def get_total_amount(self, obj):
        return obj.total_amount
    get_total_amount.short_description = 'Total Amount'
    
    def get_total_items(self, obj):
        return obj.total_items
    get_total_items.short_description = 'Total Items'

class OrderItemInline(admin.TabularInline):
    model = OrderItem
    extra = 0
    readonly_fields = ['total_price']

@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = [
        'order_number', 'user', 'status', 'payment_status', 
        'total_amount', 'created_at'
    ]
    list_filter = ['status', 'payment_status', 'delivery_type', 'created_at']
    search_fields = ['order_number', 'user__email']
    readonly_fields = [
        'order_number', 'created_at', 'updated_at', 
        'confirmed_at', 'delivered_at'
    ]
    inlines = [OrderItemInline]

@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = [
        'order', 'payment_method', 'amount', 'status', 
        'transaction_id', 'created_at'
    ]
    list_filter = ['payment_method', 'status', 'created_at']
    search_fields = ['order__order_number', 'transaction_id']
    readonly_fields = ['created_at', 'updated_at']

@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    list_display = [
        'user', 'action', 'model_name', 'object_repr', 
        'ip_address', 'created_at'
    ]
    list_filter = ['action', 'model_name', 'created_at']
    search_fields = ['user__email', 'object_repr']
    readonly_fields = ['created_at']
    
    def has_add_permission(self, request):
        return False
    
    def has_change_permission(self, request, obj=None):
        return False