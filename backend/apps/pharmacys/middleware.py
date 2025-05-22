# pharmacy/middleware.py
import json
from django.utils.deprecation import MiddlewareMixin
from .models import AuditLog

class AuditLogMiddleware(MiddlewareMixin):
    """
    Middleware to automatically log important actions for audit trail
    """
    
    MONITORED_ACTIONS = [
        'POST', 'PUT', 'PATCH', 'DELETE'
    ]
    
    MONITORED_PATHS = [
        '/api/pharmacy/',
        '/api/accounts/',
    ]
    
    def process_response(self, request, response):
        # Only log certain methods
        if request.method not in self.MONITORED_ACTIONS:
            return response
        
        # Only log certain paths
        if not any(path in request.path for path in self.MONITORED_PATHS):
            return response
        
        # Skip if user is not authenticated
        if not hasattr(request, 'user') or not request.user.is_authenticated:
            return response
        
        # Skip if response is an error
        if response.status_code >= 400:
            return response
        
        # Determine the action type
        action_mapping = {
            'POST': AuditLog.ACTION_TYPES.CREATE,
            'PUT': AuditLog.ACTION_TYPES.UPDATE,
            'PATCH': AuditLog.ACTION_TYPES.UPDATE,
            'DELETE': AuditLog.ACTION_TYPES.DELETE,
        }
        
        action = action_mapping.get(request.method, 'UNKNOWN')
        
        # Extract model name and object ID from URL
        path_parts = request.path.strip('/').split('/')
        model_name = ''
        object_id = ''
        
        if len(path_parts) >= 3:
            model_name = path_parts[2]  # e.g., 'medicines', 'orders'
            if len(path_parts) >= 4 and path_parts[3].isdigit():
                object_id = path_parts[3]
        
        # Get IP address
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip_address = x_forwarded_for.split(',')[0]
        else:
            ip_address = request.META.get('REMOTE_ADDR')
        
        # Get user agent
        user_agent = request.META.get('HTTP_USER_AGENT', '')
        
        # Extract changes from request data
        changes = {}
        if request.method in ['POST', 'PUT', 'PATCH']:
            if hasattr(request, 'data'):
                changes = dict(request.data)
            elif request.content_type == 'application/json':
                try:
                    changes = json.loads(request.body)
                except:
                    pass
        
        # Create audit log entry
        try:
            AuditLog.objects.create(
                user=request.user,
                action=action,
                model_name=model_name,
                object_id=object_id,
                changes=changes,
                ip_address=ip_address,
                user_agent=user_agent[:500]  # Truncate long user agents
            )
        except Exception as e:
            # Log the error but don't break the request
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"Failed to create audit log: {str(e)}")
        
        return response