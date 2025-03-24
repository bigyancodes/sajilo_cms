from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework import status
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
from django.conf import settings
from django.contrib.auth import get_user_model
import logging
from .utils import set_auth_cookies
from django.middleware.csrf import get_token
from .serializers import CustomUserSerializer

User = get_user_model()
logger = logging.getLogger(__name__)

class TokenVerifyView(APIView):
    """Verify if an access token is valid."""
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        # Return full user object with token verification
        serializer = CustomUserSerializer(request.user, context={'request': request})
        return Response({
            "message": "Token is valid",
            "user": serializer.data
        }, status=status.HTTP_200_OK)

class CookieTokenRefreshView(APIView):
    """Refresh access and refresh tokens using a refresh token from cookies."""
    permission_classes = [AllowAny]
    
    def post(self, request):
        refresh_cookie = request.COOKIES.get("refresh_token")
        
        # Log the request headers and cookies for debugging
        logger.info(f"Token refresh request received. Cookies present: {bool(request.COOKIES)}")
        
        if not refresh_cookie:
            logger.warning("Refresh token missing from cookies")
            return Response(
                {"error": "No refresh token found in cookies."}, 
                status=status.HTTP_401_UNAUTHORIZED
            )
        
        try:
            # Validate the refresh token
            old_refresh = RefreshToken(refresh_cookie)
            user_id = old_refresh["user_id"]
            
            try:
                user = User.objects.get(id=user_id)
                if not user.is_active:
                    logger.warning(f"Token refresh attempted for inactive user ID: {user_id}")
                    return Response(
                        {"error": "User account is disabled."}, 
                        status=status.HTTP_401_UNAUTHORIZED
                    )
            except User.DoesNotExist:
                logger.warning(f"Token refresh attempted with invalid user ID: {user_id}")
                return Response(
                    {"error": "Invalid refresh token: user not found."}, 
                    status=status.HTTP_401_UNAUTHORIZED
                )
            
            # Blacklist old token if blacklisting is enabled
            if hasattr(old_refresh, 'blacklist'):
                try:
                    old_refresh.blacklist()
                    logger.info(f"Refresh token blacklisted for user {user.email}")
                except Exception as e:
                    logger.error(f"Token blacklisting failed: {str(e)}")
            
            # Generate new tokens
            new_refresh = RefreshToken.for_user(user)
            new_access = new_refresh.access_token
            
            # Serialize the full user object
            serializer = CustomUserSerializer(user, context={'request': request})
            user_data = serializer.data
            
            # Create response with new tokens as cookies
            response = Response({
                "message": "Token refreshed successfully", 
                "token_refresh": "success",
                "user": user_data
            }, status=status.HTTP_200_OK)
            
            # Set the tokens as cookies
            set_auth_cookies(response, new_access, new_refresh)
            
            # Set CSRF token
            csrf_token = get_token(request)
            response.set_cookie(
                key="csrftoken",
                value=csrf_token,
                max_age=settings.CSRF_COOKIE_AGE,
                path=settings.CSRF_COOKIE_PATH,
                domain=settings.CSRF_COOKIE_DOMAIN,
                secure=settings.CSRF_COOKIE_SECURE,
                httponly=False,  # Must be False to be accessible by JavaScript
                samesite=settings.CSRF_COOKIE_SAMESITE or 'Lax',
            )
            
            logger.info(f"Token refreshed successfully for user {user.email}")
            
            return response
        
        except (InvalidToken, TokenError) as e:
            logger.warning(f"Invalid refresh token: {str(e)}")
            return Response(
                {"error": f"Invalid or expired refresh token: {str(e)}"}, 
                status=status.HTTP_401_UNAUTHORIZED
            )
        except Exception as e:
            logger.error(f"Unexpected error during token refresh: {str(e)}")
            return Response(
                {"error": f"An unexpected error occurred: {str(e)}"}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )