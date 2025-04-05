from django.apps import AppConfig


class EhrConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.ehr'
    
    def ready(self):
        # Import signal handlers
        import apps.ehr.signals