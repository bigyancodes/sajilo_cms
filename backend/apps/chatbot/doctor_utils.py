from django.utils import timezone
from django.contrib.auth import get_user_model
from apps.accounts.models import UserRoles
from apps.appointment.models import AvailableTimeSlot, Appointment
from datetime import datetime, timedelta, time
import calendar
import logging

logger = logging.getLogger(__name__)
User = get_user_model()

def check_for_doctor_keywords(message):
    """
    Check if a message is asking about doctors or scheduling
    
    Args:
        message: User message text
        
    Returns:
        Tuple of (is_doctor_query, query_type)
    """
    message = message.lower()
    
    # Extra preprocessing - remove common filler words that might interfere with detection
    message = ' ' + message + ' '  # Add spaces to help with word boundary matching
    
    # IMPROVED: Make the doctor keyword detection much more sensitive
    # Doctor list keywords - very basic phrases that should trigger
    doctor_list_keywords = [
        ' list of doctor', ' doctor list', ' doctors', 
        ' show doctor', ' find doctor', ' which doctor', 
        ' available doctor', ' all doctor'
    ]
    
    # Specialty keywords
    specialty_keywords = [
        ' special', ' specialist', ' specialt', 
        ' specialist in', ' speciali', ' specializ'
    ]
    
    # Doctor availability keywords
    availability_keywords = [
        ' availab', ' schedule', ' slot', ' booking',
        ' when is doctor', ' doctor hour', ' doctor time', 
        ' see doctor', ' meet doctor', ' visit doctor'
    ]
    
    # First check for doctor_list keywords
    is_doctor_list_query = any(keyword in message for keyword in doctor_list_keywords)
    
    # Then check for specialty keywords
    is_specialty_query = any(keyword in message for keyword in specialty_keywords)
    
    # Finally check for availability keywords
    is_availability_query = any(keyword in message for keyword in availability_keywords)
    
    # Log the detection results for debugging
    logger.debug(f"Doctor keyword check: list={is_doctor_list_query}, specialty={is_specialty_query}, availability={is_availability_query}, message='{message}'")
    
    if is_doctor_list_query:
        return True, 'doctor_list'
    elif is_specialty_query:
        return True, 'specialties'
    elif is_availability_query:
        return True, 'availability'
    
    return False, None

def get_doctor_list(specialty=None):
    """
    Get a list of doctors, optionally filtered by specialty
    
    Args:
        specialty: Optional specialty to filter doctors
        
    Returns:
        List of doctor information dictionaries
    """
    try:
        # Start with all active doctors
        doctors_query = User.objects.filter(
            role=UserRoles.DOCTOR,
            is_active=True,
            is_verified=True
        )
        
        # Log the initial doctor count for debugging
        logger.debug(f"Initial doctor count: {doctors_query.count()}")
        
        # Apply specialty filter if provided
        if specialty:
            try:
                # Check if we need to join with doctor_profile
                if hasattr(User, 'doctor_profile'):
                    doctors_query = doctors_query.filter(
                        doctor_profile__specialty__icontains=specialty
                    )
                    logger.debug(f"Filtered by specialty '{specialty}', count: {doctors_query.count()}")
                else:
                    logger.warning("Doctor profile relationship not found, skipping specialty filter")
            except Exception as e:
                logger.error(f"Error filtering by specialty: {str(e)}")
        
        # Convert query to list with needed information
        doctor_list = []
        for doctor in doctors_query:
            # Get specialty if available
            specialty_name = "General Medicine"
            
            try:
                if hasattr(doctor, 'doctor_profile') and doctor.doctor_profile:
                    if hasattr(doctor.doctor_profile, 'specialty') and doctor.doctor_profile.specialty:
                        specialty_name = doctor.doctor_profile.specialty
            except Exception as e:
                logger.error(f"Error getting doctor specialty: {str(e)}")
            
            # Check if doctor has any available slots
            has_slots = False
            try:
                has_slots = AvailableTimeSlot.objects.filter(doctor=doctor).exists()
            except Exception as e:
                logger.error(f"Error checking available slots: {str(e)}")
            
            # Create doctor info dict
            doctor_data = {
                'id': doctor.id,
                'name': f"Dr. {doctor.first_name} {doctor.last_name}".strip(),
                'specialty': specialty_name,
                'has_available_slots': has_slots
            }
            
            doctor_list.append(doctor_data)
        
        logger.debug(f"Returning {len(doctor_list)} doctors")
        return doctor_list
        
    except Exception as e:
        logger.error(f"Error in get_doctor_list: {str(e)}")
        return []  # Return empty list on error

