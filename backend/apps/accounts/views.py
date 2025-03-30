# apps/accounts/views.py
import logging
import requests
from django.contrib.auth import get_user_model
from rest_framework import generics, status, serializers
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken
from django.middleware.csrf import get_token
from rest_framework.decorators import api_view, permission_classes
from rest_framework.pagination import PageNumberPagination
from django.conf import settings
from rest_framework.permissions import AllowAny, IsAuthenticated
from apps.accounts.serializers import CustomUserSerializer, StaffUserSerializer, AdminUserSerializer, PublicDoctorSerializer
from apps.accounts.models import UserRoles, DoctorProfile
from apps.accounts.utils import set_auth_cookies
from apps.accounts.permissions import IsAdminOrSuperuser, IsOwnerOrAdmin, IsVerified, IsStaff

User = get_user_model()
logger = logging.getLogger(__name__)

class NoPagination(PageNumberPagination):
    page_size = None

class UserListView(generics.ListAPIView):
    permission_classes = [IsAdminOrSuperuser]
    serializer_class = AdminUserSerializer
    queryset = User.objects.all().select_related('doctor_profile').order_by('-date_joined')
    pagination_class = NoPagination

@api_view(["GET"])
@permission_classes([AllowAny])
def get_csrf_token(request):
    """
    Get a CSRF token for cross-site requests.
    This endpoint should be called before making POST/PUT/DELETE requests.
    """
    token = get_token(request)
    response = Response({"message": "CSRF token set.", "csrf": token})
    response.set_cookie(
        "csrftoken", 
        token, 
        max_age=settings.CSRF_COOKIE_AGE,
        domain=settings.CSRF_COOKIE_DOMAIN,
        path=settings.CSRF_COOKIE_PATH,
        secure=settings.CSRF_COOKIE_SECURE,
        httponly=False,  # Must be False to be accessible by JavaScript
        samesite=settings.CSRF_COOKIE_SAMESITE,
    )
    logger.info("CSRF token provided to client")
    return response

@api_view(["GET"])
@permission_classes([AllowAny])
def get_csrf_token(request):
    """
    Get a CSRF token for cross-site requests.
    This endpoint should be called before making POST/PUT/DELETE requests.
    """
    token = get_token(request)
    response = Response({"message": "CSRF token set.", "csrf": token})
    
    # Set the CSRF cookie explicitly
    response.set_cookie(
        "csrftoken", 
        token, 
        max_age=settings.CSRF_COOKIE_AGE,
        domain=settings.CSRF_COOKIE_DOMAIN,
        path=settings.CSRF_COOKIE_PATH,
        secure=settings.CSRF_COOKIE_SECURE, 
        httponly=False,  # Must be False to be accessible by JavaScript
        samesite=settings.CSRF_COOKIE_SAMESITE or 'Lax',
    )
    
    logger.info("CSRF token provided to client")
    return response

