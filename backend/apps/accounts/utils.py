# accounts/utils.py
from django.conf import settings

def set_auth_cookies(response, access_token, refresh_token):
    """
    Set access and refresh tokens as HTTP cookies in the response.
    
    Args:
        response: DRF Response object
        access_token: JWT access token string
        refresh_token: JWT refresh token object (or string)
    """
    # Set refresh token cookie (long-lived)
    response.set_cookie(
        key="refresh_token",
        value=str(refresh_token),
        max_age=604800,  # 7 days in seconds
        samesite="Strict",  # Prevent cross-site requests
        secure=settings.SESSION_COOKIE_SECURE,  # True in production (HTTPS)
        httponly=True,  # Prevent JavaScript access
    )
    
    # Set access token cookie (short-lived)
    response.set_cookie(
        key="access_token",
        value=str(access_token),
        max_age=3600,  # 1 hour in seconds
        samesite="Lax",  # Allow same-site requests
        secure=settings.SESSION_COOKIE_SECURE,  # True in production (HTTPS)
        httponly=True,  # Prevent JavaScript access
    )