def get_available_specialties():
    """
    Get a list of available medical specialties
    
    Returns:
        List of specialty names
    """
    try:
        specialties = []
        
        # First try using DoctorProfile model if it exists
        try:
            from apps.accounts.models import DoctorProfile
            if DoctorProfile:
                specialties = DoctorProfile.objects.values_list('specialty', flat=True).distinct()
                specialties = [s for s in specialties if s]
                logger.debug(f"Found {len(specialties)} specialties from DoctorProfile")
        except (ImportError, AttributeError) as e:
            logger.warning(f"Couldn't import DoctorProfile: {str(e)}")
        
        # If no specialties found, try getting them from User model directly
        if not specialties:
            doctors = User.objects.filter(role=UserRoles.DOCTOR, is_active=True)
            
            for doctor in doctors:
                try:
                    if hasattr(doctor, 'doctor_profile') and doctor.doctor_profile:
                        if hasattr(doctor.doctor_profile, 'specialty') and doctor.doctor_profile.specialty:
                            specialty = doctor.doctor_profile.specialty
                            if specialty and specialty not in specialties:
                                specialties.append(specialty)
                except Exception as e:
                    logger.error(f"Error extracting specialty: {str(e)}")
        
        # Return the list of specialties
        return sorted(specialties)
    
    except Exception as e:
        logger.error(f"Error in get_available_specialties: {str(e)}")
        return ['General Medicine']  # Return default on error

def format_doctor_list(doctors, include_specialties=True):
    """
    Format doctor list into readable text
    
    Args:
        doctors: List of doctor information dictionaries
        include_specialties: Whether to include specialty information
        
    Returns:
        Formatted string with doctor list
    """
    if not doctors:
        return "We don't have any doctors matching your criteria in our system at the moment."
    
    # Group doctors by specialty if needed
    if include_specialties:
        doctors_by_specialty = {}
        for doctor in doctors:
            specialty = doctor['specialty']
            if specialty not in doctors_by_specialty:
                doctors_by_specialty[specialty] = []
            doctors_by_specialty[specialty].append(doctor)
        
        # Create response
        response = f"We have {len(doctors)} doctors available:\n\n"
        
        for specialty, specialty_doctors in doctors_by_specialty.items():
            response += f"**{specialty}**\n"
            for doctor in specialty_doctors:
                response += f"- {doctor['name']}\n"
            response += "\n"
    else:
        # Simple list without grouping
        response = f"We have {len(doctors)} doctors available:\n\n"
        for doctor in doctors:
            response += f"- {doctor['name']}"
            if include_specialties:
                response += f" ({doctor['specialty']})"
            response += "\n"
    
    response += "\nTo schedule an appointment, please use the patient portal or contact our reception desk."
    
    return response

