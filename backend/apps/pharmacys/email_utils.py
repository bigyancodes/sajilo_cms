"""
Email utilities for the pharmacy app
"""
import os
from django.core.mail import EmailMultiAlternatives
from django.template.loader import render_to_string
from django.utils.html import strip_tags
from django.conf import settings
import logging

logger = logging.getLogger(__name__)

def send_order_confirmation_email(order):
    """
    Send order confirmation email with invoice to the customer
    """
    try:
        subject = f'Order Confirmation - #{order.order_number}'
        from_email = settings.DEFAULT_FROM_EMAIL
        to_email = order.user.email
        
        # Context for the email template
        context = {
            'order': order,
            'order_items': order.items.all(),
            'subtotal': order.total_amount,
            'tax': float(order.total_amount) * 0.13,  # 13% tax
            'total': float(order.total_amount) * 1.13,
            'site_url': settings.SITE_URL if hasattr(settings, 'SITE_URL') else 'http://localhost:3000'
        }
        
        # Render HTML content
        html_content = render_to_string('emails/order_confirmation.html', context)
        text_content = strip_tags(html_content)
        
        # Create email
        email = EmailMultiAlternatives(
            subject=subject,
            body=text_content,
            from_email=from_email,
            to=[to_email]
        )
        
        email.attach_alternative(html_content, "text/html")
        
        # Send email
        email.send()
        logger.info(f"Order confirmation email sent to {to_email} for order #{order.order_number}")
        return True
    except Exception as e:
        logger.error(f"Failed to send order confirmation email: {str(e)}")
        return False

def send_payment_confirmation_email(order, payment):
    """
    Send payment confirmation email to the customer
    """
    try:
        subject = f'Payment Confirmation - #{order.order_number}'
        from_email = settings.DEFAULT_FROM_EMAIL
        to_email = order.user.email
        
        # Context for the email template
        context = {
            'order': order,
            'payment': payment,
            'site_url': settings.SITE_URL if hasattr(settings, 'SITE_URL') else 'http://localhost:3000'
        }
        
        # Render HTML content
        html_content = render_to_string('emails/payment_confirmation.html', context)
        text_content = strip_tags(html_content)
        
        # Create email
        email = EmailMultiAlternatives(
            subject=subject,
            body=text_content,
            from_email=from_email,
            to=[to_email]
        )
        
        email.attach_alternative(html_content, "text/html")
        
        # Send email
        email.send()
        logger.info(f"Payment confirmation email sent to {to_email} for order #{order.order_number}")
        return True
    except Exception as e:
        logger.error(f"Failed to send payment confirmation email: {str(e)}")
        return False

def send_order_status_update_email(order, previous_status):
    """
    Send order status update email to the customer
    """
    try:
        subject = f'Order Status Update - #{order.order_number}'
        from_email = settings.DEFAULT_FROM_EMAIL
        to_email = order.user.email
        
        # Context for the email template
        context = {
            'order': order,
            'previous_status': previous_status,
            'new_status': order.status,
            'site_url': settings.SITE_URL if hasattr(settings, 'SITE_URL') else 'http://localhost:3000'
        }
        
        # Render HTML content
        html_content = render_to_string('emails/order_status_update.html', context)
        text_content = strip_tags(html_content)
        
        # Create email
        email = EmailMultiAlternatives(
            subject=subject,
            body=text_content,
            from_email=from_email,
            to=[to_email]
        )
        
        email.attach_alternative(html_content, "text/html")
        
        # Send email
        email.send()
        logger.info(f"Order status update email sent to {to_email} for order #{order.order_number}")
        return True
    except Exception as e:
        logger.error(f"Failed to send order status update email: {str(e)}")
        return False

def send_low_stock_alert_email(medicines):
    """
    Send low stock alert email to the pharmacy staff
    """
    try:
        subject = 'Low Stock Alert - Pharmacy Inventory'
        from_email = settings.DEFAULT_FROM_EMAIL
        # This should be a list of staff emails or a group email
        to_emails = [settings.PHARMACY_STAFF_EMAIL] if hasattr(settings, 'PHARMACY_STAFF_EMAIL') else [settings.DEFAULT_FROM_EMAIL]
        
        # Context for the email template
        context = {
            'medicines': medicines,
            'site_url': settings.SITE_URL if hasattr(settings, 'SITE_URL') else 'http://localhost:3000'
        }
        
        # Render HTML content
        html_content = render_to_string('emails/low_stock_alert.html', context)
        text_content = strip_tags(html_content)
        
        # Create email
        email = EmailMultiAlternatives(
            subject=subject,
            body=text_content,
            from_email=from_email,
            to=to_emails
        )
        
        email.attach_alternative(html_content, "text/html")
        
        # Send email
        email.send()
        logger.info(f"Low stock alert email sent to {to_emails}")
        return True
    except Exception as e:
        logger.error(f"Failed to send low stock alert email: {str(e)}")
        return False

# Note: Prescription model doesn't exist in this system
# This function is kept as a placeholder for future implementation
def send_prescription_reminder_email(prescription):
    """
    Send prescription refill reminder email to the patient
    This is a placeholder function for future implementation
    """
    logger.warning("Prescription reminder email not implemented - Prescription model doesn't exist")
    return False
