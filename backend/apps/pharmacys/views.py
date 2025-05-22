# pharmacy/views.py
from django.db import transaction
from django.db.models import Q, Sum, Count, F, Avg
from django.utils import timezone
from decimal import Decimal
from rest_framework import generics, status, filters
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.pagination import PageNumberPagination
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.permissions import IsAuthenticated
from apps.accounts.models import UserRoles
from apps.accounts.permissions import IsPatient
from .models import (
    Category, Medicine, StockBatch, StockMovement, Cart, CartItem,
    Order, OrderItem, Payment, AuditLog
)
from .email_utils import send_order_confirmation_email, send_order_status_update_email
from .serializers import (
    CategorySerializer, MedicineListSerializer, MedicineDetailSerializer,
    MedicineCreateUpdateSerializer, StockBatchSerializer, StockMovementSerializer,
    CartSerializer, CartItemSerializer, OrderListSerializer, OrderDetailSerializer,
    OrderCreateSerializer, PaymentSerializer, AuditLogSerializer,
    LowStockReportSerializer, ExpiryReportSerializer, SalesReportSerializer
)
from .permissions import (
    IsPatientOrReadOnly, IsPharmacistOrStaff, IsPharmacistForWrite,
    IsPatientOwnerOrPharmacist, IsOwnerOrStaff, CanManageStock,
    CanProcessOrders, CanViewReports, CanAccessAuditLogs
)
import logging

logger = logging.getLogger(__name__)

class StandardResultsSetPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 100

# Category Views
class CategoryListView(generics.ListCreateAPIView):
    queryset = Category.objects.all()
    serializer_class = CategorySerializer
    permission_classes = [IsAuthenticated, IsPharmacistForWrite]
    pagination_class = StandardResultsSetPagination
    
    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

class CategoryDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Category.objects.all()
    serializer_class = CategorySerializer
    permission_classes = [IsAuthenticated, IsPharmacistOrStaff]

# Medicine Views
class MedicineListView(generics.ListCreateAPIView):
    serializer_class = MedicineListSerializer
    permission_classes = [IsAuthenticated, IsPharmacistForWrite]
    pagination_class = StandardResultsSetPagination
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['category', 'dosage_form', 'prescription_required']
    search_fields = ['name', 'generic_name', 'manufacturer']
    ordering_fields = ['name', 'unit_price', 'created_at']
    ordering = ['name']
    
    def get_queryset(self):
        queryset = Medicine.objects.filter(is_active=True)
        
        # Patients only see in-stock, non-expired medicines
        # We can't filter by available_stock directly as it's a property, not a field
        # Instead, we'll filter in-stock medicines in the serializer or frontend
        
        # Filter by low stock for staff
        low_stock = self.request.query_params.get('low_stock')
        if low_stock and self.request.user.role in [UserRoles.PHARMACIST, UserRoles.ADMIN]:
            # We need to evaluate the queryset first before filtering by the property
            medicines_list = list(queryset)
            queryset = [m for m in medicines_list if m.is_low_stock()]
        
        return queryset
    
    def get_serializer_class(self):
        if self.request.method == 'POST':
            return MedicineCreateUpdateSerializer
        return self.serializer_class
    
    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

class MedicineDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Medicine.objects.all()
    permission_classes = [IsAuthenticated, IsPharmacistForWrite]
    
    def get_serializer_class(self):
        if self.request.method in ['PUT', 'PATCH']:
            return MedicineCreateUpdateSerializer
        return MedicineDetailSerializer
    
    def perform_update(self, serializer):
        serializer.save(updated_by=self.request.user)

# Stock Management Views
class StockBatchListView(generics.ListCreateAPIView):
    serializer_class = StockBatchSerializer
    pagination_class = StandardResultsSetPagination
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['medicine', 'expiry_date']
    ordering_fields = ['expiry_date', 'created_at']
    ordering = ['expiry_date']
    
    def get_permissions(self):
        # Allow all authenticated users to view stock information
        if self.request.method in ['GET', 'HEAD', 'OPTIONS']:
            return [IsAuthenticated()]
        # Only pharmacists and admins can create/modify stock
        return [IsAuthenticated(), CanManageStock()]
    
    def get_queryset(self):
        queryset = StockBatch.objects.all()
        
        # Filter by expired batches
        expired = self.request.query_params.get('expired')
        if expired == 'true':
            queryset = queryset.filter(expiry_date__lte=timezone.now().date())
        elif expired == 'false':
            queryset = queryset.filter(expiry_date__gt=timezone.now().date())
        
        # Filter by expiring soon (next 30 days)
        expiring_soon = self.request.query_params.get('expiring_soon')
        if expiring_soon == 'true':
            expiry_limit = timezone.now().date() + timezone.timedelta(days=30)
            queryset = queryset.filter(
                expiry_date__gt=timezone.now().date(),
                expiry_date__lte=expiry_limit
            )
        
        return queryset
    
    def perform_create(self, serializer):
        batch = serializer.save(created_by=self.request.user)
        
        # Create stock movement record
        StockMovement.objects.create(
            medicine=batch.medicine,
            batch=batch,
            movement_type=StockMovement.MOVEMENT_TYPES.IN,
            quantity=batch.quantity,
            reference=f"New Stock Batch {batch.batch_number}",
            created_by=self.request.user
        )

class StockMovementListView(generics.ListCreateAPIView):
    serializer_class = StockMovementSerializer
    pagination_class = StandardResultsSetPagination
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['medicine', 'movement_type']
    ordering = ['-created_at']
    
    def get_permissions(self):
        # Allow all authenticated users to view stock movement information
        if self.request.method in ['GET', 'HEAD', 'OPTIONS']:
            return [IsAuthenticated()]
        # Only pharmacists and admins can create/modify stock movements
        return [IsAuthenticated(), CanManageStock()]
    
    def get_queryset(self):
        return StockMovement.objects.all()
    
    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

# Cart Views
class CartView(APIView):
    permission_classes = [IsAuthenticated, IsPatient]
    
    def get(self, request):
        try:
            cart = request.user.cart
        except Cart.DoesNotExist:
            cart = Cart.objects.create(user=request.user)
        
        serializer = CartSerializer(cart, context={'request': request})
        return Response(serializer.data)

class CartItemView(APIView):
    permission_classes = [IsAuthenticated, IsPatient]
    
    def post(self, request):
        """Add item to cart"""
        cart, created = Cart.objects.get_or_create(user=request.user)
        
        serializer = CartItemSerializer(data=request.data, context={'request': request})
        if serializer.is_valid():
            medicine = serializer.validated_data['medicine']
            quantity = serializer.validated_data['quantity']
            
            # Check if item already exists in cart
            cart_item, created = CartItem.objects.get_or_create(
                cart=cart,
                medicine=medicine,
                defaults={'quantity': quantity}
            )
            
            if not created:
                # Update quantity if item already exists
                cart_item.quantity += quantity
                cart_item.save()
            
            # Validate stock availability
            if cart_item.medicine.available_stock < cart_item.quantity:
                return Response(
                    {'error': f'Only {cart_item.medicine.available_stock} units available'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            cart_serializer = CartSerializer(cart, context={'request': request})
            return Response(cart_serializer.data, status=status.HTTP_201_CREATED)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    def put(self, request, item_id):
        """Update cart item quantity"""
        try:
            cart_item = CartItem.objects.get(id=item_id, cart__user=request.user)
        except CartItem.DoesNotExist:
            return Response({'error': 'Cart item not found'}, status=status.HTTP_404_NOT_FOUND)
        
        quantity = request.data.get('quantity')
        if not quantity or quantity <= 0:
            return Response({'error': 'Invalid quantity'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Check stock availability
        if cart_item.medicine.available_stock < quantity:
            return Response(
                {'error': f'Only {cart_item.medicine.available_stock} units available'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        cart_item.quantity = quantity
        cart_item.save()
        
        cart_serializer = CartSerializer(cart_item.cart, context={'request': request})
        return Response(cart_serializer.data)
    
    def delete(self, request, item_id):
        """Remove item from cart"""
        try:
            cart_item = CartItem.objects.get(id=item_id, cart__user=request.user)
            cart_item.delete()
            
            cart_serializer = CartSerializer(cart_item.cart, context={'request': request})
            return Response(cart_serializer.data)
        except CartItem.DoesNotExist:
            return Response({'error': 'Cart item not found'}, status=status.HTTP_404_NOT_FOUND)

class ClearCartView(APIView):
    permission_classes = [IsAuthenticated, IsPatient]
    
    def delete(self, request):
        try:
            cart = request.user.cart
            cart.items.all().delete()
            
            cart_serializer = CartSerializer(cart, context={'request': request})
            return Response(cart_serializer.data)
        except Cart.DoesNotExist:
            return Response({'error': 'Cart not found'}, status=status.HTTP_404_NOT_FOUND)

class CartAddItemView(APIView):
    permission_classes = [IsAuthenticated, IsPatient]
    
    def post(self, request, item_id):
        """Increase cart item quantity by 1"""
        try:
            # Get the cart item
            cart_item = CartItem.objects.get(id=item_id, cart__user=request.user)
            
            # Increase quantity by 1
            cart_item.quantity += 1
            
            # Check stock availability
            if cart_item.medicine.available_stock < cart_item.quantity:
                return Response(
                    {'detail': f'Only {cart_item.medicine.available_stock} units available'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Save the updated quantity
            cart_item.save()
            
            # Return the updated cart
            cart_serializer = CartSerializer(cart_item.cart, context={'request': request})
            return Response(cart_serializer.data)
        except CartItem.DoesNotExist:
            return Response({'detail': 'Cart item not found'}, status=status.HTTP_404_NOT_FOUND)

class CartDecreaseItemView(APIView):
    permission_classes = [IsAuthenticated, IsPatient]
    
    def post(self, request, item_id):
        """Decrease cart item quantity by 1"""
        try:
            # Get the cart item
            cart_item = CartItem.objects.get(id=item_id, cart__user=request.user)
            
            # Decrease quantity by 1, but ensure it doesn't go below 1
            if cart_item.quantity > 1:
                cart_item.quantity -= 1
                cart_item.save()
            else:
                # If quantity would go to 0, remove the item instead
                cart_item.delete()
            
            # Return the updated cart
            cart_serializer = CartSerializer(cart_item.cart, context={'request': request})
            return Response(cart_serializer.data)
        except CartItem.DoesNotExist:
            return Response({'detail': 'Cart item not found'}, status=status.HTTP_404_NOT_FOUND)

# Order Views
class OrderListView(generics.ListAPIView):
    serializer_class = OrderListSerializer
    permission_classes = [IsAuthenticated, IsPatientOwnerOrPharmacist]
    pagination_class = StandardResultsSetPagination
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['status', 'payment_status', 'delivery_type']
    ordering = ['-created_at']
    
    def get_queryset(self):
        if self.request.user.role == UserRoles.PATIENT:
            return Order.objects.filter(user=self.request.user)
        else:
            return Order.objects.all()

class OrderDetailView(generics.RetrieveUpdateAPIView):
    queryset = Order.objects.all()
    permission_classes = [IsAuthenticated, IsPatientOwnerOrPharmacist]
    
    def get_serializer_class(self):
        return OrderDetailSerializer
    
    def perform_update(self, serializer):
        # Only staff can update orders
        if self.request.user.role not in [UserRoles.PHARMACIST, UserRoles.ADMIN]:
            raise PermissionError("Only staff can update orders")
        
        # Get the original order to check for status changes
        instance = self.get_object()
        previous_status = instance.status
        
        # Save the updated order
        order = serializer.save(processed_by=self.request.user)
        
        # Update timestamps based on status
        if order.status == Order.STATUS_CHOICES.CONFIRMED and not order.confirmed_at:
            order.confirmed_at = timezone.now()
            order.save()
        elif order.status == Order.STATUS_CHOICES.DELIVERED and not order.delivered_at:
            order.delivered_at = timezone.now()
            order.save()
        
        # Send email notification if status has changed
        if previous_status != order.status:
            try:
                send_order_status_update_email(order, previous_status)
                logger.info(f"Order status update email sent for order #{order.order_number} (from {previous_status} to {order.status})")
            except Exception as email_error:
                logger.error(f"Error sending order status update email: {str(email_error)}")
                # Don't fail the order update if email sending fails

class OrderCreateView(generics.CreateAPIView):
    queryset = Order.objects.all()
    serializer_class = OrderCreateSerializer
    permission_classes = [IsAuthenticated, IsPatient]
    
    def create(self, request, *args, **kwargs):
        logger.info(f"Order create request received: {request.data}")
        
        serializer = self.get_serializer(data=request.data)
        
        # Log validation errors if any
        if not serializer.is_valid():
            logger.error(f"Order validation failed: {serializer.errors}")
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            # Add request to serializer context
            serializer.context['request'] = request
            order = serializer.save()
            response_serializer = OrderDetailSerializer(order, context={'request': request})
            logger.info(f"Order created successfully: {order.order_number}")
            
            # Send order confirmation email
            try:
                send_order_confirmation_email(order)
                logger.info(f"Order confirmation email sent for order #{order.order_number}")
            except Exception as email_error:
                logger.error(f"Error sending order confirmation email: {str(email_error)}")
                # Don't fail the order creation if email sending fails
            
            return Response(response_serializer.data, status=status.HTTP_201_CREATED)
        except Exception as e:
            import traceback
            logger.error(f"Order creation failed: {str(e)}")
            logger.error(f"Traceback: {traceback.format_exc()}")
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

# Payment Views
class PaymentListView(generics.ListCreateAPIView):
    serializer_class = PaymentSerializer
    permission_classes = [IsAuthenticated, IsPatientOwnerOrPharmacist]
    pagination_class = StandardResultsSetPagination
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['status', 'payment_method']
    ordering = ['-created_at']
    
    def get_queryset(self):
        if self.request.user.role == UserRoles.PATIENT:
            return Payment.objects.filter(order__user=self.request.user)
        else:
            return Payment.objects.all()
    
    def perform_create(self, serializer):
        payment = serializer.save(processed_by=self.request.user)
        
        # Update order payment status if payment is successful
        if payment.status == Payment.PAYMENT_STATUS_CHOICES.SUCCESS:
            payment.order.payment_status = Order.PAYMENT_STATUS_CHOICES.PAID
            payment.order.save()

class PaymentDetailView(generics.RetrieveUpdateAPIView):
    queryset = Payment.objects.all()
    serializer_class = PaymentSerializer
    permission_classes = [IsAuthenticated, IsPatientOwnerOrPharmacist]
    
    def perform_update(self, serializer):
        payment = serializer.save(processed_by=self.request.user)
        
        # Update order payment status
        if payment.status == Payment.PAYMENT_STATUS_CHOICES.SUCCESS:
            payment.order.payment_status = Order.PAYMENT_STATUS_CHOICES.PAID
        elif payment.status == Payment.PAYMENT_STATUS_CHOICES.FAILED:
            payment.order.payment_status = Order.PAYMENT_STATUS_CHOICES.FAILED
        payment.order.save()

# Report Views
class LowStockReportView(APIView):
    permission_classes = [IsAuthenticated, CanViewReports]
    
    def get(self, request):
        low_stock_medicines = []
        
        for medicine in Medicine.objects.filter(is_active=True):
            if medicine.is_low_stock():
                low_stock_medicines.append({
                    'medicine_id': medicine.id,
                    'medicine_name': medicine.name,
                    'current_stock': medicine.available_stock,
                    'minimum_stock_level': medicine.minimum_stock_level,
                    'shortage': medicine.minimum_stock_level - medicine.available_stock
                })
        
        serializer = LowStockReportSerializer(low_stock_medicines, many=True)
        return Response(serializer.data)

class ExpiryReportView(APIView):
    permission_classes = [IsAuthenticated, CanViewReports]
    
    def get(self, request):
        # Get batches expiring in next 30 days
        expiry_limit = timezone.now().date() + timezone.timedelta(days=30)
        expiring_batches = StockBatch.objects.filter(
            expiry_date__lte=expiry_limit,
            quantity__gt=0
        ).order_by('expiry_date')
        
        expiry_data = []
        for batch in expiring_batches:
            expiry_data.append({
                'batch_id': batch.id,
                'medicine_name': batch.medicine.name,
                'batch_number': batch.batch_number,
                'quantity': batch.quantity,
                'expiry_date': batch.expiry_date,
                'days_to_expiry': batch.days_to_expiry(),
                'is_expired': batch.is_expired()
            })
        
        serializer = ExpiryReportSerializer(expiry_data, many=True)
        return Response(serializer.data)

class SalesReportView(APIView):
    permission_classes = [IsAuthenticated, CanViewReports]
    
    def get(self, request):
        period = request.query_params.get('period', 'week')  # week, month, year
        
        now = timezone.now()
        if period == 'week':
            start_date = now - timezone.timedelta(days=7)
        elif period == 'month':
            start_date = now - timezone.timedelta(days=30)
        elif period == 'year':
            start_date = now - timezone.timedelta(days=365)
        else:
            start_date = now - timezone.timedelta(days=7)
        
        orders = Order.objects.filter(
            created_at__gte=start_date,
            status__in=[Order.STATUS_CHOICES.DELIVERED, Order.STATUS_CHOICES.READY]
        )
        
        total_orders = orders.count()
        total_revenue = orders.aggregate(Sum('total_amount'))['total_amount__sum'] or 0
        total_items = OrderItem.objects.filter(order__in=orders).aggregate(Sum('quantity'))['quantity__sum'] or 0
        avg_order_value = orders.aggregate(Avg('total_amount'))['total_amount__avg'] or 0
        
        report_data = {
            'period': period,
            'total_orders': total_orders,
            'total_revenue': total_revenue,
            'total_items_sold': total_items,
            'average_order_value': avg_order_value
        }
        
        serializer = SalesReportSerializer(report_data)
        return Response(serializer.data)

# Audit Log Views
class AuditLogListView(generics.ListAPIView):
    queryset = AuditLog.objects.all()
    serializer_class = AuditLogSerializer
    permission_classes = [IsAuthenticated, CanAccessAuditLogs]
    pagination_class = StandardResultsSetPagination
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['user', 'action', 'model_name']
    ordering = ['-created_at']

# Notification Views removed


# Utility Views
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def dashboard_stats(request):
    """Get dashboard statistics based on user role"""
    stats = {}
    
    if request.user.role == UserRoles.PATIENT:
        stats = {
            'total_orders': request.user.orders.count(),
            'pending_orders': request.user.orders.filter(status=Order.STATUS_CHOICES.PENDING).count(),
            'cart_items': request.user.cart.items.count() if hasattr(request.user, 'cart') else 0
        }
    
    elif request.user.role in [UserRoles.PHARMACIST, UserRoles.ADMIN]:
        # Get all active medicines
        all_medicines = Medicine.objects.filter(is_active=True)
        
        # Count medicines that are in stock
        in_stock_count = len([m for m in all_medicines if m.is_in_stock()])
        
        stats = {
            'total_medicines': all_medicines.count(),
            'in_stock_medicines': in_stock_count,  # Add in-stock count
            'low_stock_medicines': len([m for m in all_medicines if m.is_low_stock()]),
            'pending_orders': Order.objects.filter(status=Order.STATUS_CHOICES.PENDING).count(),
            'todays_orders': Order.objects.filter(
                created_at__date=timezone.now().date()
            ).count(),
            'total_revenue_today': Order.objects.filter(
                created_at__date=timezone.now().date(),
                payment_status=Order.PAYMENT_STATUS_CHOICES.PAID
            ).aggregate(Sum('total_amount'))['total_amount__sum'] or 0
        }
    
    elif request.user.role == UserRoles.RECEPTIONIST:
        stats = {
            'todays_orders': Order.objects.filter(
                created_at__date=timezone.now().date()
            ).count(),
            'pending_orders': Order.objects.filter(status=Order.STATUS_CHOICES.PENDING).count(),
            'processed_orders': Order.objects.filter(status=Order.STATUS_CHOICES.CONFIRMED).count()
        }
    
    return Response(stats)