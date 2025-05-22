from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import status
from agora_token_builder import RtcTokenBuilder, RtmTokenBuilder
from django.conf import settings
from django.utils import timezone
from apps.accounts.models import CustomUser, UserRoles
from apps.appointment.models import Appointment, AppointmentStatus
from django.db.models import Q
from .models import Message
from .serializers import MessageSerializer
import time
import logging
import json

logger = logging.getLogger(__name__)

class GetRTMTokenView(APIView):
    """Generate an Agora RTM token for real-time messaging."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        try:
            app_id = settings.AGORA_APP_ID
            app_certificate = settings.AGORA_APP_CERTIFICATE
            user_account = str(request.user.id)
            privilege_expired_ts = int(time.time()) + 3600
            role = 1
            logger.debug(f"Generating RTM token: appId={app_id}, userAccount={user_account}, role={role}, privilegeExpiredTs={privilege_expired_ts}")
            token = RtmTokenBuilder.buildToken(
                appId=app_id,
                appCertificate=app_certificate,
                userAccount=user_account,
                role=role,
                privilegeExpiredTs=privilege_expired_ts
            )
            return Response({'token': token}, status=status.HTTP_200_OK)
        except Exception as e:
            logger.error(f"Error generating RTM token: {str(e)}", exc_info=True)
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class GetChatPartnersView(APIView):
    """List users with whom the authenticated user has completed appointments."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        if user.role == UserRoles.PATIENT:
            completed_appointments = Appointment.objects.filter(
                patient=user,
                status=AppointmentStatus.COMPLETED
            ).select_related('doctor')
            partners = [appt.doctor for appt in completed_appointments]
        elif user.role == UserRoles.DOCTOR:
            completed_appointments = Appointment.objects.filter(
                doctor=user,
                status=AppointmentStatus.COMPLETED
            ).select_related('patient')
            partners = [appt.patient for appt in completed_appointments]
        else:
            partners = []

        from apps.accounts.serializers import CustomUserSerializer
        serializer = CustomUserSerializer(partners, many=True, context={'request': request})
        return Response(serializer.data, status=status.HTTP_200_OK)

class GetChatChannelView(APIView):
    """Get a unique chat channel name for a user pair with a completed appointment."""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        target_user_id = request.data.get('target_user_id')
        if not target_user_id:
            return Response({'error': 'target_user_id is required'}, status=status.HTTP_400_BAD_REQUEST)
        
        user = request.user
        try:
            target_user = CustomUser.objects.get(id=target_user_id)
        except CustomUser.DoesNotExist:
            return Response({'error': 'Target user not found'}, status=status.HTTP_404_NOT_FOUND)
        
        if not self._has_completed_appointment(user, target_user):
            return Response({'error': 'No completed appointment with this user'}, status=status.HTTP_403_FORBIDDEN)
        
        min_id, max_id = min(user.id, target_user.id), max(user.id, target_user.id)
        channel_name = f'chat_{min_id}_{max_id}'
        return Response({'channel_name': channel_name}, status=status.HTTP_200_OK)

    def _has_completed_appointment(self, user, target_user):
        if user.role == UserRoles.PATIENT and target_user.role == UserRoles.DOCTOR:
            return Appointment.objects.filter(
                patient=user,
                doctor=target_user,
                status=AppointmentStatus.COMPLETED
            ).exists()
        elif user.role == UserRoles.DOCTOR and target_user.role == UserRoles.PATIENT:
            return Appointment.objects.filter(
                doctor=user,
                patient=target_user,
                status=AppointmentStatus.COMPLETED
            ).exists()
        return False

