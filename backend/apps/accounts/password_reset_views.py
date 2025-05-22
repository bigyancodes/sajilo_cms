# apps/accounts/password_reset_views.py
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import AllowAny
from django.contrib.auth import get_user_model
from django.utils.encoding import force_bytes, force_str
from django.utils.http import urlsafe_base64_encode, urlsafe_base64_decode
from django.conf import settings
from django.core.mail import send_mail
from django.template.loader import render_to_string
import logging
from .utils import TokenGenerator  # Import custom TokenGenerator

User = get_user_model()
logger = logging.getLogger(__name__)

class PasswordResetRequestView(APIView):
    permission_classes = [AllowAny]
    
    def post(self, request):
        email = request.data.get("email", "").strip().lower()
        if not email:
            return Response(
                {"error": "Email is required"}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            user = User.objects.filter(email=email).first()
            if not user:
                logger.info(f"Password reset requested for non-existent email: {email}")
                return Response(
                    {"success": True, "message": "If your email is registered, you will receive a password reset link"}, 
                    status=status.HTTP_200_OK
                )
            
            # Use custom TokenGenerator
            token_generator = TokenGenerator()
            token = token_generator.make_token(user)
            uid = urlsafe_base64_encode(force_bytes(user.pk))
            
            frontend_url = settings.FRONTEND_URL if hasattr(settings, 'FRONTEND_URL') else "http://localhost:3000"
            reset_link = f"{frontend_url}/reset-password/{uid}/{token}"
            
            context = {
                'user': user,
                'reset_link': reset_link,
                'frontend_url': frontend_url,
            }
            
            email_subject = "Reset Your Password - Sajilo Clinic"
            email_html_message = render_to_string('password_reset_email.html', context)
            email_plaintext_message = render_to_string('password_reset_email.txt', context)
            
            send_mail(
                subject=email_subject,
                message=email_plaintext_message,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[user.email],
                html_message=email_html_message,
                fail_silently=False,
            )
            
            logger.info(f"Password reset email sent to: {email}")
            return Response(
                {"success": True, "message": "If your email is registered, you will receive a password reset link"}, 
                status=status.HTTP_200_OK
            )
            
        except Exception as e:
            logger.error(f"Password reset email failed: {str(e)}")
            return Response(
                {"error": "Failed to process password reset request"}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

class PasswordResetConfirmView(APIView):
    permission_classes = [AllowAny]
    
    def post(self, request):
        uid = request.data.get("uid", "")
        token = request.data.get("token", "")
        password = request.data.get("password", "")
        
        if not uid or not token or not password:
            return Response(
                {"error": "All fields are required"}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if len(password) < 8:
            return Response(
                {"error": "Password must be at least 8 characters long"}, 
                status=status.HTTP_400_BAD_REQUEST
            )
            
        try:
            user_id = force_str(urlsafe_base64_decode(uid))
            user = User.objects.get(pk=user_id)
            
            # Use custom TokenGenerator
            token_generator = TokenGenerator()
            if not token_generator.check_token(user, token):
                logger.warning(f"Invalid password reset token for user ID: {user_id}")
                return Response(
                    {"error": "Invalid or expired token"}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
                
            user.set_password(password)
            user.save()
            
            logger.info(f"Password reset successful for user: {user.email}")
            return Response(
                {"success": True, "message": "Password has been reset successfully"}, 
                status=status.HTTP_200_OK
            )
            
        except (TypeError, ValueError, OverflowError, User.DoesNotExist) as e:
            logger.error(f"Password reset confirmation failed: {str(e)}")
            return Response(
                {"error": "Invalid reset link"}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        except Exception as e:
            logger.error(f"Unexpected error in password reset: {str(e)}")
            return Response(
                {"error": "Failed to reset password"}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )