from rest_framework import generics, status, viewsets, serializers
from rest_framework.response import Response
from rest_framework.decorators import api_view, permission_classes, action
from rest_framework.permissions import IsAuthenticated
from django.db.models import Count, Q
from django.utils import timezone
from django.contrib.auth import get_user_model
from .models import Appointment, TimeOff, AvailableTimeSlot, AppointmentStatus
from .models import APPOINTMENT_DURATION_MINUTES, CANCELLATION_WINDOW_HOURS
from .serializers import (
    AppointmentSerializer, TimeOffSerializer, AvailableTimeSlotSerializer,
    AppointmentUpdateSerializer, DoctorAppointmentUpdateSerializer,
    AvailableTimeSlotListSerializer, TimeOffApprovalSerializer,
    WeeklyScheduleSerializer
)
from apps.accounts.models import UserRoles
from apps.accounts.permissions import IsAdminOrSuperuser, IsVerified, IsStaff
from datetime import datetime, timedelta, date, time
import logging

User = get_user_model()
logger = logging.getLogger(__name__)

# === Custom Permissions ===

class IsDoctor(IsAuthenticated):
    def has_permission(self, request, view):
        return (
            super().has_permission(request, view) and 
            request.user.role == UserRoles.DOCTOR
        )

class IsPatient(IsAuthenticated):
    def has_permission(self, request, view):
        return (
            super().has_permission(request, view) and 
            request.user.role == UserRoles.PATIENT
        )

class IsReceptionist(IsAuthenticated):
    def has_permission(self, request, view):
        return (
            super().has_permission(request, view) and 
            request.user.role == UserRoles.RECEPTIONIST
        )

class IsDoctorOrAdminOrReceptionist(IsAuthenticated):
    def has_permission(self, request, view):
        return (
            super().has_permission(request, view) and 
            request.user.role in [UserRoles.DOCTOR, UserRoles.ADMIN, UserRoles.RECEPTIONIST]
        )

# === Admin Views ===

class AdminAppointmentListView(generics.ListAPIView):
    """Admin view to list all appointments with filtering options"""
    permission_classes = [IsAuthenticated, IsVerified, IsAdminOrSuperuser]
    serializer_class = AppointmentSerializer
    
    def get_queryset(self):
        queryset = Appointment.objects.all().select_related('doctor', 'patient')
        return self._apply_filters(queryset)
    
    def _apply_filters(self, queryset):
        """Apply filters from query parameters"""
        doctor_id = self.request.query_params.get('doctor_id')
        if doctor_id:
            queryset = queryset.filter(doctor_id=doctor_id)
        
        status = self.request.query_params.get('status')
        if status:
            queryset = queryset.filter(status=status)
        
        date_from = self.request.query_params.get('date_from')
        if date_from:
            try:
                date_from = datetime.strptime(date_from, '%Y-%m-%d')
                date_from = timezone.make_aware(date_from)
                queryset = queryset.filter(appointment_time__gte=date_from)
            except ValueError:
                pass
        
        date_to = self.request.query_params.get('date_to')
        if date_to:
            try:
                date_to = datetime.strptime(date_to, '%Y-%m-%d')
                date_to = timezone.make_aware(date_to).replace(hour=23, minute=59, second=59)
                queryset = queryset.filter(appointment_time__lte=date_to)
            except ValueError:
                pass
        
        return queryset.order_by('-appointment_time')

class AdminDoctorAppointmentStatsView(generics.ListAPIView):
    """Admin view to get appointment stats by doctor"""
    permission_classes = [IsAuthenticated, IsVerified, IsAdminOrSuperuser]
    
    def list(self, request, *args, **kwargs):
        date_from, date_to = self._get_date_range(request)
        if isinstance(date_from, Response):  # Error occurred
            return date_from
        
        doctors = User.objects.filter(role=UserRoles.DOCTOR).prefetch_related('doctor_appointments')
        stats = self._compute_doctor_stats(doctors, date_from, date_to)
        
        return Response(stats)
    
    def _get_date_range(self, request):
        """Get and validate date range from request"""
        date_from = request.query_params.get('date_from')
        date_to = request.query_params.get('date_to')
        
        try:
            if date_from:
                date_from = datetime.strptime(date_from, '%Y-%m-%d')
                date_from = timezone.make_aware(date_from)
            else:
                # Set a very early date as default to include all past appointments
                date_from = timezone.make_aware(datetime(2000, 1, 1))
            
            if date_to:
                date_to = datetime.strptime(date_to, '%Y-%m-%d')
                date_to = timezone.make_aware(date_to).replace(hour=23, minute=59, second=59)
            else:
                # Set a far future date as default to include all future appointments
                date_to = timezone.make_aware(datetime(2050, 12, 31, 23, 59, 59))
        except ValueError:
            return Response({
                "error": "Invalid date format. Use YYYY-MM-DD."
            }, status=status.HTTP_400_BAD_REQUEST), None
        
        return date_from, date_to
    
    def _compute_doctor_stats(self, doctors, date_from, date_to):
        """Compute appointment statistics for each doctor"""
        stats = []
        for doctor in doctors:
            # Get appointments within date range if specified
            appointments = doctor.doctor_appointments.filter(
                appointment_time__gte=date_from,
                appointment_time__lte=date_to
            )
            
            total = appointments.count()
            pending = appointments.filter(status=AppointmentStatus.PENDING).count()
            confirmed = appointments.filter(status=AppointmentStatus.CONFIRMED).count()
            completed = appointments.filter(status=AppointmentStatus.COMPLETED).count()
            cancelled = appointments.filter(status=AppointmentStatus.CANCELLED).count()
            missed = appointments.filter(status=AppointmentStatus.MISSED).count()
            
            stats.append({
                'doctor_id': doctor.id,
                'doctor_name': f"Dr. {doctor.first_name} {doctor.last_name}",
                'email': doctor.email,
                'specialty': getattr(doctor.doctor_profile, 'specialty', 'N/A'),
                'total_appointments': total,
                'pending': pending,
                'confirmed': confirmed,
                'completed': completed,
                'cancelled': cancelled,
                'missed': missed
            })
        
        stats.sort(key=lambda x: x['total_appointments'], reverse=True)
        return stats
# === Time Off Management ===

# === Time Off Management ===

class TimeOffViewSet(viewsets.ModelViewSet):
    """ViewSet for managing doctor time-off periods"""
    serializer_class = TimeOffSerializer
    permission_classes = [IsAuthenticated, IsVerified]
    
    def get_queryset(self):
        user = self.request.user
        
        if user.role == UserRoles.ADMIN:
            queryset = TimeOff.objects.all().select_related('doctor')
            doctor_id = self.request.query_params.get('doctor_id')
            if doctor_id:
                queryset = queryset.filter(doctor_id=doctor_id)
            return queryset
        
        elif user.role == UserRoles.DOCTOR:
            return TimeOff.objects.filter(doctor=user)
        
        elif user.role == UserRoles.RECEPTIONIST:
            queryset = TimeOff.objects.all().select_related('doctor')
            doctor_id = self.request.query_params.get('doctor_id')
            if doctor_id:
                queryset = queryset.filter(doctor_id=doctor_id)
            return queryset
        
        return TimeOff.objects.none()
    
    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsAuthenticated(), IsVerified(), IsDoctorOrAdminOrReceptionist()]
        elif self.action in ['approve', 'pending_approvals']:
            return [IsAuthenticated(), IsVerified(), IsAdminOrSuperuser()]
        return super().get_permissions()
    
    def create(self, request, *args, **kwargs):
        """
        Override create to handle doctor assignment before validation.
        """
        data = request.data.copy()
        serializer = self.get_serializer(data=data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)
    
    def perform_create(self, serializer):
        user = self.request.user
        
        if user.role == UserRoles.DOCTOR:
            # If the user is a doctor, always set them as the doctor
            serializer.save(doctor=user)
        else:
            # For admin/receptionist, doctor field is required
            if 'doctor' not in serializer.validated_data:
                raise serializers.ValidationError({"doctor": ["This field is required for admin and receptionist users."]})
            serializer.save()
    
    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        """Admin action to approve a time off request"""
        time_off = self.get_object()
        
        # Update the is_approved flag
        time_off.is_approved = True
        time_off.save()
        
        serializer = TimeOffApprovalSerializer(time_off)
        return Response(serializer.data, status=status.HTTP_200_OK)
    
    @action(detail=False, methods=['get'])
    def pending_approvals(self, request):
        """Get list of time off requests pending approval"""
        pending = TimeOff.objects.filter(is_approved=False).select_related('doctor')
        serializer = self.get_serializer(pending, many=True)
        return Response(serializer.data)

# === Available Time Slots ===

class AvailableTimeSlotViewSet(viewsets.ModelViewSet):
    """ViewSet for managing doctor available time slots"""
    serializer_class = AvailableTimeSlotSerializer
    permission_classes = [IsAuthenticated, IsVerified]
    
    def get_queryset(self):
        user = self.request.user
        queryset = AvailableTimeSlot.objects.all().select_related('doctor')
        
        doctor_id = self.request.query_params.get('doctor_id')
        if doctor_id:
            queryset = queryset.filter(doctor_id=doctor_id)
        
        if user.role == UserRoles.DOCTOR:
            return queryset.filter(doctor=user)
        elif user.role in [UserRoles.ADMIN, UserRoles.RECEPTIONIST, UserRoles.PATIENT]:
            return queryset
        return AvailableTimeSlot.objects.none()
    
    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsAuthenticated(), IsVerified(), IsDoctorOrAdminOrReceptionist()]
        return super().get_permissions()
    
    def perform_create(self, serializer):
        user = self.request.user
        if user.role == UserRoles.DOCTOR:
            serializer.save(doctor=user)
        else:
            serializer.save()
    
    @action(detail=False, methods=['post'], permission_classes=[IsAuthenticated, IsVerified, IsDoctorOrAdminOrReceptionist])
    def set_weekly_schedule(self, request):
        """Set a doctor's entire weekly schedule at once"""
        serializer = WeeklyScheduleSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        slots = serializer.save()
        result_serializer = AvailableTimeSlotSerializer(slots, many=True)
        return Response(result_serializer.data, status=status.HTTP_201_CREATED)

