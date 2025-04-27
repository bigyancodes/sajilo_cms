from django.utils import timezone
from apps.appointment.models import Appointment, AppointmentStatus
from datetime import timedelta

def get_patient_appointments(patient, filter_type='upcoming'):
    """
    Get patient appointments with basic filtering
    
    Args:
        patient: The patient user object
        filter_type: 'upcoming', 'past', or 'all'
        
    Returns:
        List of appointment data dictionaries
    """
    # Start with all patient's appointments
    appointments = Appointment.objects.filter(patient=patient).select_related('doctor')
    
    # Apply filter
    if filter_type == 'upcoming':
        appointments = appointments.filter(
            appointment_time__gt=timezone.now(),
            status__in=[AppointmentStatus.PENDING, AppointmentStatus.CONFIRMED]
        ).order_by('appointment_time')
    elif filter_type == 'past':
        appointments = appointments.filter(
            appointment_time__lte=timezone.now()
        ).order_by('-appointment_time')
    else:
        appointments = appointments.order_by('-appointment_time')
    
    # Format appointment data
    appointment_data = []
    for apt in appointments:
        doctor_name = f"Dr. {apt.doctor.first_name} {apt.doctor.last_name}" if hasattr(apt.doctor, 'first_name') else "your doctor"
        
        # Format appointment time for display
        apt_time = apt.appointment_time
        formatted_time = apt_time.strftime("%A, %B %d, %Y at %I:%M %p")
        
        # Calculate days/hours until appointment
        if apt_time > timezone.now():
            time_diff = apt_time - timezone.now()
            days_until = time_diff.days
            hours_until = time_diff.seconds // 3600
            if days_until > 0:
                time_until = f"{days_until} day{'s' if days_until != 1 else ''}"
            else:
                time_until = f"{hours_until} hour{'s' if hours_until != 1 else ''}"
        else:
            time_until = "in the past"
        
        # Create appointment data dictionary
        appointment_data.append({
            'id': str(apt.id),
            'doctor_name': doctor_name,
            'time': formatted_time,
            'reason': apt.reason or "General consultation",
            'status': apt.status,
            'time_until': time_until,
            'can_cancel': apt.can_cancel_or_reschedule(),
            'is_past': apt.is_past()
        })
    
    return appointment_data

def format_appointment_info(appointments, show_all=False):
    """
    Create a human-readable string of appointment information
    
    Args:
        appointments: List of appointment data dictionaries
        show_all: Whether to show all appointments or just the first few
        
    Returns:
        String with formatted appointment information
    """
    if not appointments:
        return "You don't have any appointments scheduled."
    
    # Limit the number of appointments shown unless show_all is True
    display_appointments = appointments if show_all else appointments[:3]
    
    # Create formatted response
    response = "Here are your appointment details:\n\n"
    
    for i, apt in enumerate(display_appointments, 1):
        response += f"{i}. With {apt['doctor_name']} on {apt['time']} "
        
        if apt['is_past']:
            response += f"(Past appointment - {apt['status']})"
        else:
            response += f"({apt['time_until']} from now - {apt['status']})"
        
        if apt['reason']:
            response += f"\n   Reason: {apt['reason']}"
        
        if apt['can_cancel']:
            response += "\n   You can still cancel or reschedule this appointment."
            
        response += "\n\n"
    
    # Add note if more appointments exist
    remaining = len(appointments) - len(display_appointments)
    if remaining > 0:
        response += f"You have {remaining} more appointment{'s' if remaining != 1 else ''}. Ask for 'all my appointments' to see the complete list."
    
    return response

def check_for_appointment_keywords(message):
    """
    Check if a message is asking about appointments
    
    Args:
        message: User message text
        
    Returns:
        Tuple of (is_appointment_query, query_type)
    """
    message = message.lower()
    
    # Common appointment-related keywords
    appointment_keywords = ['appointment', 'appointments', 'schedule', 'scheduled', 
                           'booking', 'booked', 'doctor', 'visit', 'meeting',
                           'checkup', 'check-up', 'consultation']
    
    # Specific query types
    upcoming_keywords = ['upcoming', 'next', 'future', 'scheduled', 'coming', 'soon']
    past_keywords = ['past', 'previous', 'last', 'history', 'before', 'completed']
    cancel_keywords = ['cancel', 'reschedule', 'change', 'move', 'remove']
    
    # Check if message contains appointment keywords
    has_appointment_keywords = any(keyword in message for keyword in appointment_keywords)
    
    if not has_appointment_keywords:
        return False, None
    
    # Determine query type
    query_type = 'upcoming'  # Default
    
    if any(keyword in message for keyword in cancel_keywords):
        query_type = 'cancel'
    elif any(keyword in message for keyword in past_keywords):
        query_type = 'past'
    elif any(keyword in message for keyword in upcoming_keywords) or 'when' in message:
        query_type = 'upcoming'
    elif 'all' in message:
        query_type = 'all'
    
    return True, query_type