@api_view(["POST"])
@permission_classes([AllowAny])
def google_login(request):
    id_token = request.data.get("id_token")
    if not id_token:
        return Response({"error": "ID token is required."}, status=status.HTTP_400_BAD_REQUEST)
    try:
        verify_url = "https://oauth2.googleapis.com/tokeninfo"
        google_resp = requests.get(verify_url, params={"id_token": id_token})
        google_resp.raise_for_status()
        google_data = google_resp.json()
        email = google_data.get("email")
        if not email:
            return Response({"error": "Invalid Google ID token: no email found."}, status=status.HTTP_400_BAD_REQUEST)
        user, created = User.objects.get_or_create(
            email=email,
            defaults={
                "first_name": google_data.get("given_name", ""),
                "last_name": google_data.get("family_name", ""),
                "role": UserRoles.PATIENT,
                "is_verified": True,
            }
        )
        if not created and user.role != UserRoles.PATIENT:
            return Response({"error": "Only patients can use Google login."}, status=status.HTTP_403_FORBIDDEN)
        
        # Generate tokens
        refresh = RefreshToken.for_user(user)
        access_token = refresh.access_token
        
        # Prepare response data
        response_data = {
            "message": "Login successful",
            "role": user.role,
            "email": user.email,
            "first_name": user.first_name or "",
            "last_name": user.last_name or "",
            "profile_photo_url": user.profile_photo.url if user.profile_photo else None,
            "id": user.id,
        }
        
        # Create response and set cookies
        response = Response(response_data, status=status.HTTP_200_OK)
        
        # Set auth cookies with our improved function
        set_auth_cookies(response, access_token, refresh)
        
        # Set CSRF token
        response.set_cookie(
            "csrftoken", 
            get_token(request),
            max_age=settings.CSRF_COOKIE_AGE,
            domain=settings.CSRF_COOKIE_DOMAIN,
            path=settings.CSRF_COOKIE_PATH,
            secure=settings.CSRF_COOKIE_SECURE,
            httponly=False,  # Must be False to be accessible by JavaScript
            samesite=settings.CSRF_COOKIE_SAMESITE or 'Lax',
        )
        
        logger.info(f"Google login successful for: {email}")
        return response
    except requests.exceptions.RequestException as e:
        logger.error(f"Google API request failed: {str(e)}")
        return Response({"error": "Failed to connect to Google."}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
    except Exception as e:
        logger.error(f"Authentication error: {str(e)}")
        return Response({"error": "Authentication failed."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class CustomLoginView(APIView):
    permission_classes = [AllowAny]
    def post(self, request):
        email = request.data.get("email")
        password = request.data.get("password")
        if not email or not password:
            return Response({"error": "Email and password are required."}, status=status.HTTP_400_BAD_REQUEST)
        user = User.objects.filter(email=email).first()
        if user is None or not user.check_password(password):
            logger.warning(f"Login failed for email: {email}")
            return Response({"error": "Invalid email or password."}, status=status.HTTP_401_UNAUTHORIZED)
        if user.role in [UserRoles.DOCTOR, UserRoles.RECEPTIONIST, UserRoles.PHARMACIST] and not user.is_verified:
            return Response(
                {"error": "Your staff account is pending verification.", "status": "unverified"},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Generate tokens
        refresh = RefreshToken.for_user(user)
        access_token = refresh.access_token
        
        # Prepare response data
        response_data = {
            "message": "Login successful",
            "role": user.role,
            "email": user.email,
            "first_name": user.first_name or "",
            "last_name": user.last_name or "",
            "profile_photo_url": user.profile_photo.url if user.profile_photo else None,
            "id": user.id,
        }
        
        # Create response and set cookies
        response = Response(response_data, status=status.HTTP_200_OK)
        
        # Set auth cookies with our improved function
        set_auth_cookies(response, access_token, refresh)
        
        # Set CSRF token
        response.set_cookie(
            "csrftoken", 
            get_token(request),
            max_age=settings.CSRF_COOKIE_AGE,
            domain=settings.CSRF_COOKIE_DOMAIN,
            path=settings.CSRF_COOKIE_PATH,
            secure=settings.CSRF_COOKIE_SECURE,
            httponly=False,  # Must be False to be accessible by JavaScript
            samesite=settings.CSRF_COOKIE_SAMESITE or 'Lax',
        )
        
        logger.info(f"Login successful for: {email}")
        return response

@api_view(["POST"])
@permission_classes([IsAuthenticated, IsVerified])
def custom_logout_view(request):
    try:
        refresh_token = request.COOKIES.get("refresh_token")
        if refresh_token and hasattr(RefreshToken(refresh_token), 'blacklist'):
            try:
                RefreshToken(refresh_token).blacklist()
                logger.info("Refresh token blacklisted during logout")
            except Exception as e:
                logger.error(f"Token blacklist failed: {str(e)}")
        response = Response({"message": "Logged out successfully."}, status=status.HTTP_205_RESET_CONTENT)
        response.delete_cookie("refresh_token", path='/')
        response.delete_cookie("access_token", path='/')
        response.delete_cookie("csrftoken", path='/')
        return response
    except Exception as e:
        logger.error(f"Logout error: {str(e)}")
        return Response({"error": "Logout failed."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class UserProfileView(APIView):
    permission_classes = [IsAuthenticated, IsVerified]
    def get(self, request):
        serializer = CustomUserSerializer(request.user, context={'request': request})
        return Response(serializer.data, status=status.HTTP_200_OK)
    def put(self, request):
        serializer = CustomUserSerializer(
            request.user, data=request.data, partial=True, context={'request': request}
        )
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class CustomRegisterView(generics.CreateAPIView):
    permission_classes = [AllowAny]
    queryset = User.objects.all()
    serializer_class = CustomUserSerializer
    def post(self, request, *args, **kwargs):
        email = request.data.get("email")
        if User.objects.filter(email=email).exists():
            return Response({"error": "User with this email already exists."}, status=status.HTTP_400_BAD_REQUEST)
        data = request.data.copy()
        data["role"] = UserRoles.PATIENT
        data["is_verified"] = True
        serializer = self.serializer_class(data=data)
        if serializer.is_valid():
            user = serializer.save()
            return Response({"message": "Patient registered successfully.", "user": serializer.data}, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class RegisterStaffView(generics.CreateAPIView):
    permission_classes = [IsAdminOrSuperuser]
    queryset = User.objects.all()
    serializer_class = StaffUserSerializer
    def post(self, request, *args, **kwargs):
        email = request.data.get("email")
        if User.objects.filter(email=email).exists():
            return Response({"error": "User with this email already exists."}, status=status.HTTP_400_BAD_REQUEST)
        if "role" not in request.data:
            return Response({"error": "Role is required for staff registration."}, status=status.HTTP_400_BAD_REQUEST)
        data = request.data.copy()
        data["is_verified"] = False
        serializer = self.serializer_class(data=data)
        if serializer.is_valid():
            user = serializer.save()
            return Response({"message": f"Staff member registered as {user.role}.", "user": serializer.data}, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class VerifyStaffView(APIView):
    permission_classes = [IsAdminOrSuperuser]
    def post(self, request):
        staff_id = request.data.get("staff_id")
        try:
            user = User.objects.get(id=staff_id, role__in=[UserRoles.DOCTOR, UserRoles.RECEPTIONIST, UserRoles.PHARMACIST])
            user.is_verified = True
            user.save()
            logger.info(f"Staff verified: {user.email} (Role: {user.role})")
            return Response({"message": "Staff account verified successfully."}, status=status.HTTP_200_OK)
        except User.DoesNotExist:
            logger.warning(f"Staff verification failed: ID {staff_id} not found")
            return Response({"error": "Staff member not found."}, status=status.HTTP_404_NOT_FOUND)

class AdminUserDetailView(generics.RetrieveUpdateAPIView):
    permission_classes = [IsAdminOrSuperuser, IsOwnerOrAdmin]
    queryset = User.objects.all().select_related('doctor_profile')
    serializer_class = AdminUserSerializer
    lookup_field = 'pk'
    def perform_update(self, serializer):
        if 'role' in serializer.validated_data:
            new_role = serializer.validated_data['role']
            current_role = serializer.instance.role
            if new_role == UserRoles.ADMIN and not self.request.user.is_superuser:
                raise serializers.ValidationError({"role": "Only superusers can assign admin role"})
            if new_role != current_role:
                if current_role == UserRoles.DOCTOR:
                    serializer.instance.doctor_profile.delete()
                if new_role == UserRoles.DOCTOR:
                    DoctorProfile.objects.create(user=serializer.instance)
        serializer.save()

class DoctorListView(generics.ListAPIView):
    permission_classes = [AllowAny]
    serializer_class = PublicDoctorSerializer
    def get_queryset(self):
        doctors = User.objects.filter(role=UserRoles.DOCTOR).select_related('doctor_profile').order_by('-date_joined')
        specialty = self.request.query_params.get('specialty')
        if specialty:
            doctors = doctors.filter(doctor_profile__specialty__iexact=specialty)
        return doctors

class SpecialtyListView(APIView):
    permission_classes = [AllowAny]
    def get(self, request):
        specialties = DoctorProfile.objects.values_list('specialty', flat=True).distinct()
        return Response({'specialties': [s for s in specialties if s]})

class DoctorDetailView(generics.RetrieveAPIView):
    permission_classes = [AllowAny]
    serializer_class = PublicDoctorSerializer
    lookup_field = 'pk'
    def get_queryset(self):
        return User.objects.filter(role=UserRoles.DOCTOR)

class CurrentDoctorView(APIView):
    permission_classes = [IsAuthenticated, IsVerified]  # Ensure the user is authenticated and verified
    serializer_class = PublicDoctorSerializer

    def get(self, request):
        user = request.user
        if user.role != UserRoles.DOCTOR:
            return Response(
                {"error": "This endpoint is only for doctors."},
                status=status.HTTP_403_FORBIDDEN
            )
        serializer = self.serializer_class(user, context={'request': request})
        return Response(serializer.data, status=status.HTTP_200_OK)