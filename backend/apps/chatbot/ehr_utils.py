from django.utils import timezone
from apps.ehr.models import MedicalRecord
from apps.appointment.models import AppointmentStatus
from datetime import timedelta
import logging

logger = logging.getLogger(__name__)

def get_patient_ehr_summary(patient):
    """
    Get a summary of a patient's electronic health records
    
    Args:
        patient: The patient user object
        
    Returns:
        Dictionary with EHR summary data
    """
    # Get all medical records for the patient
    records = MedicalRecord.objects.filter(
        appointment__patient=patient,
        appointment__status=AppointmentStatus.COMPLETED
    ).select_related('appointment__doctor').order_by('-appointment__appointment_time')
    
    if not records:
        return {
            'has_records': False,
            'total_records': 0,
            'latest_record': None,
            'recent_records': []
        }
    
    # Format the data
    recent_records = []
    for record in records[:5]:  # Get 5 most recent records
        doctor_name = f"Dr. {record.appointment.doctor.first_name} {record.appointment.doctor.last_name}"
        
        # Get diagnoses
        diagnoses = record.diagnosis.split('\n') if record.diagnosis else []
        diagnoses = [d.strip() for d in diagnoses if d.strip()]
        
        # Format date
        appointment_date = record.appointment.appointment_time
        formatted_date = appointment_date.strftime("%B %d, %Y")
        
        # Create record summary
        record_data = {
            'id': str(record.id),
            'date': formatted_date,
            'doctor': doctor_name,
            'diagnoses': diagnoses,
            'has_prescriptions': record.prescriptions.exists(),
            'has_attachments': record.attachments.exists()
        }
        
        recent_records.append(record_data)
    
    return {
        'has_records': True,
        'total_records': records.count(),
        'latest_record': recent_records[0] if recent_records else None,
        'recent_records': recent_records
    }

def get_latest_prescription(patient):
    """
    Get a patient's latest prescription information
    
    Args:
        patient: The patient user object
        
    Returns:
        Dictionary with prescription data or None
    """
    # Get latest medical record with prescriptions
    latest_record = MedicalRecord.objects.filter(
        appointment__patient=patient,
        appointment__status=AppointmentStatus.COMPLETED,
        prescriptions__isnull=False
    ).select_related('appointment__doctor').order_by('-appointment__appointment_time').first()
    
    if not latest_record:
        return None
    
    # Get prescriptions for this record
    prescriptions = latest_record.prescriptions.all()
    if not prescriptions:
        return None
    
    # Format prescription data
    doctor_name = f"Dr. {latest_record.appointment.doctor.first_name} {latest_record.appointment.doctor.last_name}"
    appointment_date = latest_record.appointment.appointment_time
    formatted_date = appointment_date.strftime("%B %d, %Y")
    
    prescription_items = []
    for rx in prescriptions:
        prescription_items.append({
            'medication': rx.medication,
            'dosage': rx.dosage,
            'frequency': rx.frequency,
            'duration': rx.duration,
            'instructions': rx.instructions
        })
    
    return {
        'date': formatted_date,
        'doctor': doctor_name,
        'items': prescription_items,
        'record_id': str(latest_record.id)
    }

def check_for_ehr_keywords(message):
    """
    Check if a message is asking about health records or prescriptions
    
    Args:
        message: User message text
        
    Returns:
        Tuple of (is_ehr_query, query_type)
    """
    message = message.lower()
    
    # EHR-related keywords - these should be specific phrases
    ehr_keywords = [
        'my medical record', 'my health record', 'my ehr', 'my medical history', 
        'my doctor visit', 'visit history', 'my consultation history', 
        'my previous visit', 'my past visit', 'my diagnosis', 'my previous diagnosis',
        'show me my record', 'show my record', 'my medical files'
    ]
    
    # More specific prescription-related keywords
    prescription_keywords = [
        'my prescription', 'my medicine', 'my medication', 'my drugs', 'my pills', 
        'my tablets', 'my dose', 'my dosage', 'my refill', 'my pharmacy', 
        'what am i taking', 'what medicine am i taking',
        'show me my prescriptions', 'what medications do i have'
    ]
    
    # Skip specific comparison phrases - these should go to the AI
    comparison_phrases = [
        'than my', 'better than', 'instead of', 'alternative', 'natural', 'homemade',
        'home remedy', 'other than', 'different from', 'compare', 'vs', 'versus',
        'other option', 'what about', 'what else', 'something else'
    ]
    
    # If message contains comparison phrases, don't treat as EHR query
    if any(phrase in message for phrase in comparison_phrases):
        logger.debug(f"Message contains comparison phrase, skipping EHR detection: {message}")
        return False, None
    
    # Check for very specific EHR keywords
    is_ehr_query = any(keyword in message for keyword in ehr_keywords)
    
    # Check for very specific prescription keywords
    is_prescription_query = any(keyword in message for keyword in prescription_keywords)
    
    # Log detection for debugging
    logger.debug(f"EHR keyword check: ehr={is_ehr_query}, prescription={is_prescription_query}, message='{message}'")
    
    if is_prescription_query:
        return True, 'prescription'
    elif is_ehr_query:
        return True, 'ehr'
    
    return False, None

def format_ehr_summary(ehr_summary):
    """
    Format EHR summary into readable text
    
    Args:
        ehr_summary: Dictionary with EHR summary data
        
    Returns:
        Formatted string with EHR summary
    """
    if not ehr_summary['has_records']:
        return "You don't have any medical records in our system yet. Records are created when you complete an appointment with one of our doctors."
    
    response = f"You have {ehr_summary['total_records']} medical record{'s' if ehr_summary['total_records'] > 1 else ''} in our system.\n\n"
    
    # Add latest record info
    latest = ehr_summary.get('latest_record')
    if latest:
        response += f"Your most recent visit was on {latest['date']} with {latest['doctor']}.\n"
        
        if latest['diagnoses']:
            response += "Diagnosis: " + ", ".join(latest['diagnoses']) + "\n"
        
    # Add recent records
    if len(ehr_summary['recent_records']) > 1:
        response += "\nYour recent medical visits:\n"
        
        for i, record in enumerate(ehr_summary['recent_records'], 1):
            response += f"{i}. {record['date']} with {record['doctor']}"
            
            if record['has_prescriptions']:
                response += " (includes prescriptions)"
                
            response += "\n"
    
    response += "\nTo view your complete medical records, please use the patient portal or ask your doctor during your next appointment."
    
    return response

def format_prescription_info(prescription):
    """
    Format prescription data into readable text
    
    Args:
        prescription: Dictionary with prescription data
        
    Returns:
        Formatted string with prescription information
    """
    if not prescription:
        return "You don't have any prescriptions in our system. Prescriptions are added when a doctor prescribes medication during an appointment."
    
    response = f"Your latest prescription was from {prescription['doctor']} on {prescription['date']}:\n\n"
    
    for i, item in enumerate(prescription['items'], 1):
        response += f"{i}. {item['medication']} - {item['dosage']}\n"
        response += f"   Take: {item['frequency']} for {item['duration']}\n"
        
        if item['instructions']:
            response += f"   Instructions: {item['instructions']}\n"
        
        response += "\n"
    
    response += "Please follow your doctor's instructions for all medications. For refills or questions about your prescriptions, please contact your pharmacy or doctor's office."
    
    return response