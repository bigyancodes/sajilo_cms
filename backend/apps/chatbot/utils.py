import logging
from django.conf import settings
from google import genai
import re
from .appointment_utils import get_patient_appointments, format_appointment_info, check_for_appointment_keywords
from .ehr_utils import get_patient_ehr_summary, get_latest_prescription, check_for_ehr_keywords, format_ehr_summary, format_prescription_info
from .doctor_utils import get_doctor_list, get_available_specialties, get_doctor_availability, check_for_doctor_keywords, format_doctor_list, format_specialties_list, format_doctor_availability

logger = logging.getLogger(__name__)

# Context tracking for better understanding of follow-up questions
CONTEXT_TYPES = {
    'APPOINTMENT': 'appointment',
    'EHR': 'ehr',
    'DOCTOR': 'doctor',
    'PRESCRIPTION': 'prescription',
    'GENERAL': 'general'
}

def extract_entities(message):
    """
    Extract entities like dates, numbers, and names from user messages
    Returns a dictionary of extracted entities
    """
    entities = {}
    
    # Try to extract dates using regex (simple pattern)
    date_patterns = [
        r'(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})',  # 01/30/2025, 1-30-25
        r'(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s+\d{1,2}(?:st|nd|rd|th)?(?:[,]\s*\d{4})?',  # January 30th, 2025
        r'(tomorrow|today|yesterday|next week|next month)',  # Relative dates
    ]
    
    for pattern in date_patterns:
        matches = re.findall(pattern, message.lower())
        if matches:
            entities['dates'] = matches
    
    # Try to extract doctor names (Dr. LastName)
    doctor_matches = re.findall(r'dr\.?\s+([a-z]+)', message.lower())
    if doctor_matches:
        entities['doctor_names'] = doctor_matches
    
    # Extract numbers
    number_matches = re.findall(r'\b(\d+)\b', message)
    if number_matches:
        entities['numbers'] = number_matches
    
    return entities

def analyze_session_context(session_history):
    """
    Analyze conversation history to determine the current context
    Returns a tuple of (context_type, context_entities)
    """
    if not session_history or len(session_history) < 2:
        return (CONTEXT_TYPES['GENERAL'], {})
    
    # Get the last assistant message
    last_assistant_messages = [msg for msg in session_history if msg['role'] == 'assistant']
    if not last_assistant_messages:
        return (CONTEXT_TYPES['GENERAL'], {})
    
    last_assistant_msg = last_assistant_messages[-1]['content'].lower()
    
    # Check for context clues in the assistant's last message
    context_type = CONTEXT_TYPES['GENERAL']
    
    # Check if the last response was about appointments
    if any(keyword in last_assistant_msg for keyword in ['appointment', 'schedule', 'visit', 'doctor']):
        context_type = CONTEXT_TYPES['APPOINTMENT']
    
    # Check if the last response was about medical records
    elif any(keyword in last_assistant_msg for keyword in ['medical record', 'health record', 'diagnosis']):
        context_type = CONTEXT_TYPES['EHR']
    
    # Check if the last response was about prescriptions
    elif any(keyword in last_assistant_msg for keyword in ['prescription', 'medication', 'medicine', 'drug']):
        context_type = CONTEXT_TYPES['PRESCRIPTION']
    
    # Check if the last response was about doctors
    elif any(keyword in last_assistant_msg for keyword in ['doctor list', 'specialist', 'specialty']):
        context_type = CONTEXT_TYPES['DOCTOR']
    
    # Also look at the last few user messages to extract entities
    recent_user_msgs = [msg['content'] for msg in session_history[-3:] if msg['role'] == 'user']
    entities = {}
    
    for msg in recent_user_msgs:
        msg_entities = extract_entities(msg)
        for key, values in msg_entities.items():
            if key not in entities:
                entities[key] = []
            entities[key].extend(values)
    
    return (context_type, entities)

def is_simple_affirmation(message):
    """Check if a message is a simple yes/no or affirmation"""
    simple_responses = ['yes', 'no', 'yeah', 'nope', 'sure', 'ok', 'okay', 'thanks', 'thank you']
    return message.lower().strip() in simple_responses

def get_gemini_response(user_message, user, session_history=None):
    """
    Get a response from Gemini API with comprehensive healthcare information support
    
    Args:
        user_message: The message from the user
        user: The user object (patient)
        session_history: Previous messages in the conversation
        
    Returns:
        Text response from the AI
    """
    try:
        # Log the message for debugging
        logger.info(f"Processing message: '{user_message}' for user {user.id}")
        
        # Check for doctor-related queries FIRST
        # (This ensures phrases like "list of doctor" are correctly identified)
        is_doctor_query, doctor_query_type = check_for_doctor_keywords(user_message)
        if is_doctor_query:
            logger.info(f"Detected doctor query: {doctor_query_type}")
            if doctor_query_type == 'specialties':
                # Get and format specialties list
                specialties = get_available_specialties()
                return format_specialties_list(specialties)
            elif doctor_query_type == 'doctor_list':
                # Extract potential specialty from message
                specialty = None
                specialties = get_available_specialties()
                for s in specialties:
                    if s.lower() in user_message.lower():
                        specialty = s
                        break
                
                # Get and format doctor list
                doctors = get_doctor_list(specialty)
                return format_doctor_list(doctors)
            elif doctor_query_type == 'availability':
                # Try to find doctor ID or name in the message
                doctor_list = get_doctor_list()
                doctor_id = None
                
                for doctor in doctor_list:
                    if doctor['name'].lower() in user_message.lower():
                        doctor_id = doctor['id']
                        break
                
                if doctor_id:
                    # Get and format doctor availability
                    availability = get_doctor_availability(doctor_id)
                    return format_doctor_availability(availability)
                else:
                    # If no specific doctor found, return the list of doctors
                    return "I'm not sure which doctor you're asking about. Here's a list of our doctors:\n\n" + format_doctor_list(doctor_list)
        
        # Handle simple responses and context-dependent messages
        if session_history and len(session_history) > 1:
            # Analyze the conversation context
            context_type, context_entities = analyze_session_context(session_history)
            logger.debug(f"Conversation context: {context_type}, entities: {context_entities}")
            
            # If it's a simple yes/no response, we need to understand the context
            if is_simple_affirmation(user_message):
                logger.info(f"Detected simple affirmation: '{user_message}' in context: {context_type}")
                
                # For simple responses, we always use the AI to maintain a natural conversation
                logger.info(f"Using AI for simple response in context {context_type}")
                return get_ai_response(user_message, user, session_history)
        
        # First, check if this is a general question vs specific healthcare query
        message_lower = user_message.lower()
        general_question_indicators = [
            "what is", "how do", "can you explain", "tell me about", 
            "why is", "how does", "what are", "do you know",
            "than my", "alternative", "natural", "homemade", "home remedy",
            "compare", "difference between", "better than", "worse than"
        ]
        
        is_general_question = any(phrase in message_lower for phrase in general_question_indicators)
        logger.debug(f"Message '{message_lower}' general question check: {is_general_question}")
        
        # If it looks like a general question, skip specific handlers and go to AI
        if is_general_question:
            logger.info(f"Detected general question, using AI directly: '{user_message}'")
            return get_ai_response(user_message, user, session_history)
        
        # Check for other specific healthcare queries
        # 1. Appointment queries
        is_appointment_query, appointment_query_type = check_for_appointment_keywords(user_message)
        if is_appointment_query:
            logger.info(f"Detected appointment query: {appointment_query_type}")
            if appointment_query_type == 'cancel':
                return "If you need to cancel an appointment, please log in to your patient portal or call our reception. I can show you your upcoming appointments if that would help."
            
            # Get appointment data
            appointments = get_patient_appointments(
                patient=user, 
                filter_type=appointment_query_type if appointment_query_type in ['upcoming', 'past', 'all'] else 'upcoming'
            )
            
            # Format appointment info
            show_all = appointment_query_type == 'all'
            return format_appointment_info(appointments, show_all)
        
        # 2. EHR and prescription queries
        is_ehr_query, ehr_query_type = check_for_ehr_keywords(user_message)
        if is_ehr_query:
            logger.info(f"Detected EHR query: {ehr_query_type}")
            if ehr_query_type == 'prescription':
                # Get and format prescription info
                prescription_data = get_latest_prescription(user)
                return format_prescription_info(prescription_data)
            else:
                # Get and format EHR summary
                ehr_summary = get_patient_ehr_summary(user)
                return format_ehr_summary(ehr_summary)
        
        # If no specific healthcare query detected, use AI
        logger.info(f"No specific healthcare query detected, using AI for: '{user_message}'")
        return get_ai_response(user_message, user, session_history)
    
    except Exception as e:
        logger.error(f"Error in get_gemini_response: {str(e)}")
        return "I apologize, but I'm having trouble processing your request. Please try again later."

