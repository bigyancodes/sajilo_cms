from django.conf import settings
import logging

logger = logging.getLogger(__name__)

def set_auth_cookies(response, access_token, refresh_token):
    """
    Set access and refresh tokens as HTTP cookies in the response.
    This function ensures cookies are properly set for local development
    and production environments.
    
    Args:
        response: DRF Response object
        access_token: JWT access token string
        refresh_token: JWT refresh token object (or string)
    """
    # Debug info
    logger.info(f"Setting auth cookies. Access token type: {type(access_token)}, Refresh token type: {type(refresh_token)}")
    
    # Convert tokens to strings if they're not already
    access_token_str = str(access_token)
    refresh_token_str = str(refresh_token)
    
    # Get the domain settings (needed for proper cookie handling)
    domain = settings.COOKIE_DOMAIN if hasattr(settings, 'COOKIE_DOMAIN') else None
    
    # Determine if we're in a secure environment
    secure = settings.SESSION_COOKIE_SECURE
    
    # Set refresh token cookie (long-lived)
    response.set_cookie(
        key="refresh_token",
        value=refresh_token_str,
        max_age=7 * 24 * 60 * 60,  # 7 days in seconds
        expires=None,  # Use max_age instead
        path="/",  # Available to all paths
        domain=domain,
        secure=secure,
        httponly=True,  # Not accessible via JavaScript
        samesite=settings.CSRF_COOKIE_SAMESITE or 'Lax'  # Match CSRF cookie settings
    )
    
    # Set access token cookie (short-lived)
    response.set_cookie(
        key="access_token",
        value=access_token_str,
        max_age=60 * 60,  # 1 hour in seconds
        expires=None,  # Use max_age instead
        path="/",  # Available to all paths
        domain=domain,
        secure=secure,
        httponly=True,  # Not accessible via JavaScript
        samesite=settings.CSRF_COOKIE_SAMESITE or 'Lax'  # Match CSRF cookie settings
    )
    
    # Add headers for debugging (can be removed in production)
    response["X-Refresh-Token-Set"] = "True"
    response["X-Access-Token-Set"] = "True"
    
    logger.info("Auth cookies set successfully")
    
    return response