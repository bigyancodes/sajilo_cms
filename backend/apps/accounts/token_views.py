from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import status
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
from django.conf import settings
from django.contrib.auth import get_user_model
import logging
from .utils import set_auth_cookies

User = get_user_model()
logger = logging.getLogger(__name__)

class TokenVerifyView(APIView):
    """Verify if an access token is valid."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response({"message": "Token is valid"}, status=status.HTTP_200_OK)

class CookieTokenRefreshView(APIView):
    """Refresh access and refresh tokens using a refresh token from cookies."""
    def post(self, request):
        refresh_cookie = request.COOKIES.get("refresh_token")
        if not refresh_cookie:
            return Response({"error": "No refresh token found in cookies."}, status=status.HTTP_401_UNAUTHORIZED)

        try:
            old_refresh = RefreshToken(refresh_cookie)
            user_id = old_refresh["user_id"]
            try:
                user = User.objects.get(id=user_id)
            except User.DoesNotExist:
                return Response({"error": "Invalid refresh token: user not found."}, status=status.HTTP_401_UNAUTHORIZED)

            if settings.SIMPLE_JWT.get("BLACKLIST_AFTER_ROTATION", False) and hasattr(old_refresh, 'blacklist'):
                try:
                    old_refresh.blacklist()
                    logger.info(f"Refresh token blacklisted for user {user.email}")
                except Exception as e:
                    logger.error(f"Token blacklisting failed: {str(e)}")

            new_refresh = RefreshToken.for_user(user)
            new_access = new_refresh.access_token

            response = Response({"message": "Token refreshed successfully"}, status=status.HTTP_200_OK)
            set_auth_cookies(response, new_access, new_refresh)
            return response

        except (InvalidToken, TokenError):
            return Response({"error": "Invalid or expired refresh token"}, status=status.HTTP_401_UNAUTHORIZED)
        except Exception as e:
            logger.error(f"Unexpected error during token refresh: {str(e)}")
            return Response({"error": "An unexpected error occurred."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)