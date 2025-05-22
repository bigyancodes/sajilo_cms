from rest_framework import generics, permissions, status
from rest_framework.views import APIView
from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response
from django.db.models import Count
from django.utils import timezone
from django_filters.rest_framework import DjangoFilterBackend
from .models import Medicine, Order, Billing, StockTransaction, AuditLog
from .serializers import (
    MedicineSerializer, OrderSerializer, BillingSerializer,
    StockTransactionSerializer, AuditLogSerializer
)
from apps.accounts.permissions import IsPharmacist, IsPatient, IsAdminOrSuperuser
from apps.accounts.models import UserRoles  # Add this import
from rest_framework import serializers
import stripe
import logging
from django.conf import settings
from django.db import transaction

logger = logging.getLogger(__name__)

class StandardResultsSetPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 100

class MedicineListCreateView(generics.ListCreateAPIView):
    serializer_class = MedicineSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = StandardResultsSetPagination
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['category', 'manufacturer']

    def get_queryset(self):
        queryset = Medicine.objects.all()
        
        # Handle expired filter if provided
        is_expired = self.request.query_params.get('is_expired')
        if is_expired is not None:
            today = timezone.now().date()
            if is_expired.lower() == 'true':
                queryset = queryset.filter(expiration_date__lt=today)
            else:
                queryset = queryset.filter(expiration_date__gte=today)
        
        return queryset.order_by('name')

    def get_permissions(self):
        if self.request.method == 'POST':
            return [IsPharmacist()]
        return [permissions.IsAuthenticated()]

    def create(self, request, *args, **kwargs):
        try:
            return super().create(request, *args, **kwargs)
        except serializers.ValidationError as e:
            return Response({'error': e.detail}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def perform_create(self, serializer):
        try:
            medicine = serializer.save()
            AuditLog.objects.create(
                action='CREATE',
                model_name='Medicine',
                object_id=str(medicine.id),
                performed_by=self.request.user,
                details=f"Medicine {medicine.name} created",
                ip_address=self.request.META.get('REMOTE_ADDR'),
                user_agent=self.request.META.get('HTTP_USER_AGENT')
            )
        except Exception as e:
            raise serializers.ValidationError(str(e))

class MedicineDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Medicine.objects.all()
    serializer_class = MedicineSerializer
    permission_classes = [IsPharmacist]

    def perform_update(self, serializer):
        medicine = serializer.save()
        AuditLog.objects.create(
            action='UPDATE',
            model_name='Medicine',
            object_id=str(medicine.id),
            performed_by=self.request.user,
            details=f"Medicine {medicine.name} updated",
            ip_address=self.request.META.get('REMOTE_ADDR'),
            user_agent=self.request.META.get('HTTP_USER_AGENT')
        )

    def perform_destroy(self, instance):
        AuditLog.objects.create(
            action='DELETE',
            model_name='Medicine',
            object_id=str(instance.id),
            performed_by=self.request.user,
            details=f"Medicine {instance.name} deleted",
            ip_address=self.request.META.get('REMOTE_ADDR'),
            user_agent=self.request.META.get('HTTP_USER_AGENT')
        )
        instance.delete()

class OrderListCreateView(generics.ListCreateAPIView):
    serializer_class = OrderSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = StandardResultsSetPagination
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['status', 'patient']

    def get_queryset(self):
        if self.request.user.role in [UserRoles.PHARMACIST, UserRoles.ADMIN] or self.request.user.is_superuser:
            return Order.objects.all().select_related('patient')
        elif self.request.user.role == UserRoles.PATIENT:
            return Order.objects.filter(patient=self.request.user).select_related('patient')
        return Order.objects.none()

    def perform_create(self, serializer):
        if self.request.user.role != UserRoles.PATIENT:
            raise permissions.PermissionDenied("Only patients can create orders.")
        order = serializer.save()
        AuditLog.objects.create(
            action='CREATE',
            model_name='Order',
            object_id=str(order.id),
            performed_by=self.request.user,
            details=f"Order {order.id} created by {order.patient}",
            ip_address=self.request.META.get('REMOTE_ADDR'),
            user_agent=self.request.META.get('HTTP_USER_AGENT')
        )

class OrderDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Order.objects.all().select_related('patient')
    serializer_class = OrderSerializer
    permission_classes = [IsPharmacist]

    def perform_update(self, serializer):
        order = serializer.save()
        AuditLog.objects.create(
            action='UPDATE',
            model_name='Order',
            object_id=str(order.id),
            performed_by=self.request.user,
            details=f"Order {order.id} updated",
            ip_address=self.request.META.get('REMOTE_ADDR'),
            user_agent=self.request.META.get('HTTP_USER_AGENT')
        )

    def perform_destroy(self, instance):
        AuditLog.objects.create(
            action='DELETE',
            model_name='Order',
            object_id=str(instance.id),
            performed_by=self.request.user,
            details=f"Order {instance.id} deleted",
            ip_address=self.request.META.get('REMOTE_ADDR'),
            user_agent=self.request.META.get('HTTP_USER_AGENT')
        )
        instance.delete()

class FulfillOrderView(APIView):
    permission_classes = [IsPharmacist]
    
    def post(self, request, order_id):
        try:
            order = Order.objects.get(id=order_id)
            order.fulfill(performed_by=request.user)
            return Response({'message': 'Order fulfilled successfully'}, status=status.HTTP_200_OK)
        except Order.DoesNotExist:
            return Response({'error': 'Order not found'}, status=status.HTTP_404_NOT_FOUND)
        except ValueError as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

class BillingListView(generics.ListAPIView):
    queryset = Billing.objects.all().select_related('order__patient')
    serializer_class = BillingSerializer
    permission_classes = [IsPharmacist]
    pagination_class = StandardResultsSetPagination
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['payment_status']

class BillingDetailView(generics.RetrieveUpdateAPIView):
    queryset = Billing.objects.all().select_related('order__patient')
    serializer_class = BillingSerializer
    permission_classes = [IsPharmacist]

    def perform_update(self, serializer):
        billing = serializer.save()
        AuditLog.objects.create(
            action='UPDATE',
            model_name='Billing',
            object_id=str(billing.id),
            performed_by=self.request.user,
            details=f"Billing for Order {billing.order.id} updated",
            ip_address=self.request.META.get('REMOTE_ADDR'),
            user_agent=self.request.META.get('HTTP_USER_AGENT')
        )

class StockTransactionListCreateView(generics.ListCreateAPIView):
    queryset = StockTransaction.objects.all().select_related('medicine', 'performed_by')
    serializer_class = StockTransactionSerializer
    permission_classes = [IsPharmacist]
    pagination_class = StandardResultsSetPagination
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['transaction_type', 'medicine']

    def perform_create(self, serializer):
        transaction = serializer.save(performed_by=self.request.user)
        AuditLog.objects.create(
            action='CREATE',
            model_name='StockTransaction',
            object_id=str(transaction.id),
            performed_by=self.request.user,
            details=f"Stock transaction {transaction.transaction_type} for {transaction.medicine.name}",
            ip_address=self.request.META.get('REMOTE_ADDR'),
            user_agent=self.request.META.get('HTTP_USER_AGENT')
        )

class AddStockView(APIView):
    permission_classes = [IsPharmacist]

    def post(self, request):
        medicine_id = request.data.get('medicine_id')
        quantity = request.data.get('quantity')
        reason = request.data.get('reason', '')
        try:
            medicine = Medicine.objects.get(id=medicine_id)
            if not isinstance(quantity, int) or quantity <= 0:
                return Response({'error': 'Quantity must be a positive integer'}, status=status.HTTP_400_BAD_REQUEST)
            medicine.adjust_stock(
                quantity,
                'ADD',
                reason=reason,
                performed_by=request.user
            )
            return Response({'message': 'Stock added successfully'}, status=status.HTTP_200_OK)
        except Medicine.DoesNotExist:
            return Response({'error': 'Medicine not found'}, status=status.HTTP_404_NOT_FOUND)
        except ValueError as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

class StockReportView(APIView):
    permission_classes = [IsAdminOrSuperuser]

    def get(self, request):
        medicines = Medicine.objects.all().values(
            'id', 'name', 'stock_quantity', 'low_stock_threshold',
            'manufacture_date', 'expiration_date'
        )
        return Response(medicines, status=status.HTTP_200_OK)

class ExpiredMedicinesView(APIView):
    permission_classes = [IsAdminOrSuperuser]

    def get(self, request):
        expired_medicines = Medicine.objects.filter(
            expiration_date__lt=timezone.now().date()
        )
        serializer = MedicineSerializer(expired_medicines, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

class MostUsedMedicinesView(APIView):
    permission_classes = [IsAdminOrSuperuser]

    def get(self, request):
        most_used = Medicine.objects.filter(
            ordermedicine__order__status='FULFILLED'
        ).annotate(
            usage_count=Count('ordermedicine')
        ).order_by('-usage_count')[:10]
        serializer = MedicineSerializer(most_used, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

class AuditLogListView(generics.ListAPIView):
    queryset = AuditLog.objects.all().select_related('performed_by')
    serializer_class = AuditLogSerializer
    permission_classes = [IsAdminOrSuperuser]
    pagination_class = StandardResultsSetPagination
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['action', 'model_name', 'performed_by']

class StripePaymentView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request, billing_id):
        try:
            # Initialize Stripe with the API key from settings
            stripe.api_key = settings.STRIPE_SECRET_KEY
            
            # Get the billing record
            billing = Billing.objects.select_related(
                'order', 'order__patient'
            ).prefetch_related(
                'order__ordermedicine_set', 
                'order__ordermedicine_set__medicine'
            ).get(id=billing_id)
            
            # Ensure the user is the patient who owns this order
            if request.user.role != UserRoles.PATIENT or request.user.id != billing.order.patient.id:
                return Response(
                    {"error": "You are not authorized to process payment for this order"},
                    status=status.HTTP_403_FORBIDDEN
                )
            
            # Ensure the billing is unpaid
            if billing.payment_status == 'PAID':
                return Response(
                    {"error": "This order has already been paid for"},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Create line items for Stripe checkout
            line_items = []
            for order_medicine in billing.order.ordermedicine_set.all():
                medicine = order_medicine.medicine
                
                # Convert from Django Decimal to cents (int) for Stripe
                unit_amount = int(float(medicine.price) * 100)
                
                line_items.append({
                    'price_data': {
                        'currency': 'usd',
                        'product_data': {
                            'name': medicine.name,
                            'description': medicine.description or f'Generic: {medicine.generic_name}',
                        },
                        'unit_amount': unit_amount,
                    },
                    'quantity': order_medicine.quantity,
                })
                
            # Create Stripe checkout session
            # Use the request's origin to build the correct URLs
            origin = request.build_absolute_uri('/').rstrip('/')
            frontend_base_url = origin.replace(':8000', ':3000')  # Replace backend port with frontend port
            
            logger.info(f"Using frontend base URL: {frontend_base_url}")
            
            success_url = f"{frontend_base_url}/payment-success?billing_id={billing_id}"
            cancel_url = f"{frontend_base_url}/payment-cancel?billing_id={billing_id}"
            
            logger.info(f"Success URL: {success_url}")
            logger.info(f"Cancel URL: {cancel_url}")
            
            checkout_session = stripe.checkout.Session.create(
                payment_method_types=['card'],
                line_items=line_items,
                mode='payment',
                success_url=success_url,
                cancel_url=cancel_url,
                client_reference_id=str(billing.id),
                customer_email=request.user.email,
                metadata={
                    'billing_id': billing.id,
                    'order_id': billing.order.id,
                    'user_id': request.user.id,
                }
            )
            
            # Return the session ID to the frontend
            return Response({
                'sessionId': checkout_session.id,
                'url': checkout_session.url
            })
            
        except Billing.DoesNotExist:
            return Response(
                {"error": "Billing record not found"},
                status=status.HTTP_404_NOT_FOUND
            )
        except stripe.error.StripeError as e:
            return Response(
                {"error": f"Stripe error: {str(e)}"},
                status=status.HTTP_400_BAD_REQUEST
            )
        except Exception as e:
            logger.exception(f"Payment processing error: {str(e)}")
            return Response(
                {"error": "An error occurred while processing your payment"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

class PaymentSuccessView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request):
        logger.info("PaymentSuccessView called")
        billing_id = request.query_params.get('billing_id')
        logger.info(f"Payment success for billing ID: {billing_id}")
        
        if not billing_id:
            logger.warning("Missing billing ID in request")
            return Response({"error": "Missing billing ID"}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            # Use select_for_update to lock the row during update
            with transaction.atomic():
                billing = Billing.objects.select_for_update().get(id=billing_id)
                logger.info(f"Found billing: {billing.id}, current status: {billing.payment_status}")
                
                # Update payment status only if it's not already paid
                if billing.payment_status != 'PAID':
                    billing.payment_status = 'PAID'
                    billing.save(update_fields=['payment_status', 'updated_at'])
                    logger.info(f"Updated billing {billing.id} status to PAID")
                    
                    # Also update the order status to FULFILLED
                    order = billing.order
                    if order.status == 'PENDING':
                        order.status = 'FULFILLED'
                        order.save(update_fields=['status', 'updated_at'])
                        logger.info(f"Updated order {order.id} status to FULFILLED after payment")
                        
                        # Add audit log for order status change
                        AuditLog.objects.create(
                            action='UPDATE',
                            model_name='Order',
                            object_id=str(order.id),
                            performed_by=request.user,
                            details=f"Order status changed to FULFILLED after payment",
                            ip_address=request.META.get('REMOTE_ADDR'),
                            user_agent=request.META.get('HTTP_USER_AGENT')
                        )
                    
                    # Create audit log for billing payment
                    AuditLog.objects.create(
                        action='UPDATE',
                        model_name='Billing',
                        object_id=str(billing.id),
                        performed_by=request.user,
                        details=f"Payment completed for billing {billing.id}",
                        ip_address=request.META.get('REMOTE_ADDR'),
                        user_agent=request.META.get('HTTP_USER_AGENT')
                    )
                    logger.info(f"Created audit log for billing {billing.id} payment")
                else:
                    logger.info(f"Billing {billing.id} already marked as PAID, no changes needed")
            
            # Query again outside the transaction to ensure we see the updated data
            updated_billing = Billing.objects.get(id=billing_id)
            logger.info(f"Confirmed updated status: {updated_billing.payment_status}")
            
            return Response({
                "message": "Payment successful",
                "billing_id": billing_id,
                "payment_status": updated_billing.payment_status
            })
            
        except Billing.DoesNotExist:
            logger.error(f"Billing not found for ID: {billing_id}")
            return Response({"error": "Billing not found"}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            logger.exception(f"Error processing successful payment: {str(e)}")
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class PaymentCancelView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request):
        billing_id = request.query_params.get('billing_id')
        if not billing_id:
            return Response({"error": "Missing billing ID"}, status=status.HTTP_400_BAD_REQUEST)
        
        return Response({
            "message": "Payment was cancelled",
            "billing_id": billing_id
        })