class CreateAvailableSlotView(generics.GenericAPIView):
    """Simple API to create an available time slot for a doctor"""
    permission_classes = [IsAuthenticated, IsVerified, IsDoctorOrAdminOrReceptionist]
    
    class InputSerializer(serializers.Serializer):
        doctor_id = serializers.IntegerField(required=False, help_text="Required for admin/receptionist")
        day_of_week = serializers.IntegerField(min_value=0, max_value=6, 
                                              help_text="0=Monday, 1=Tuesday, ..., 6=Sunday")
        start_time = serializers.TimeField(help_text="Format: HH:MM:SS")
        end_time = serializers.TimeField(help_text="Format: HH:MM:SS")
        
        def validate(self, data):
            if self.context['request'].user.role != 'DOCTOR' and 'doctor_id' not in data:
                raise serializers.ValidationError({"doctor_id": "This field is required for admin or receptionist"})
            if data['start_time'] >= data['end_time']:
                raise serializers.ValidationError("End time must be after start time")
            return data
    
    def post(self, request, *args, **kwargs):
        try:
            serializer = self.InputSerializer(data=request.data, context={'request': request})
            serializer.is_valid(raise_exception=True)
            
            if request.user.role == 'DOCTOR':
                doctor = request.user
            else:
                try:
                    doctor = User.objects.get(id=serializer.validated_data['doctor_id'], role='DOCTOR')
                except User.DoesNotExist:
                    return Response(
                        {"error": f"Doctor with ID {serializer.validated_data['doctor_id']} not found"}, 
                        status=status.HTTP_404_NOT_FOUND
                    )
            
            day_of_week = serializer.validated_data['day_of_week']
            start_time = serializer.validated_data['start_time']
            end_time = serializer.validated_data['end_time']
            
            overlapping = AvailableTimeSlot.objects.filter(
                doctor=doctor,
                day_of_week=day_of_week,
                start_time__lt=end_time,
                end_time__gt=start_time
            )
            
            if overlapping.exists():
                overlap = overlapping.first()
                return Response(
                    {"error": f"This time slot overlaps with an existing one: {overlap.start_time}-{overlap.end_time}"}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            slot = AvailableTimeSlot.objects.create(
                doctor=doctor,
                day_of_week=day_of_week,
                start_time=start_time,
                end_time=end_time
            )
            
            all_slots = AvailableTimeSlot.objects.filter(
                doctor=doctor,
                day_of_week=day_of_week
            ).order_by('start_time')
            
            day_names = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
            day_name = day_names[day_of_week]
            
            today = timezone.now().date()
            days_ahead = (day_of_week - today.weekday()) % 7
            if days_ahead == 0:
                days_ahead = 7
            next_occurrence = today + timedelta(days=days_ahead)
            
            sample_slots = []
            for slot in all_slots:
                start_datetime = datetime.combine(next_occurrence, slot.start_time)
                start_datetime = timezone.make_aware(start_datetime)
                end_datetime = datetime.combine(next_occurrence, slot.end_time)
                end_datetime = timezone.make_aware(end_datetime)
                
                current = start_datetime
                while current + timedelta(minutes=APPOINTMENT_DURATION_MINUTES) <= end_datetime:
                    sample_slots.append({
                        'start': current.strftime('%H:%M'),
                        'end': (current + timedelta(minutes=APPOINTMENT_DURATION_MINUTES)).strftime('%H:%M')
                    })
                    current += timedelta(minutes=APPOINTMENT_DURATION_MINUTES)
            
            return Response({
                "success": True,
                "message": f"Time slot created successfully for {day_name}",
                "slot": {
                    "id": slot.id,
                    "doctor_id": doctor.id,
                    "doctor_name": f"Dr. {doctor.first_name} {doctor.last_name}",
                    "day_of_week": slot.day_of_week,
                    "day_name": day_name,
                    "start_time": slot.start_time.strftime('%H:%M:%S'),
                    "end_time": slot.end_time.strftime('%H:%M:%S')
                },
                "all_slots_for_day": [
                    {
                        "id": s.id,
                        "start_time": s.start_time.strftime('%H:%M:%S'),
                        "end_time": s.end_time.strftime('%H:%M:%S')
                    } for s in all_slots
                ],
                "sample_appointment_slots": sample_slots,
                "next_occurrence": next_occurrence.strftime('%Y-%m-%d')
            }, status=status.HTTP_201_CREATED)
        
        except Exception as e:
            logger.error(f"Error in CreateAvailableSlotView: {str(e)}")
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

class GetAvailableSlotsView(generics.GenericAPIView):
    """API to get available time slots for a doctor on a specific date"""
    serializer_class = AvailableTimeSlotListSerializer
    permission_classes = [IsAuthenticated, IsVerified]
    
    def get(self, request, *args, **kwargs):
        doctor_id = request.query_params.get('doctor_id')
        date_str = request.query_params.get('date')
        
        if not doctor_id:
            return Response({"error": "doctor_id is required"}, status=status.HTTP_400_BAD_REQUEST)
        
        if not date_str:
            target_date = timezone.now().date()
        else:
            try:
                target_date = datetime.strptime(date_str, '%Y-%m-%d').date()
            except ValueError:
                return Response({"error": "Invalid date format. Use YYYY-MM-DD"}, 
                                status=status.HTTP_400_BAD_REQUEST)
        
        try:
            doctor = User.objects.get(id=doctor_id, role='DOCTOR')
        except User.DoesNotExist:
            return Response({"error": f"Doctor with ID {doctor_id} not found"}, 
                            status=status.HTTP_404_NOT_FOUND)
        
        available_slots = self._get_available_time_slots(doctor, target_date)
        
        day_of_week = target_date.weekday()
        day_names = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
        day_name = day_names[day_of_week]
        
        has_slots = AvailableTimeSlot.objects.filter(
            doctor=doctor,
            day_of_week=day_of_week
        ).exists()
        
        response_data = {
            "doctor_id": doctor.id,
            "doctor_name": f"Dr. {doctor.first_name} {doctor.last_name}",
            "date": target_date.strftime('%Y-%m-%d'),
            "day": day_name,
            "slots": available_slots
        }
        
        if not has_slots:
            response_data["message"] = f"Doctor has no available slots defined for {day_name}s"
        
        return Response(response_data)
    
    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        doctor = serializer.validated_data['doctor']
        target_date = serializer.validated_data['date']
        
        available_slots = self._get_available_time_slots(doctor, target_date)
        
        day_of_week = target_date.weekday()
        day_names = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
        day_name = day_names[day_of_week]
        
        has_slots = AvailableTimeSlot.objects.filter(
            doctor=doctor,
            day_of_week=day_of_week
        ).exists()
        
        response_data = {
            "doctor_id": doctor.id,
            "doctor_name": f"Dr. {doctor.first_name} {doctor.last_name}",
            "date": target_date.strftime('%Y-%m-%d'),
            "day": day_name,
            "slots": available_slots
        }
        
        if not has_slots:
            response_data["message"] = f"Doctor has no available slots defined for {day_name}s"
        
        return Response(response_data)
    
    def _get_available_time_slots(self, doctor, target_date):
        """
        Calculate available time slots for a doctor on a specific date,
        taking into account their schedule, existing appointments, and time off.
        """
        try:
            day_of_week = target_date.weekday()
            available_slots = AvailableTimeSlot.objects.filter(
                doctor=doctor,
                day_of_week=day_of_week
            ).order_by('start_time')
            
            if not available_slots.exists():
                logger.info(f"No available slots found for doctor {doctor.id} on day {day_of_week}")
                return []
            
            # Get current time
            now = timezone.now()
            
            # Convert all times to aware datetimes
            available_datetimes = []
            for slot in available_slots:
                # Create datetime objects for the slot's start and end times
                naive_start = datetime.combine(target_date, slot.start_time)
                start_datetime = timezone.make_aware(naive_start)
                
                naive_end = datetime.combine(target_date, slot.end_time)
                end_datetime = timezone.make_aware(naive_end)
                
                # Generate appointment slots within this available time window
                current = start_datetime
                while current + timedelta(minutes=APPOINTMENT_DURATION_MINUTES) <= end_datetime:
                    available_datetimes.append({
                        'start': current,
                        'end': current + timedelta(minutes=APPOINTMENT_DURATION_MINUTES)
                    })
                    current += timedelta(minutes=APPOINTMENT_DURATION_MINUTES)
            
            # Get existing appointments and time offs
            existing_appointments = Appointment.objects.filter(
                doctor=doctor,
                appointment_time__date=target_date,
                status__in=[AppointmentStatus.PENDING, AppointmentStatus.CONFIRMED]
            )
            
            time_offs = TimeOff.objects.filter(
                doctor=doctor,
                is_approved=True,
                start_time__date__lte=target_date,
                end_time__date__gte=target_date
            )
            
            # Filter slots based on conflicts with appointments, time-offs, and past times
            available_slots = []
            for slot in available_datetimes:
                # Skip past slots
                if slot['start'] < now:
                    continue
                
                conflict = False
                
                # Check conflicts with existing appointments
                for appointment in existing_appointments:
                    # Calculate appointment end time if not available directly
                    appt_end_time = getattr(appointment, 'end_time', None)
                    if appt_end_time is None:
                        appt_end_time = appointment.appointment_time + timedelta(minutes=APPOINTMENT_DURATION_MINUTES)
                    
                    if (slot['start'] < appt_end_time and
                        slot['end'] > appointment.appointment_time):
                        conflict = True
                        break
                
                # Check conflicts with time offs
                for time_off in time_offs:
                    if (slot['start'] < time_off.end_time and
                        slot['end'] > time_off.start_time):
                        conflict = True
                        break
                
                if not conflict:
                    available_slots.append({
                        'start': slot['start'].strftime('%Y-%m-%d %H:%M:%S'),
                        'end': slot['end'].strftime('%Y-%m-%d %H:%M:%S')
                    })
            
            return available_slots
        except Exception as e:
            logger.error(f"Error in _get_available_time_slots: {str(e)}")
            return []

# === Appointment Management ===

class AppointmentViewSet(viewsets.ModelViewSet):
    """ViewSet for managing appointments"""
    permission_classes = [IsAuthenticated, IsVerified]
    
    def get_serializer_class(self):
        if self.action in ['update', 'partial_update']:
            if self.request.user.role == UserRoles.DOCTOR:
                return DoctorAppointmentUpdateSerializer
            return AppointmentUpdateSerializer
        return AppointmentSerializer
    
    def get_queryset(self):
        user = self.request.user
        Appointment.update_missed_appointments()
        base_queryset = Appointment.objects.all().select_related('doctor', 'patient', 'created_by')
        
        if user.role == UserRoles.ADMIN:
            queryset = base_queryset
        elif user.role == UserRoles.DOCTOR:
            queryset = base_queryset.filter(doctor=user)
        elif user.role == UserRoles.PATIENT:
            queryset = base_queryset.filter(patient=user)
        elif user.role == UserRoles.RECEPTIONIST:
            queryset = base_queryset
        else:
            queryset = Appointment.objects.none()
        
        return self._apply_filters(queryset)
    
    def _apply_filters(self, queryset):
        """Apply common filtering based on query parameters"""
        status_param = self.request.query_params.get('status')
        if status_param:
            queryset = queryset.filter(status=status_param)
        
        doctor_id = self.request.query_params.get('doctor_id')
        if doctor_id:
            queryset = queryset.filter(doctor_id=doctor_id)
        
        patient_id = self.request.query_params.get('patient_id')
        if patient_id:
            queryset = queryset.filter(patient_id=patient_id)
        
        date_from = self.request.query_params.get('date_from')
        if date_from:
            try:
                date_from = datetime.strptime(date_from, '%Y-%m-%d')
                date_from = timezone.make_aware(date_from)
                queryset = queryset.filter(appointment_time__gte=date_from)
            except ValueError:
                pass
        
        date_to = self.request.query_params.get('date_to')
        if date_to:
            try:
                date_to = datetime.strptime(date_to, '%Y-%m-%d')
                date_to = timezone.make_aware(date_to).replace(hour=23, minute=59, second=59)
                queryset = queryset.filter(appointment_time__lte=date_to)
            except ValueError:
                pass
        
        filter_type = self.request.query_params.get('filter')
        if filter_type == 'upcoming':
            queryset = queryset.filter(appointment_time__gt=timezone.now())
        elif filter_type == 'past':
            queryset = queryset.filter(appointment_time__lte=timezone.now())
        
        return queryset.order_by('-appointment_time')
    
    def perform_create(self, serializer):
        user = self.request.user
        if user.role == UserRoles.PATIENT:
            serializer.save(patient=user, created_by=user)
        else:
            serializer.save(created_by=user)
    
    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated, IsVerified])
    def cancel(self, request, pk=None):
        """Endpoint to cancel an appointment"""
        appointment = self.get_object()
        user = request.user
        if (user.role != UserRoles.ADMIN and 
            user != appointment.patient and 
            user != appointment.doctor and
            user.role != UserRoles.RECEPTIONIST):
            return Response({
                "detail": "You don't have permission to cancel this appointment"
            }, status=status.HTTP_403_FORBIDDEN)
        
        if appointment.cancel():
            serializer = self.get_serializer(appointment)
            return Response(serializer.data)
        else:
            return Response({
                "detail": f"Appointments cannot be cancelled less than {CANCELLATION_WINDOW_HOURS} hours before the scheduled time"
            }, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated, IsVerified, IsDoctor])
    def complete(self, request, pk=None):
        """Endpoint for doctors to mark an appointment as completed"""
        appointment = self.get_object()
        if request.user != appointment.doctor:
            return Response({
                "detail": "You can only complete your own appointments"
            }, status=status.HTTP_403_FORBIDDEN)
        
        if appointment.mark_completed():
            serializer = self.get_serializer(appointment)
            return Response(serializer.data)
        else:
            return Response({
                "detail": "Cannot complete this appointment due to its current status"
            }, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated, IsVerified, IsDoctor])
    def confirm(self, request, pk=None):
        """Endpoint for doctors to confirm a pending appointment"""
        appointment = self.get_object()
        if request.user != appointment.doctor:
            return Response({
                "detail": "You can only confirm your own appointments"
            }, status=status.HTTP_403_FORBIDDEN)
        
        if appointment.mark_confirmed():
            serializer = self.get_serializer(appointment)
            return Response(serializer.data)
        else:
            return Response({
                "detail": "Cannot confirm this appointment due to its current status"
            }, status=status.HTTP_400_BAD_REQUEST)