class StartVideoCallView(APIView):
    """Start a video call by generating an Agora RTC token and channel name."""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        target_user_id = request.data.get('target_user_id')
        if not target_user_id:
            return Response({'error': 'target_user_id is required'}, status=status.HTTP_400_BAD_REQUEST)
        
        user = request.user
        try:
            target_user = CustomUser.objects.get(id=target_user_id)
        except CustomUser.DoesNotExist:
            return Response({'error': 'Target user not found'}, status=status.HTTP_404_NOT_FOUND)
        
        if not self._has_completed_appointment(user, target_user):
            return Response({'error': 'No completed appointment with this user'}, status=status.HTTP_403_FORBIDDEN)
        
        # Generate a simpler channel name without timestamp for better compatibility
        min_id, max_id = min(user.id, target_user.id), max(user.id, target_user.id)
        channel_name = f'video{min_id}{max_id}'
        
        app_id = settings.AGORA_APP_ID
        app_certificate = settings.AGORA_APP_CERTIFICATE
        
        # Log the values being used
        logger.debug(f"AGORA CONFIG - App ID: {app_id[:5]}*** Certificate: {app_certificate[:5]}***")
        
        # Add longer expiration time
        privilege_expired_ts = int(time.time()) + 86400  # 24 hours
        
        try:
            # Generate a token with uid=0 (special value allowing any user to join)
            uid = 0
            
            # Log token generation parameters
            logger.debug(f"Generating RTC token with parameters: appId length={len(app_id)}, "
                         f"appCertificate length={len(app_certificate)}, "
                         f"channelName={channel_name}, uid={uid}, role=1, "
                         f"privilegeExpiredTs={privilege_expired_ts}")
            
            token = RtcTokenBuilder.buildTokenWithUid(
                appId=app_id,
                appCertificate=app_certificate,
                channelName=channel_name,
                uid=uid,  # Use 0 which allows any uid to join with this token
                role=1,  # Publisher role
                privilegeExpiredTs=privilege_expired_ts
            )
            
            # Log token details for debugging
            token_preview = token[:10] + "..." + token[-5:] if len(token) > 15 else token
            logger.debug(f"Token generated successfully: {token_preview} (length: {len(token)})")
            
            # Create response
            response_data = {
                'token': token, 
                'channel_name': channel_name,
                'app_id': app_id,
                'uid': uid,
                'expires_at': privilege_expired_ts
            }
            
            # Log the full response for debugging
            logger.debug(f"Response data: {json.dumps(response_data, default=str)}")
            
            return Response(response_data, status=status.HTTP_200_OK)
        except Exception as e:
            logger.error(f"Error generating RTC token: {str(e)}", exc_info=True)
            return Response({
                'error': str(e),
                'app_id_length': len(app_id) if app_id else 0,
                'cert_length': len(app_certificate) if app_certificate else 0
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def _has_completed_appointment(self, user, target_user):
        if user.role == UserRoles.PATIENT and target_user.role == UserRoles.DOCTOR:
            return Appointment.objects.filter(
                patient=user,
                doctor=target_user,
                status=AppointmentStatus.COMPLETED
            ).exists()
        elif user.role == UserRoles.DOCTOR and target_user.role == UserRoles.PATIENT:
            return Appointment.objects.filter(
                doctor=user,
                patient=target_user,
                status=AppointmentStatus.COMPLETED
            ).exists()
        return False

class GetMessagesView(APIView):
    """Retrieve chat history between the authenticated user and a target user."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        target_user_id = request.query_params.get('target_user_id')
        if not target_user_id:
            return Response({'error': 'target_user_id is required'}, status=status.HTTP_400_BAD_REQUEST)
        
        user = request.user
        try:
            target_user = CustomUser.objects.get(id=target_user_id)
        except CustomUser.DoesNotExist:
            return Response({'error': 'Target user not found'}, status=status.HTTP_404_NOT_FOUND)
        
        if not self._has_completed_appointment(user, target_user):
            return Response({'error': 'No completed appointment with this user'}, status=status.HTTP_403_FORBIDDEN)
        
        messages = Message.objects.filter(
            (Q(sender=user) & Q(recipient=target_user)) | (Q(sender=target_user) & Q(recipient=user))
        ).order_by('timestamp')
        
        # Add request to the serializer context to properly resolve profile_photo_url
        serializer = MessageSerializer(messages, many=True, context={'request': request})
        return Response(serializer.data, status=status.HTTP_200_OK)

    def _has_completed_appointment(self, user, target_user):
        if user.role == UserRoles.PATIENT and target_user.role == UserRoles.DOCTOR:
            return Appointment.objects.filter(
                patient=user,
                doctor=target_user,
                status=AppointmentStatus.COMPLETED
            ).exists()
        elif user.role == UserRoles.DOCTOR and target_user.role == UserRoles.PATIENT:
            return Appointment.objects.filter(
                doctor=user,
                patient=target_user,
                status=AppointmentStatus.COMPLETED
            ).exists()
        return False

class SendMessageView(APIView):
    """Send a chat message to a target user and store it in the database."""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        recipient_id = request.data.get('recipient_id')
        content = request.data.get('content')
        if not recipient_id or not content:
            return Response({'error': 'recipient_id and content are required'}, status=status.HTTP_400_BAD_REQUEST)
        
        user = request.user
        try:
            recipient = CustomUser.objects.get(id=recipient_id)
        except CustomUser.DoesNotExist:
            return Response({'error': 'Recipient not found'}, status=status.HTTP_404_NOT_FOUND)
        
        if not self._has_completed_appointment(user, recipient):
            return Response({'error': 'No completed appointment with this user'}, status=status.HTTP_403_FORBIDDEN)
        
        message = Message.objects.create(sender=user, recipient=recipient, content=content)
        serializer = MessageSerializer(message, context={'request': request})
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    def _has_completed_appointment(self, user, recipient):
        if user.role == UserRoles.PATIENT and recipient.role == UserRoles.DOCTOR:
            return Appointment.objects.filter(
                patient=user,
                doctor=recipient,
                status=AppointmentStatus.COMPLETED
            ).exists()
        elif user.role == UserRoles.DOCTOR and recipient.role == UserRoles.PATIENT:
            return Appointment.objects.filter(
                doctor=user,
                patient=recipient,
                status=AppointmentStatus.COMPLETED
            ).exists()
        return False