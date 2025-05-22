import logging
from django.core.management.base import BaseCommand
from django.db import models
from apps.pharmacys.models import Medicine
from apps.pharmacys.email_utils import send_low_stock_alert_email

logger = logging.getLogger(__name__)

class Command(BaseCommand):
    help = 'Checks inventory for low stock items and sends email alerts'

    def handle(self, *args, **options):
        self.stdout.write('Checking for low stock items...')
        
        # Get all medicines that are below their reorder level
        low_stock_items = Medicine.objects.filter(available_stock__lte=models.F('reorder_level')).select_related('category')
        
        if low_stock_items.exists():
            count = low_stock_items.count()
            self.stdout.write(f'Found {count} items with low stock')
            
            # Send email alert
            try:
                send_low_stock_alert_email(low_stock_items)
                self.stdout.write(self.style.SUCCESS(f'Successfully sent low stock alert email for {count} items'))
                logger.info(f'Low stock alert email sent for {count} items')
            except Exception as e:
                self.stdout.write(self.style.ERROR(f'Failed to send low stock alert email: {str(e)}'))
                logger.error(f'Failed to send low stock alert email: {str(e)}')
        else:
            self.stdout.write(self.style.SUCCESS('No low stock items found'))
            logger.info('No low stock items found during inventory check')