class PatientAppointmentListView(generics.ListAPIView):
    """API to get a patient's upcoming and past appointments"""
    serializer_class = AppointmentSerializer
    permission_classes = [IsAuthenticated, IsVerified, IsPatient]
    
    def get_queryset(self):
        user = self.request.user
        filter_type = self.request.query_params.get('filter', 'upcoming')
        Appointment.update_missed_appointments()
        queryset = Appointment.objects.filter(patient=user).select_related('doctor')
        
        if filter_type == 'upcoming':
            return queryset.filter(
                appointment_time__gt=timezone.now()
            ).order_by('appointment_time')
        else:
            return queryset.filter(
                appointment_time__lte=timezone.now()
            ).order_by('-appointment_time')

class DoctorAppointmentListView(generics.ListAPIView):
    """API to get a doctor's upcoming and past appointments"""
    serializer_class = AppointmentSerializer
    permission_classes = [IsAuthenticated, IsVerified, IsDoctor]
    
    def get_queryset(self):
        user = self.request.user
        filter_type = self.request.query_params.get('filter', 'upcoming')
        Appointment.update_missed_appointments(doctor=user)
        queryset = Appointment.objects.filter(doctor=user).select_related('patient')
        
        status_param = self.request.query_params.get('status')
        if status_param:
            queryset = queryset.filter(status=status_param)
        
        if filter_type == 'upcoming':
            return queryset.filter(
                appointment_time__gt=timezone.now()
            ).order_by('appointment_time')
        else:
            return queryset.filter(
                appointment_time__lte=timezone.now()
            ).order_by('-appointment_time')

class PatientAppointmentHistoryView(generics.ListAPIView):
    """API to get appointment history for a specific patient (for doctors)"""
    serializer_class = AppointmentSerializer
    permission_classes = [IsAuthenticated, IsVerified, IsDoctor]
    
    def get_queryset(self):
        patient_id = self.kwargs.get('patient_id')
        return Appointment.objects.filter(
            doctor=self.request.user,
            patient_id=patient_id
        ).order_by('-appointment_time')