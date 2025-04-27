import logging
from rest_framework import status, generics
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from django.http import Http404
from django.utils import timezone
from django.conf import settings
import random

from .models import ChatSession, ChatMessage
from .serializers import ChatSessionSerializer, ChatMessageSerializer, ChatInputSerializer
from .utils import get_gemini_response
from apps.accounts.permissions import IsVerified
from apps.accounts.models import UserRoles

logger = logging.getLogger(__name__)

class PatientOnlyPermission(IsAuthenticated):
    """Custom permission to only allow patients to access the chatbot"""
    
    def has_permission(self, request, view):
        is_authenticated = super().has_permission(request, view)
        if not is_authenticated:
            return False
        return request.user.role == UserRoles.PATIENT


@api_view(["GET"])
@permission_classes([AllowAny])
def test_chatbot_connection(request):
    """
    A simple test endpoint to verify the chatbot app is working
    """
    return Response({
        "status": "success",
        "message": "Chatbot API is connected properly!",
        "test_time": timezone.now().isoformat()
    })


class ChatSessionListView(generics.ListCreateAPIView):
    """View to list all chat sessions for a user and create new ones"""
    serializer_class = ChatSessionSerializer
    permission_classes = [IsAuthenticated, IsVerified, PatientOnlyPermission]
    
    def get_queryset(self):
        """Return only the user's chat sessions"""
        return ChatSession.objects.filter(user=self.request.user).order_by('-updated_at')
    
    def perform_create(self, serializer):
        """Save the current user with the chat session"""
        serializer.save(user=self.request.user)


class ChatSessionDetailView(generics.RetrieveDestroyAPIView):
    """View to retrieve or delete a specific chat session"""
    serializer_class = ChatSessionSerializer
    permission_classes = [IsAuthenticated, IsVerified, PatientOnlyPermission]
    
    def get_queryset(self):
        """Return only the user's chat sessions"""
        return ChatSession.objects.filter(user=self.request.user)


class ChatMessageView(APIView):
    """View to send messages to the AI and get responses"""
    permission_classes = [IsAuthenticated, IsVerified, PatientOnlyPermission]
    
    def post(self, request):
        """Send a message to the AI and get a response"""
        serializer = ChatInputSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        user_message = serializer.validated_data['message']
        session_id = serializer.validated_data.get('session_id')
        
        try:
            # Get or create chat session
            if session_id:
                try:
                    session = ChatSession.objects.get(id=session_id, user=request.user)
                except ChatSession.DoesNotExist:
                    logger.warning(f"Session {session_id} not found for user {request.user.id}")
                    session = ChatSession.objects.create(
                        user=request.user,
                        title="New Conversation"
                    )
            else:
                session = ChatSession.objects.create(
                    user=request.user,
                    title="New Conversation"
                )
            
            # Save user message to database
            ChatMessage.objects.create(
                session=session,
                role="user",
                content=user_message
            )
            
            # Check if we should use mock mode
            MOCK_MODE = getattr(settings, 'MOCK_CHATBOT', False)
            
            if MOCK_MODE:
                # Use mock responses
                mock_responses = [
                    "I understand you're asking about that. While I can provide general information, for specific medical advice, I'd recommend scheduling an appointment with one of our doctors.",
                    "Thanks for your message. As your healthcare assistant, I can help answer general questions, but for personalized care, our medical team would be happy to assist you during an appointment.",
                    "I appreciate your question. For general health information, I can certainly help. For your specific situation, our doctors would be best equipped to provide proper guidance during a consultation.",
                    "Thank you for reaching out. I can provide general healthcare information, but for your specific concerns, I'd recommend scheduling an appointment with one of our specialists.",
                    "I'm here to assist with general healthcare questions. For your specific needs, our medical team would be happy to see you for an appointment to provide personalized care."
                ]
                
                response_text = random.choice(mock_responses)
            else:
                # Get conversation history for context
                # Get more messages for better context (up to 20)
                session_history = []
                if session.messages.count() > 1:  # More than just the message we just added
                    previous_messages = session.messages.order_by('timestamp')
                    
                    # Get up to the last 19 messages plus the one just added (20 total)
                    # This provides more context for follow-up questions
                    for msg in previous_messages:
                        if len(session_history) >= 20:
                            break
                        session_history.append({
                            'role': msg.role,
                            'content': msg.content
                        })
                
                # Get AI response with conversation history
                response_text = get_gemini_response(
                    user_message=user_message,
                    user=request.user,
                    session_history=session_history
                )
            
            # Save AI response to database
            ai_message = ChatMessage.objects.create(
                session=session,
                role="assistant",
                content=response_text
            )
            
            # Update session title for new conversations
            if not session.title or session.title == "New Conversation":
                # Use first user message as title (truncated)
                title = user_message[:50] + ("..." if len(user_message) > 50 else "")
                session.title = title
                session.save()
            
            # Always update session timestamp to mark as recently used
            session.updated_at = timezone.now()
            session.save(update_fields=['updated_at'])
            
            return Response({
                "session_id": session.id,
                "message": ai_message.content,
                "timestamp": ai_message.timestamp
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"Error in chat processing: {str(e)}")
            return Response(
                {"error": "Failed to process your message. Please try again."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )