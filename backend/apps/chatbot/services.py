import os
import logging
import google.generativeai as genai
from django.conf import settings
from .models import ChatSession, ChatMessage

logger = logging.getLogger(__name__)

class GeminiService:
    """Service to interact with Google's Gemini AI"""
    
    def __init__(self):
        api_key = settings.GEMINI_API_KEY
        if not api_key:
            raise ValueError("GEMINI_API_KEY is not set in settings")
        
        genai.configure(api_key=api_key)
        self.model = genai.GenerativeModel('gemini-pro')
    
    def get_or_create_chat(self, user, session_id=None):
        """Get existing chat session or create a new one"""
        if session_id:
            try:
                return ChatSession.objects.get(id=session_id, user=user)
            except ChatSession.DoesNotExist:
                logger.warning(f"Session {session_id} not found for user {user.id}, creating new")
        
        # Create new session
        return ChatSession.objects.create(
            user=user,
            title="New Conversation"  # Default title, can be updated later
        )
    
    def build_messages_history(self, session):
        """Convert DB messages to format expected by Gemini API"""
        messages = session.messages.all()
        history = []
        
        for msg in messages:
            role = "user" if msg.role == "user" else "model"
            history.append({"role": role, "parts": [msg.content]})
        
        return history
    
    def get_system_prompt(self, user):
        """Generate system prompt based on user data"""
        full_name = user.get_full_name() or user.email.split('@')[0]
        
        return [
            {"role": "system", "parts": [f"""You are a helpful healthcare assistant for patients of our medical center. 
            You're speaking with {full_name}. 
            Be friendly and supportive, but remember you're not a doctor and cannot provide medical diagnosis.
            For serious concerns, always recommend the patient to schedule an appointment with a doctor.
            You can help with general medical information, appointment booking procedures, and health tips.
            Keep responses concise, friendly and compassionate."""]}
        ]
    
    async def get_response(self, user, message, session_id=None):
        """Get AI response for user message"""
        try:
            # Get or create chat session
            session = self.get_or_create_chat(user, session_id)
            
            # Save user message to database
            user_message = ChatMessage.objects.create(
                session=session,
                role="user",
                content=message
            )
            
            # Build conversation history
            history = self.build_messages_history(session)
            
            # Add system prompt if this is a new conversation
            if len(history) <= 1:  # Only the message we just added
                system_prompt = self.get_system_prompt(user)
                history = system_prompt + history
            
            # Generate response
            chat = self.model.start_chat(history=history)
            response = chat.send_message(message)
            
            # Save AI response to database
            ai_message = ChatMessage.objects.create(
                session=session,
                role="assistant",
                content=response.text
            )
            
            # Update session title for new conversations
            if not session.title or session.title == "New Conversation":
                # Use first user message as title (truncated)
                title = message[:50] + ("..." if len(message) > 50 else "")
                session.title = title
                session.save()
            
            return {
                "session_id": session.id,
                "message": ai_message.content,
                "timestamp": ai_message.timestamp
            }
            
        except Exception as e:
            logger.error(f"Error getting AI response: {str(e)}")
            raise