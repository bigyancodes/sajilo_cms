import stripe
import json
import logging
from django.conf import settings
from django.http import JsonResponse, HttpResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_POST
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from .models import Order, Payment
from .email_utils import send_order_confirmation_email, send_payment_confirmation_email, send_order_status_update_email

logger = logging.getLogger(__name__)

# Configure Stripe with your API keys
stripe.api_key = settings.STRIPE_SECRET_KEY

class CreatePaymentIntentView(APIView):
    """
    Create a payment intent for Stripe checkout
    """
    permission_classes = [IsAuthenticated]
    
    def post(self, request, *args, **kwargs):
        try:
            # Get the order ID from the request
            order_id = request.data.get('order_id')
            if not order_id:
                return Response(
                    {'error': 'Order ID is required'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Get the order
            try:
                order = Order.objects.get(id=order_id, user=request.user)
            except Order.DoesNotExist:
                return Response(
                    {'error': 'Order not found'}, 
                    status=status.HTTP_404_NOT_FOUND
                )
            
            # Check if order is already paid
            if order.payment_status == 'PAID':
                return Response(
                    {'error': 'Order is already paid'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Calculate amount in cents (Stripe uses cents)
            amount = int(float(order.total_amount) * 100)
            
            # Create a payment intent
            intent = stripe.PaymentIntent.create(
                amount=amount,
                currency='npr',  # Nepalese Rupee
                metadata={
                    'order_id': str(order.id),
                    'order_number': order.order_number,
                    'user_id': str(request.user.id),
                    'user_email': request.user.email
                }
            )
            
            return Response({
                'clientSecret': intent.client_secret,
                'publicKey': settings.STRIPE_PUBLIC_KEY,
                'amount': order.total_amount,
                'order_number': order.order_number
            })
            
        except stripe.error.StripeError as e:
            return Response(
                {'error': str(e)}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        except Exception as e:
            return Response(
                {'error': str(e)}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

@csrf_exempt
@require_POST
def stripe_webhook(request):
    """
    Webhook to handle Stripe payment events
    """
    payload = request.body
    sig_header = request.META.get('HTTP_STRIPE_SIGNATURE')
    
    try:
        # Verify the webhook signature
        event = stripe.Webhook.construct_event(
            payload, sig_header, settings.STRIPE_WEBHOOK_SECRET
        )
    except ValueError:
        # Invalid payload
        return HttpResponse(status=400)
    except stripe.error.SignatureVerificationError:
        # Invalid signature
        return HttpResponse(status=400)
    
    # Handle the event
    if event['type'] == 'payment_intent.succeeded':
        payment_intent = event['data']['object']
        handle_payment_success(payment_intent)
    
    return HttpResponse(status=200)

def handle_payment_success(payment_intent):
    """
    Handle successful payment
    """
    try:
        # Get order ID from metadata
        order_id = payment_intent['metadata']['order_id']
        
        # Get the order
        order = Order.objects.get(id=order_id)
        
        # Update order payment status
        previous_status = order.payment_status
        order.payment_status = 'PAID'
        order.save()
        
        # Create payment record
        payment = Payment.objects.create(
            order=order,
            payment_method='CARD',
            amount=float(payment_intent['amount']) / 100,  # Convert cents to dollars
            status='SUCCESS',
            transaction_id=payment_intent['id'],
            payment_gateway_response=json.dumps(payment_intent)
        )
        
        # Send payment confirmation email
        try:
            send_payment_confirmation_email(order, payment)
            logger.info(f"Payment confirmation email sent for order #{order.order_number}")
            
            # If this is the first time the order is being paid, also send order confirmation
            if previous_status != 'PAID':
                send_order_status_update_email(order, previous_status)
                logger.info(f"Order status update email sent for order #{order.order_number}")
        except Exception as email_error:
            logger.error(f"Error sending payment confirmation email: {str(email_error)}")
        
        return order
    except Exception as e:
        logger.error(f"Error handling payment success: {str(e)}")
        return None


class UpdatePaymentStatusView(APIView):
    """
    Update payment status after successful payment from frontend
    """
    permission_classes = [IsAuthenticated]
    
    def post(self, request, *args, **kwargs):
        try:
            # Get the payment intent ID and order ID from the request
            payment_intent_id = request.data.get('payment_intent_id')
            order_id = request.data.get('order_id')
            
            if not payment_intent_id or not order_id:
                return Response(
                    {'error': 'Payment intent ID and order ID are required'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Get the payment intent from Stripe
            payment_intent = stripe.PaymentIntent.retrieve(payment_intent_id)
            
            # Verify that the payment intent is for the correct order
            if payment_intent.metadata.get('order_id') != str(order_id):
                return Response(
                    {'error': 'Payment intent does not match order ID'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Check if payment is successful
            if payment_intent.status != 'succeeded':
                return Response(
                    {'error': 'Payment has not succeeded'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Update order payment status
            order = handle_payment_success(payment_intent)
            
            if not order:
                return Response(
                    {'error': 'Failed to update payment status'}, 
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
            
            return Response({
                'success': True,
                'message': 'Payment status updated successfully',
                'order_id': str(order.id),
                'payment_status': order.payment_status,
                'email_sent': True
            })
            
        except stripe.error.StripeError as e:
            logger.error(f"Stripe error in UpdatePaymentStatusView: {str(e)}")
            return Response(
                {'error': str(e)}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        except Exception as e:
            logger.error(f"Error in UpdatePaymentStatusView: {str(e)}")
            return Response(
                {'error': str(e)}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