def get_ai_response(user_message, user, session_history=None):
    """
    Get a response directly from the AI, with healthcare context included
    """
    try:
        api_key = getattr(settings, 'GEMINI_API_KEY', '')
        if not api_key:
            logger.error("GEMINI_API_KEY is not set in settings")
            return "I apologize, but I'm having trouble connecting to my knowledge base. Please try again later."
        
        # Initialize the client
        client = genai.Client(api_key=api_key)
        
        # Get healthcare data for context
        upcoming_appointments = get_patient_appointments(user, 'upcoming')
        ehr_summary = get_patient_ehr_summary(user)
        prescription_data = get_latest_prescription(user)
        
        # Create rich context for the AI prompt
        healthcare_context = []
        
        # Add appointment context
        if upcoming_appointments:
            next_apt = upcoming_appointments[0]
            healthcare_context.append(f"- You have an upcoming appointment with {next_apt['doctor_name']} on {next_apt['time']} ({next_apt['time_until']} from now).")
        else:
            healthcare_context.append("- You currently have no upcoming appointments scheduled.")
        
        # Add EHR context
        if ehr_summary['has_records']:
            latest = ehr_summary['latest_record']
            ehr_note = f"- Your last medical visit was on {latest['date']} with {latest['doctor']}."
            if latest['diagnoses']:
                ehr_note += f" Diagnosis: {', '.join(latest['diagnoses'][:2])}"
                if len(latest['diagnoses']) > 2:
                    ehr_note += ", and other conditions"
            healthcare_context.append(ehr_note)
        else:
            healthcare_context.append("- You don't have any medical records in our system yet.")
        
        # Add prescription context
        if prescription_data:
            medications = [item['medication'] for item in prescription_data['items']]
            prescription_note = f"- You currently have prescription(s) for: {', '.join(medications)}"
            healthcare_context.append(prescription_note)
        
        # Combine all context
        patient_context = "\n".join(healthcare_context)
        
        # Look at session_history to determine if we need to include context about a previous query
        previous_context = ""
        if session_history and len(session_history) > 1:
            context_type, context_entities = analyze_session_context(session_history)
            if context_type != CONTEXT_TYPES['GENERAL']:
                prev_context_note = f"The patient was previously asking about their {context_type}."
                if context_entities:
                    entity_notes = []
                    if 'doctor_names' in context_entities:
                        entity_notes.append(f"They mentioned doctors: {', '.join(context_entities['doctor_names'])}")
                    if 'dates' in context_entities:
                        entity_notes.append(f"They mentioned dates: {', '.join(context_entities['dates'])}")
                    
                    if entity_notes:
                        prev_context_note += " " + " ".join(entity_notes)
                
                previous_context = prev_context_note
        
        # Create a comprehensive system prompt with healthcare information
        system_instruction = f"""You are a helpful healthcare assistant for patients of our medical center.
        You're speaking with {user.get_full_name() or user.email.split('@')[0]}.
        
        PATIENT INFORMATION:
        {patient_context}
        
        {previous_context}
        
        Be friendly and supportive, but remember you're not a doctor and cannot provide medical diagnosis.
        For serious concerns, always recommend the patient to schedule an appointment with a doctor.
        
        Keep in mind:
        1. If the patient asks about their medications or treatment, reference their actual prescriptions.
        2. If they ask about their appointments, provide their actual scheduled appointments.
        3. If they ask about their medical history, reference their actual medical records.
        4. For general medical questions, provide accurate general information while noting that individual situations may vary.
        5. Pay attention to their previous questions for context.
        
        Keep your responses concise, friendly and compassionate."""
        
        # Use chat if we have session history
        if session_history and len(session_history) > 1:
            try:
                # Use the Gemini chat API for better context handling
                chat = client.chats.create(
                    model="gemini-2.0-flash", 
                    system_instruction=system_instruction
                )
                
                # Add the most recent messages to preserve context (up to 5 messages)
                recent_history = session_history[-10:] if len(session_history) > 10 else session_history
                
                for msg in recent_history:
                    if msg['role'] == 'user':
                        chat.send_message(msg['content'])
                    # We skip assistant messages since they're generated by the model
                
                # Send the current message and get response
                response = chat.send_message(user_message)
                return response.text
            except Exception as e:
                logger.error(f"Chat API error: {str(e)}")
                # Fall back to single message if chat fails
        
        # For first message or if chat failed, use single message approach
        try:
            from google.genai import types
            
            # For simple messages, include conversation context in the prompt
            if is_simple_affirmation(user_message) and session_history and len(session_history) > 1:
                # Get the last messages
                last_messages = session_history[-2:]
                conversation_context = "\n".join([f"{msg['role']}: {msg['content']}" for msg in last_messages])
                
                # Combine with the current message
                combined_prompt = f"Previous conversation:\n{conversation_context}\n\nCurrent message: {user_message}"
            else:
                combined_prompt = user_message
            
            response = client.models.generate_content(
                model="gemini-2.0-flash",
                contents=combined_prompt,
                config=types.GenerateContentConfig(
                    system_instruction=system_instruction,
                    temperature=0.3,  # Slightly higher temperature for more varied responses
                    max_output_tokens=500
                )
            )
            
            return response.text
            
        except Exception as e:
            logger.error(f"Gemini API error: {str(e)}")
            
            # Try fallback model
            try:
                response = client.models.generate_content(
                    model="gemini-1.5-flash",
                    contents=user_message,
                    config=types.GenerateContentConfig(
                        system_instruction=system_instruction,
                        temperature=0.2,
                        max_output_tokens=500
                    )
                )
                return response.text
            except Exception as e:
                logger.error(f"All models failed: {str(e)}")
                return "I apologize, but I'm having trouble processing your request. Please try again later."
    except Exception as e:
        logger.error(f"Error in get_ai_response: {str(e)}")
        return "I apologize, but I'm having trouble processing your request. Please try again later."