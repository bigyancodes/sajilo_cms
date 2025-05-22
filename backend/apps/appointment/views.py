from rest_framework import generics, status, viewsets, serializers
from rest_framework.response import Response
from rest_framework.decorators import api_view, permission_classes, action
from rest_framework.permissions import IsAuthenticated
from django.db.models import Count, Q
from django.utils import timezone
from django.contrib.auth import get_user_model
from django.http import HttpResponse
from django.views.decorators.csrf import csrf_exempt
from django.conf import settings
import stripe
from .models import Appointment, TimeOff, AvailableTimeSlot, AppointmentStatus, PaymentStatus, PaymentMethod, AppointmentPricing, Bill
from .models import APPOINTMENT_DURATION_MINUTES, CANCELLATION_WINDOW_HOURS
from .serializers import (
    AppointmentSerializer, TimeOffSerializer, AvailableTimeSlotSerializer,
    AppointmentUpdateSerializer, DoctorAppointmentUpdateSerializer,
    AvailableTimeSlotListSerializer, TimeOffApprovalSerializer,
    WeeklyScheduleSerializer, AppointmentPricingSerializer, BillSerializer
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
        payment_method = serializer.validated_data.pop('payment_method', PaymentMethod.LATER) if 'payment_method' in serializer.validated_data else PaymentMethod.LATER
        
        if user.role == UserRoles.PATIENT:
            appointment = serializer.save(patient=user, created_by=user)
        else:
            appointment = serializer.save(created_by=user)
        
        # Try to find price for the doctor
        try:
            pricing = AppointmentPricing.objects.get(doctor=appointment.doctor, is_active=True)
            
            # Create bill
            Bill.objects.create(
                appointment=appointment,
                amount=pricing.price,
                payment_method=payment_method,
                status=PaymentStatus.PENDING
            )
        except AppointmentPricing.DoesNotExist:
            logger.warning(f"No pricing set for doctor {appointment.doctor.id}")
            
        return appointment
    
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
        """Get available slots for a specific date"""
        doctor_id = request.query_params.get('doctor_id')
        date_str = request.query_params.get('date')
        
        if not doctor_id or not date_str:
            return Response(
                {"error": "doctor_id and date are required"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            doctor = User.objects.get(id=doctor_id, role=UserRoles.DOCTOR)
            target_date = datetime.strptime(date_str, '%Y-%m-%d').date()
            
            # Convert the date to a timezone-aware datetime at the start of the day
            target_datetime = timezone.make_aware(
                datetime.combine(target_date, time.min),
                timezone.get_current_timezone()
            )
            
            available_slots = self._get_available_time_slots(doctor, target_datetime)
            
            return Response({
                "slots": available_slots,
                "message": f"Available slots for {target_date.strftime('%B %d, %Y')}"
            })
            
        except User.DoesNotExist:
            return Response(
                {"error": "Doctor not found"},
                status=status.HTTP_404_NOT_FOUND
            )
        except ValueError:
            return Response(
                {"error": "Invalid date format. Use YYYY-MM-DD"},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    def _get_available_time_slots(self, doctor, target_datetime):
        """Get available time slots for a doctor on a specific date"""
        # Get the day of week (0=Monday, 6=Sunday)
        day_of_week = target_datetime.weekday()
        specific_date = target_datetime.date()
        
        # Get doctor's regular schedule for this day
        regular_slots = AvailableTimeSlot.objects.filter(
            doctor=doctor,
            day_of_week=day_of_week
        )
        
        # Get any one-time slots for this specific date
        try:
            one_time_slots = AvailableTimeSlot.objects.filter(
                doctor=doctor,
                specific_date=specific_date,
                is_recurring=False
            )
        except:
            one_time_slots = []
        
        # Combine regular and one-time slots
        all_slots = list(regular_slots) + list(one_time_slots)
        
        if not all_slots:
            return []
        
        # Get existing appointments for this date - use date range to ensure timezone safety
        day_start = timezone.make_aware(datetime.combine(specific_date, time.min))
        day_end = timezone.make_aware(datetime.combine(specific_date, time.max))
        
        appointments = Appointment.objects.filter(
            doctor=doctor,
            appointment_time__gte=day_start,
            appointment_time__lte=day_end,
            status__in=[AppointmentStatus.PENDING, AppointmentStatus.CONFIRMED]
        )
        
        # Get approved time off periods
        time_off = TimeOff.objects.filter(
            doctor=doctor,
            start_time__date__lte=specific_date,
            end_time__date__gte=specific_date,
            is_approved=True
        )
        
        # Current timezone
        current_tz = timezone.get_current_timezone()
        
        available_slots = []
        
        for slot in all_slots:
            # Convert slot times to timezone-aware datetimes
            slot_start = timezone.make_aware(
                datetime.combine(specific_date, slot.start_time),
                current_tz
            )
            slot_end = timezone.make_aware(
                datetime.combine(specific_date, slot.end_time),
                current_tz
            )
            
            # Check if slot is within time off period
            is_time_off = any(
                off.start_time <= slot_start and off.end_time >= slot_end
                for off in time_off
            )
            
            if is_time_off:
                continue
            
            # Generate appointment slots within the available time
            current_time = slot_start
            while current_time + timedelta(minutes=APPOINTMENT_DURATION_MINUTES) <= slot_end:
                slot_end_time = current_time + timedelta(minutes=APPOINTMENT_DURATION_MINUTES)
                
                # Check if this slot overlaps with any existing appointments
                is_available = not any(
                    (app.appointment_time <= current_time and app.end_time > current_time) or
                    (app.appointment_time < slot_end_time and app.end_time >= slot_end_time) or
                    (current_time <= app.appointment_time and slot_end_time >= app.end_time)
                    for app in appointments
                )
                
                if is_available:
                    # Ensure times are in the current timezone for consistent display
                    available_slots.append({
                        'start': current_time.isoformat(),
                        'end': slot_end_time.isoformat()
                    })
                
                current_time = slot_end_time
        
        return available_slots

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
        payment_method = serializer.validated_data.pop('payment_method', PaymentMethod.LATER) if 'payment_method' in serializer.validated_data else PaymentMethod.LATER
        
        # Note: timezone conversion is now handled in the serializer's validate method
        
        if user.role == UserRoles.PATIENT:
            appointment = serializer.save(patient=user, created_by=user)
        else:
            appointment = serializer.save(created_by=user)
        
        logger.info(f"Appointment created with ID: {appointment.id}, payment method: {payment_method}")
        
        # Try to find price for the doctor
        try:
            pricing = AppointmentPricing.objects.get(doctor=appointment.doctor, is_active=True)
            logger.info(f"Found pricing for doctor {appointment.doctor.id}: {pricing.price}")
            
            # Create bill
            bill = Bill.objects.create(
                appointment=appointment,
                amount=pricing.price,
                payment_method=payment_method,
                status=PaymentStatus.PENDING
            )
            logger.info(f"Bill created with ID: {bill.id} for appointment {appointment.id}")
        except AppointmentPricing.DoesNotExist:
            logger.warning(f"No pricing set for doctor {appointment.doctor.id}, using default price")
            # Create bill with default price
            bill = Bill.objects.create(
                appointment=appointment,
                amount=1000,  # Default price in NPR
                payment_method=payment_method,
                status=PaymentStatus.PENDING
            )
            logger.info(f"Bill created with default price, ID: {bill.id} for appointment {appointment.id}")
        except Exception as e:
            logger.error(f"Error creating bill for appointment {appointment.id}: {str(e)}")
            raise serializers.ValidationError({"bill_error": f"Failed to create bill: {str(e)}"})
        
        # If payment method is STRIPE, ensure bill was created
        if payment_method == PaymentMethod.STRIPE:
            # Verify bill exists
            bill = Bill.objects.filter(appointment=appointment).first()
            if not bill:
                logger.error(f"No bill found for appointment {appointment.id} with STRIPE payment method")
                raise serializers.ValidationError({"payment_error": "Failed to create bill for online payment"})
            logger.info(f"Verified bill exists for STRIPE payment, bill ID: {bill.id}")
    
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
    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated, IsVerified, IsDoctorOrAdminOrReceptionist])
    def confirm(self, request, pk=None):
        """Endpoint for doctors or receptionists to confirm a pending appointment"""
        appointment = self.get_object()
        # Allow doctors to confirm their own appointments or receptionists to confirm any appointment
        if request.user.role == UserRoles.DOCTOR and request.user != appointment.doctor:
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
        
        if filter_type == 'today':
            # Get today's appointments (from midnight to 11:59 PM)
            today = timezone.now().date()
            today_start = timezone.make_aware(datetime.combine(today, time.min))
            today_end = timezone.make_aware(datetime.combine(today, time.max))
            return queryset.filter(
                appointment_time__gte=today_start,
                appointment_time__lte=today_end
            ).order_by('appointment_time')
        elif filter_type == 'upcoming':
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

# === NEW: RECEPTIONIST APPOINTMENTS VIEW ===
class ReceptionistAppointmentListView(generics.ListAPIView):
    """
    Receptionist view to list all appointments with filtering options.
    Similar to AdminAppointmentListView, but permission is for Receptionist.
    """
    permission_classes = [IsAuthenticated, IsVerified, IsReceptionist]
    serializer_class = AppointmentSerializer

    def get_queryset(self):
        queryset = Appointment.objects.all().select_related('doctor', 'patient')
        return self._apply_filters(queryset)
    
    def _apply_filters(self, queryset):
        doctor_id = self.request.query_params.get('doctor_id')
        if doctor_id:
            queryset = queryset.filter(doctor_id=doctor_id)
        
        status = self.request.query_params.get('status')
        if status:
            queryset = queryset.filter(status=status)
        
        date_from = self.request.query_params.get('date_from')
        if date_from:
            try:
                date_from_dt = datetime.strptime(date_from, '%Y-%m-%d')
                date_from_dt = timezone.make_aware(date_from_dt)
                queryset = queryset.filter(appointment_time__gte=date_from_dt)
            except ValueError:
                pass

        date_to = self.request.query_params.get('date_to')
        if date_to:
            try:
                date_to_dt = datetime.strptime(date_to, '%Y-%m-%d')
                date_to_dt = timezone.make_aware(date_to_dt).replace(hour=23, minute=59, second=59)
                queryset = queryset.filter(appointment_time__lte=date_to_dt)
            except ValueError:
                pass

        return queryset.order_by('-appointment_time')


# === Billing Management ===
class AppointmentPricingViewSet(viewsets.ModelViewSet):
    """ViewSet for managing doctor appointment pricing"""
    serializer_class = AppointmentPricingSerializer
    permission_classes = [IsAuthenticated, IsVerified]
    
    def get_queryset(self):
        user = self.request.user
        queryset = AppointmentPricing.objects.all().select_related('doctor')
        
        # Filter by doctor_id if provided
        doctor_id = self.request.query_params.get('doctor_id')
        if doctor_id:
            queryset = queryset.filter(doctor_id=doctor_id)
        
        # Admin and Receptionist can see all pricing
        if user.role in [UserRoles.ADMIN, UserRoles.RECEPTIONIST]:
            return queryset
        # Doctors can only see their own pricing
        elif user.role == UserRoles.DOCTOR:
            return queryset.filter(doctor=user)
        # Patients can see all pricing (for booking appointments)
        elif user.role == UserRoles.PATIENT:
            return queryset
            
        return AppointmentPricing.objects.none()
    
    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsAuthenticated(), IsVerified(), IsAdminOrSuperuser()]
        return super().get_permissions()

class BillViewSet(viewsets.ModelViewSet):
    """ViewSet for managing appointment bills"""
    queryset = Bill.objects.all().select_related('appointment__doctor', 'appointment__patient')
    serializer_class = BillSerializer
    permission_classes = [IsAuthenticated, IsVerified]
    
    def get_queryset(self):
        user = self.request.user
        queryset = Bill.objects.all().select_related('appointment__doctor', 'appointment__patient')
        
        # Filter by status if provided
        status_param = self.request.query_params.get('status')
        if status_param:
            queryset = queryset.filter(status=status_param)
            
        # Filter by payment_method if provided
        payment_method = self.request.query_params.get('payment_method')
        if payment_method:
            queryset = queryset.filter(payment_method=payment_method)
        
        # For retrieve actions (getting a single bill by ID), allow access if the user is the patient
        # associated with the bill or has admin/receptionist/doctor role
        if self.action == 'retrieve':
            bill_id = self.kwargs.get('pk')
            if bill_id:
                try:
                    bill = Bill.objects.get(id=bill_id)
                    if user.role in [UserRoles.ADMIN, UserRoles.RECEPTIONIST]:
                        return queryset
                    elif user.role == UserRoles.DOCTOR and bill.appointment and bill.appointment.doctor == user:
                        return queryset
                    elif user.role == UserRoles.PATIENT and bill.appointment and bill.appointment.patient == user:
                        return queryset.filter(id=bill_id)
                except Bill.DoesNotExist:
                    pass
        
        # For list actions
        if user.role == UserRoles.DOCTOR:
            # Doctors can only see bills for their appointments
            return queryset.filter(appointment__doctor=user)
        elif user.role in [UserRoles.ADMIN, UserRoles.RECEPTIONIST]:
            # Admins and receptionists can see all bills
            return queryset
        elif user.role == UserRoles.PATIENT:
            # Patients can only see their own bills through the patient/ endpoint
            return Bill.objects.none()
        else:
            # Other users can't see any bills by default
            return Bill.objects.none()
    
    def get_permissions(self):
        if self.action in ['update', 'partial_update', 'destroy']:
            return [IsAuthenticated(), IsVerified(), IsAdminOrSuperuser()]
        return super().get_permissions()
    
    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated, IsVerified])
    def mark_paid(self, request, pk=None):
        """Mark a bill as paid (for cash/insurance payments)"""
        bill = self.get_object()
        
        # Check permissions based on user role
        if request.user.role == UserRoles.PATIENT:
            # Patients can only mark their own bills as paid
            if bill.appointment and bill.appointment.patient != request.user:
                return Response(
                    {"error": "Patients can only mark their own bills as paid"},
                    status=status.HTTP_403_FORBIDDEN
                )
            # Patients can only use Stripe as payment method
            if request.data.get('payment_method') != PaymentMethod.STRIPE:
                return Response(
                    {"error": "Patients can only use online payment method"},
                    status=status.HTTP_400_BAD_REQUEST
                )
        # Admin and receptionists can mark any bill as paid
        elif request.user.role not in [UserRoles.ADMIN, UserRoles.RECEPTIONIST]:
            return Response(
                {"error": "Only administrators, receptionists, or the patient can mark bills as paid"},
                status=status.HTTP_403_FORBIDDEN
            )
            
        payment_method = request.data.get('payment_method', PaymentMethod.CASH)
        notes = request.data.get('notes', '')
        
        try:
            bill.mark_as_paid(payment_method=payment_method)
            
            if notes:
                bill.notes = notes
                bill.save()
                
            serializer = self.get_serializer(bill)
            return Response(serializer.data)
        except Exception as e:
            return Response(
                {"error": f"Failed to mark bill as paid: {str(e)}"},
                status=status.HTTP_400_BAD_REQUEST
            )
            
    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated, IsVerified])
    def patient(self, request):
        """Get all bills for the current patient"""
        user = request.user
        
        # Only patients can access this endpoint
        if user.role != UserRoles.PATIENT:
            return Response(
                {"error": "Only patients can access their bills through this endpoint"},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Get all bills for the patient's appointments, excluding canceled appointments
        bills = Bill.objects.filter(
            appointment__patient=user
        ).exclude(
            appointment__status=AppointmentStatus.CANCELLED  # Exclude canceled appointments
        ).select_related(
            'appointment', 'appointment__doctor'
        )
        
        serializer = self.get_serializer(bills, many=True)
        return Response(serializer.data)

# Initialize Stripe with API key
stripe.api_key = settings.STRIPE_SECRET_KEY

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_stripe_checkout(request):
    """Create a Stripe Checkout Session for appointment payment"""
    try:
        bill_id = request.data.get('bill_id')
        success_url = request.data.get('success_url', f"{settings.FRONTEND_URL}/payment-success")
        cancel_url = request.data.get('cancel_url', f"{settings.FRONTEND_URL}/payment-cancel")
        
        if not bill_id:
            return Response({"error": "Bill ID is required"}, status=status.HTTP_400_BAD_REQUEST)
            
        # Get the bill
        try:
            bill = Bill.objects.select_related('appointment__doctor').get(id=bill_id)
        except Bill.DoesNotExist:
            return Response({"error": "Bill not found"}, status=status.HTTP_404_NOT_FOUND)
            
        # Ensure bill is pending
        if bill.status != PaymentStatus.PENDING:
            return Response({"error": "Bill is not pending payment"}, status=status.HTTP_400_BAD_REQUEST)
            
        # Get patient name
        patient_name = bill.appointment.patient_name
        if bill.appointment.patient:
            patient_name = bill.appointment.patient.get_full_name()
            
        # Create checkout session
        checkout_session = stripe.checkout.Session.create(
            payment_method_types=['card'],
            line_items=[{
                'price_data': {
                    'currency': 'npr',  # Use NPR (Nepalese Rupee) instead of USD
                    'product_data': {
                        'name': f'Appointment with Dr. {bill.appointment.doctor.last_name}',
                        'description': f'Appointment on {bill.appointment.appointment_time.strftime("%Y-%m-%d %H:%M")}',
                    },
                    'unit_amount': int(float(bill.amount) * 100),  # Convert to cents
                },
                'quantity': 1,
            }],
            mode='payment',
            success_url=f"{success_url}?session_id={{CHECKOUT_SESSION_ID}}&bill_id={bill.id}",  # Include bill_id in success URL
            cancel_url=cancel_url,
            client_reference_id=str(bill.id),  # Store bill ID for webhook
            customer_email=bill.appointment.patient_email if bill.appointment.patient_email else None,
            metadata={
                'bill_id': str(bill.id),
                'appointment_id': str(bill.appointment.id),
                'patient_name': patient_name
            }
        )
        
        # Update bill to indicate Stripe payment is in progress
        bill.payment_method = PaymentMethod.STRIPE
        bill.save()
        
        return Response({
            'session_id': checkout_session.id,
            'checkout_url': checkout_session.url
        })
        
    except stripe.error.StripeError as e:
        return Response({"error": f"Stripe error: {str(e)}"}, status=status.HTTP_400_BAD_REQUEST)
    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@csrf_exempt
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def confirm_stripe_payment(request, bill_id):
    """Directly mark a bill as paid after Stripe payment
    This endpoint is used as a backup when the webhook fails to update the bill status
    """
    try:
        # Get the bill
        bill = Bill.objects.get(id=bill_id)
        
        # Verify the user is the patient associated with this bill
        if request.user.role == UserRoles.PATIENT and bill.appointment and bill.appointment.patient != request.user:
            return Response(
                {"error": "You can only confirm payment for your own bills"},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Check if bill is already paid
        if bill.status == PaymentStatus.PAID:
            return Response({"message": "Bill is already marked as paid", "status": "PAID"})
        
        # Get session ID from request data if available
        session_id = request.data.get('session_id', 'manual-confirmation')
        
        # Mark the bill as paid
        bill.mark_as_paid(
            payment_method=PaymentMethod.STRIPE,
            stripe_id=session_id
        )
        
        # Add notes if provided
        notes = request.data.get('notes')
        if notes:
            bill.notes = notes
            bill.save()
        
        logger.info(f"Bill {bill_id} manually marked as paid by user {request.user.id}")
        
        return Response({
            "message": "Payment confirmed successfully",
            "status": "PAID",
            "bill_id": str(bill_id)
        })
        
    except Bill.DoesNotExist:
        return Response({"error": "Bill not found"}, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        logger.error(f"Error confirming payment for bill {bill_id}: {str(e)}")
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


def stripe_webhook(request):
    """Handle Stripe webhook events"""
    payload = request.body
    sig_header = request.META.get('HTTP_STRIPE_SIGNATURE')
    
    if not sig_header:
        logger.error("Missing Stripe signature header")
        return HttpResponse(status=400)
    
    try:
        event = stripe.Webhook.construct_event(
            payload, sig_header, settings.STRIPE_WEBHOOK_SECRET
        )
    except ValueError as e:
        # Invalid payload
        logger.error(f"Invalid Stripe payload: {str(e)}")
        return HttpResponse(status=400)
    except stripe.error.SignatureVerificationError as e:
        # Invalid signature
        logger.error(f"Invalid Stripe signature: {str(e)}")
        return HttpResponse(status=400)
    
    logger.info(f"Received Stripe event: {event['type']}")
        
    # Handle the checkout.session.completed event
    if event['type'] == 'checkout.session.completed':
        session = event['data']['object']
        logger.info(f"Processing completed checkout session: {session.id}")
        
        # Get the bill ID from client_reference_id
        bill_id = session.get('client_reference_id')
        if not bill_id:
            logger.error("Missing client_reference_id in Stripe session")
            return HttpResponse(status=400)
            
        # Get payment intent ID
        payment_intent = session.get('payment_intent')
        logger.info(f"Payment intent: {payment_intent} for bill: {bill_id}")
        
        # Update the bill
        try:
            bill = Bill.objects.get(id=bill_id)
            
            # Check if bill is already paid
            if bill.status == PaymentStatus.PAID:
                logger.info(f"Bill {bill_id} is already marked as paid")
                return HttpResponse(status=200)
                
            bill.mark_as_paid(
                payment_method=PaymentMethod.STRIPE,
                stripe_id=payment_intent
            )
            logger.info(f"Payment successful for bill {bill_id}")
            
            # Send confirmation email if patient email is available
            if bill.appointment and bill.appointment.patient_email:
                try:
                    # This would be implemented with your email sending logic
                    # send_payment_confirmation_email(bill)
                    logger.info(f"Payment confirmation email sent for bill {bill_id}")
                except Exception as email_error:
                    logger.error(f"Failed to send payment confirmation email: {str(email_error)}")
                    
        except Bill.DoesNotExist:
            logger.error(f"Bill {bill_id} not found for payment {payment_intent}")
            return HttpResponse(status=404)
        except Exception as e:
            logger.error(f"Error processing payment for bill {bill_id}: {str(e)}")
            return HttpResponse(status=500)
    
    # Handle payment_intent.succeeded event as a backup
    elif event['type'] == 'payment_intent.succeeded':
        payment_intent = event['data']['object']
        metadata = payment_intent.get('metadata', {})
        bill_id = metadata.get('bill_id')
        
        if bill_id:
            try:
                bill = Bill.objects.get(id=bill_id)
                
                # Check if bill is already paid
                if bill.status == PaymentStatus.PAID:
                    logger.info(f"Bill {bill_id} is already marked as paid")
                    return HttpResponse(status=200)
                    
                bill.mark_as_paid(
                    payment_method=PaymentMethod.STRIPE,
                    stripe_id=payment_intent.id
                )
                logger.info(f"Payment successful for bill {bill_id} via payment_intent.succeeded")
            except Bill.DoesNotExist:
                logger.error(f"Bill {bill_id} not found for payment intent {payment_intent.id}")
            except Exception as e:
                logger.error(f"Error processing payment intent for bill {bill_id}: {str(e)}")
    
    return HttpResponse(status=200)


