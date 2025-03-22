# accounts/authentication.py
from rest_framework.authentication import BaseAuthentication
from rest_framework.exceptions import AuthenticationFailed
from rest_framework_simplejwt.tokens import AccessToken
from django.contrib.auth import get_user_model

User = get_user_model()

class CookieJWTAuthentication(BaseAuthentication):
    """
    Custom authentication class to validate JWT access tokens from cookies.
    """
    def authenticate(self, request):
        # Get access token from cookies
        access_token = request.COOKIES.get("access_token")
        
        if not access_token:
            return None  # No token, let other auth methods try
        
        try:
            # Validate the access token
            token = AccessToken(access_token)
            user_id = token["user_id"]
            user = User.objects.get(id=user_id)
            
            # Check if user is active
            if not user.is_active:
                raise AuthenticationFailed("User account is disabled.")
            
            return (user, token)  # Return user and token
        except Exception as e:
            raise AuthenticationFailed(f"Invalid or expired token: {str(e)}")
    
    def authenticate_header(self, request):
        # Return a string for the WWW-Authenticate header (optional)
        return "Bearer"