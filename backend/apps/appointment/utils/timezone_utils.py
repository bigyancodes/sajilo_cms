# apps/appointment/utils/timezone_utils.py
from django.utils import timezone
from datetime import datetime, timedelta
import pytz

def ensure_timezone_aware(datetime_obj):
    """
    Ensure that a datetime object is timezone aware.
    If it's not timezone aware, it will be assumed to be in the current timezone.
    """
    if datetime_obj.tzinfo is None:
        return timezone.make_aware(datetime_obj)
    return datetime_obj

def combine_date_and_time(date_str, time_str, tzinfo=None):
    """
    Combine a date string (YYYY-MM-DD) and a time string (HH:MM:SS) into a timezone-aware datetime.
    If tzinfo is not provided, the current timezone from settings will be used.
    """
    if not tzinfo:
        tzinfo = timezone.get_current_timezone()
    
    # Parse the date and time
    if isinstance(date_str, str):
        date_obj = datetime.strptime(date_str, '%Y-%m-%d').date()
    else:
        date_obj = date_str
        
    if isinstance(time_str, str):
        time_obj = datetime.strptime(time_str, '%H:%M:%S').time()
    else:
        time_obj = time_str
    
    # Combine date and time into a naive datetime
    naive_datetime = datetime.combine(date_obj, time_obj)
    
    # Make the datetime timezone-aware
    aware_datetime = timezone.make_aware(naive_datetime, tzinfo)
    
    return aware_datetime

def convert_to_utc(datetime_obj):
    """
    Convert a datetime object to UTC.
    If the datetime is naive, it will be assumed to be in the current timezone.
    """
    dt = ensure_timezone_aware(datetime_obj)
    return dt.astimezone(pytz.UTC)

def get_datetime_with_current_timezone(datetime_str):
    """
    Parse an ISO format datetime string and return it with the current timezone.
    """
    # Parse the datetime string
    if isinstance(datetime_str, str):
        dt = datetime.fromisoformat(datetime_str.replace('Z', '+00:00'))
    else:
        dt = datetime_str
    
    # Make sure it has timezone info
    dt = ensure_timezone_aware(dt)
    
    # Convert to the current timezone
    current_tz = timezone.get_current_timezone()
    return dt.astimezone(current_tz)