def get_doctor_availability(doctor_id, days_ahead=7):
    """
    Get availability information for a specific doctor
    
    Args:
        doctor_id: The doctor's user ID
        days_ahead: Number of days to look ahead for availability
        
    Returns:
        Dictionary with doctor and availability information
    """
    try:
        doctor = User.objects.get(id=doctor_id, role=UserRoles.DOCTOR, is_active=True)
    except User.DoesNotExist:
        return {'error': 'Doctor not found'}
    
    try:
        # Get specialty
        specialty = "General Medicine"
        if hasattr(doctor, 'doctor_profile') and doctor.doctor_profile:
            if hasattr(doctor.doctor_profile, 'specialty') and doctor.doctor_profile.specialty:
                specialty = doctor.doctor_profile.specialty
        
        # Get the doctor's available time slots
        try:
            available_slots = AvailableTimeSlot.objects.filter(doctor=doctor)
        except Exception as e:
            logger.error(f"Error getting available slots: {str(e)}")
            available_slots = []
        
        if not available_slots:
            return {
                'doctor': {
                    'id': doctor.id,
                    'name': f"Dr. {doctor.first_name} {doctor.last_name}".strip(),
                    'specialty': specialty
                },
                'has_slots': False,
                'message': "This doctor doesn't have any regular hours set in our system."
            }
        
        # Organize slots by day of week
        slots_by_day = {}
        for slot in available_slots:
            try:
                day_name = calendar.day_name[slot.day_of_week]
                if day_name not in slots_by_day:
                    slots_by_day[day_name] = []
                
                slots_by_day[day_name].append({
                    'start': slot.start_time.strftime('%I:%M %p'),
                    'end': slot.end_time.strftime('%I:%M %p')
                })
            except Exception as e:
                logger.error(f"Error processing slot: {str(e)}")
        
        # Get upcoming available days (excluding today)
        today = timezone.now().date()
        upcoming_days = []
        
        for i in range(1, days_ahead + 1):
            check_date = today + timedelta(days=i)
            day_of_week = check_date.weekday()
            day_name = calendar.day_name[day_of_week]
            
            if day_name in slots_by_day:
                upcoming_days.append({
                    'date': check_date.strftime('%A, %B %d, %Y'),
                    'day_of_week': day_name
                })
        
        return {
            'doctor': {
                'id': doctor.id,
                'name': f"Dr. {doctor.first_name} {doctor.last_name}".strip(),
                'specialty': specialty
            },
            'has_slots': True,
            'slots_by_day': slots_by_day,
            'upcoming_available_days': upcoming_days[:5]  # Limit to next 5 available days
        }
        
    except Exception as e:
        logger.error(f"Error in get_doctor_availability: {str(e)}")
        return {
            'error': f"Couldn't retrieve doctor availability information.",
            'details': str(e)
        }

def format_specialties_list(specialties):
    """
    Format list of specialties into readable text
    
    Args:
        specialties: List of specialty names
        
    Returns:
        Formatted string with specialties list
    """
    if not specialties:
        return "We don't have any medical specialties in our system at the moment."
    
    response = "Our medical center offers the following specialties:\n\n"
    
    for specialty in specialties:
        response += f"- {specialty}\n"
    
    response += "\nTo find a doctor in a specific specialty, you can ask me something like 'Show me cardiologists' or 'List orthopedic doctors'."
    
    return response

def format_doctor_availability(availability_data):
    """
    Format doctor availability into readable text
    
    Args:
        availability_data: Dictionary with doctor and availability information
        
    Returns:
        Formatted string with doctor availability
    """
    if 'error' in availability_data:
        return f"Sorry, {availability_data['error']} Please try again with a different doctor."
    
    doctor = availability_data['doctor']
    
    if not availability_data['has_slots']:
        return f"{doctor['name']} does not currently have any regular slots in the schedule. Please contact our reception desk for assistance with scheduling."
    
    response = f"{doctor['name']} ({doctor['specialty']}) is available on the following days:\n\n"
    
    # Show upcoming available days
    upcoming = availability_data.get('upcoming_available_days', [])
    if upcoming:
        response += "**Upcoming available days:**\n"
        for day in upcoming:
            response += f"- {day['date']}\n"
        response += "\n"
    
    # Show regular schedule
    response += "**Regular weekly schedule:**\n"
    slots_by_day = availability_data['slots_by_day']
    
    for day in ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']:
        if day in slots_by_day:
            response += f"{day}: "
            time_ranges = []
            for slot in slots_by_day[day]:
                time_ranges.append(f"{slot['start']} - {slot['end']}")
            response += ", ".join(time_ranges) + "\n"
    
    response += "\nTo book a specific appointment time, please use the patient portal or contact our reception desk."
    
    return response