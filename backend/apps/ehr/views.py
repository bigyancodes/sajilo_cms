from rest_framework import viewsets, generics, status, permissions
from rest_framework.response import Response
from rest_framework.decorators import api_view, permission_classes, action
from django.shortcuts import get_object_or_404
from django.http import HttpResponse, FileResponse
from django.utils import timezone
from django.db.models import Q
import logging
import io
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch

from .models import MedicalRecord, MedicalAttachment, Prescription, MedicalRecordAudit, MedicalRecordStatus
from .serializers import (
    MedicalRecordSerializer, 
    MedicalAttachmentSerializer,
    MedicalAttachmentCreateSerializer,
    MedicalAuditSerializer
)
from apps.appointment.models import Appointment, AppointmentStatus
from apps.accounts.models import UserRoles
from apps.accounts.permissions import IsAdminOrSuperuser, IsVerified, IsStaff

logger = logging.getLogger(__name__)

# Custom Permissions
class IsDoctor(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user.role == UserRoles.DOCTOR

class IsDoctorForAppointment(permissions.BasePermission):
    def has_object_permission(self, request, view, obj):
        # For MedicalRecord, check appointment's doctor
        if isinstance(obj, MedicalRecord):
            return obj.appointment.doctor == request.user
        # For MedicalAttachment, check medical_record's appointment's doctor
        elif isinstance(obj, MedicalAttachment):
            return obj.medical_record.appointment.doctor == request.user
        return False

class IsPatientForRecord(permissions.BasePermission):
    def has_object_permission(self, request, view, obj):
        # For MedicalRecord, check appointment's patient
        if isinstance(obj, MedicalRecord):
            return obj.appointment.patient == request.user
        # For MedicalAttachment, check medical_record's appointment's patient
        elif isinstance(obj, MedicalAttachment):
            return obj.medical_record.appointment.patient == request.user
        return False

class CanAccessMedicalRecord(permissions.BasePermission):
    def has_object_permission(self, request, view, obj):
        user = request.user
        
        # Admin or receptionist can access all records
        if user.role in [UserRoles.ADMIN, UserRoles.RECEPTIONIST]:
            return True
        
        # Doctor can access their own appointments' records
        if user.role == UserRoles.DOCTOR and obj.appointment.doctor == user:
            return True
        
        # Patient can access their own records
        if user.role == UserRoles.PATIENT and obj.appointment.patient == user:
            return True
        
        return False

# Views
class MedicalRecordViewSet(viewsets.ModelViewSet):
    """ViewSet for managing medical records"""
    serializer_class = MedicalRecordSerializer
    permission_classes = [permissions.IsAuthenticated, IsVerified]
    
    def get_queryset(self):
        user = self.request.user
        
        if user.role == UserRoles.ADMIN or user.role == UserRoles.RECEPTIONIST:
            queryset = MedicalRecord.objects.all().select_related('appointment__doctor', 'appointment__patient')
        elif user.role == UserRoles.DOCTOR:
            queryset = MedicalRecord.objects.filter(appointment__doctor=user).select_related('appointment__patient')
        elif user.role == UserRoles.PATIENT:
            queryset = MedicalRecord.objects.filter(appointment__patient=user).select_related('appointment__doctor')
        else:
            queryset = MedicalRecord.objects.none()
        
        return self._apply_filters(queryset)
    
    def _apply_filters(self, queryset):
        """Apply common filtering based on query parameters"""
        patient_id = self.request.query_params.get('patient_id')
        if patient_id:
            queryset = queryset.filter(appointment__patient_id=patient_id)
        
        doctor_id = self.request.query_params.get('doctor_id')
        if doctor_id:
            queryset = queryset.filter(appointment__doctor_id=doctor_id)
        
        appointment_id = self.request.query_params.get('appointment_id')
        if appointment_id:
            queryset = queryset.filter(appointment_id=appointment_id)
        
        date_from = self.request.query_params.get('date_from')
        if date_from:
            queryset = queryset.filter(appointment__appointment_time__date__gte=date_from)
        
        date_to = self.request.query_params.get('date_to')
        if date_to:
            queryset = queryset.filter(appointment__appointment_time__date__lte=date_to)
        
        return queryset
    
    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update']:
            return [permissions.IsAuthenticated(), IsVerified(), IsDoctor()]
        elif self.action == 'destroy':
            return [permissions.IsAuthenticated(), IsVerified(), IsAdminOrSuperuser()]
        elif self.action in ['export_pdf']:
            return [permissions.IsAuthenticated(), IsVerified()]
        return super().get_permissions()
    
    def get_object(self):
        obj = super().get_object()
        self.check_object_permissions(self.request, obj)
        return obj
    
    def perform_create(self, serializer):
        record = serializer.save(created_by=self.request.user)
        
        # Set the current user and request for audit signals
        record._current_user = self.request.user
        record._current_request = self.request
        record.save()
        
        # Create audit log
        MedicalRecordAudit.objects.create(
            medical_record=record,
            action='CREATE',
            performed_by=self.request.user,
            ip_address=self.request.META.get('REMOTE_ADDR', ''),
            user_agent=self.request.META.get('HTTP_USER_AGENT', '')
        )
    
    def perform_update(self, serializer):
        record = serializer.save()
        
        # Set the current user and request for audit signals
        record._current_user = self.request.user
        record._current_request = self.request
        
        # Create audit log
        MedicalRecordAudit.objects.create(
            medical_record=record,
            action='UPDATE',
            performed_by=self.request.user,
            ip_address=self.request.META.get('REMOTE_ADDR', ''),
            user_agent=self.request.META.get('HTTP_USER_AGENT', '')
        )
    
    @action(detail=True, methods=['get'], permission_classes=[permissions.IsAuthenticated, IsVerified])
    def export_pdf(self, request, pk=None):
        """Export medical record as PDF"""
        medical_record = self.get_object()
        
        # Log the export action
        MedicalRecordAudit.objects.create(
            medical_record=medical_record,
            action='EXPORT',
            performed_by=request.user,
            ip_address=request.META.get('REMOTE_ADDR', ''),
            user_agent=request.META.get('HTTP_USER_AGENT', '')
        )
        
        # Create PDF in memory
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=letter)
        styles = getSampleStyleSheet()
        elements = []
        
        # Add title
        title_style = ParagraphStyle(
            'Title',
            parent=styles['Heading1'],
            fontSize=16,
            spaceAfter=12
        )
        elements.append(Paragraph(f"Medical Record", title_style))
        elements.append(Spacer(1, 0.2*inch))
        
        # Add patient and appointment info
        info_style = ParagraphStyle(
            'Info',
            parent=styles['Normal'],
            fontSize=12,
            spaceAfter=6
        )
        patient_name = self.get_serializer(medical_record).get_patient_name(medical_record)
        doctor_name = self.get_serializer(medical_record).get_doctor_name(medical_record)
        
        elements.append(Paragraph(f"<b>Patient:</b> {patient_name}", info_style))
        elements.append(Paragraph(f"<b>Doctor:</b> {doctor_name}", info_style))
        elements.append(Paragraph(f"<b>Date:</b> {medical_record.appointment.appointment_time.strftime('%Y-%m-%d %H:%M')}", info_style))
        
        # Add previous record info if applicable
        if medical_record.previous_record:
            previous_date = medical_record.previous_record.appointment.appointment_time.strftime('%Y-%m-%d')
            elements.append(Paragraph(f"<b>Follow-up of visit:</b> {previous_date}", info_style))
            
        elements.append(Spacer(1, 0.2*inch))
        
        # Add medical record details
        header_style = ParagraphStyle(
            'Header',
            parent=styles['Heading2'],
            fontSize=14,
            spaceAfter=6,
            spaceBefore=12
        )
        
        content_style = ParagraphStyle(
            'Content',
            parent=styles['Normal'],
            fontSize=12,
            spaceAfter=12
        )
        
        # Chief complaint
        if medical_record.chief_complaint:
            elements.append(Paragraph("Chief Complaint", header_style))
            elements.append(Paragraph(medical_record.chief_complaint, content_style))
        
        # Observations
        if medical_record.observations:
            elements.append(Paragraph("Observations", header_style))
            elements.append(Paragraph(medical_record.observations, content_style))
        
        # Diagnosis
        if medical_record.diagnosis:
            elements.append(Paragraph("Diagnosis", header_style))
            elements.append(Paragraph(medical_record.diagnosis, content_style))
        
        # Treatment plan
        if medical_record.treatment_plan:
            elements.append(Paragraph("Treatment Plan", header_style))
            elements.append(Paragraph(medical_record.treatment_plan, content_style))
        
        # Prescriptions
        prescriptions = Prescription.objects.filter(medical_record=medical_record)
        if prescriptions.exists():
            elements.append(Paragraph("Prescriptions", header_style))
            
            data = [["Medication", "Dosage", "Frequency", "Duration", "Instructions"]]
            for prescription in prescriptions:
                data.append([
                    prescription.medication,
                    prescription.dosage,
                    prescription.frequency,
                    prescription.duration,
                    prescription.instructions
                ])
            
            table = Table(data, colWidths=[1.5*inch, 1*inch, 1*inch, 1*inch, 2.5*inch])
            table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                ('ALIGN', (0, 0), (-1, 0), 'CENTER'),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, 0), 12),
                ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
                ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
                ('GRID', (0, 0), (-1, -1), 1, colors.black),
                ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
                ('FONTSIZE', (0, 1), (-1, -1), 10),
            ]))
            elements.append(table)
            elements.append(Spacer(1, 0.2*inch))
        
        # Notes
        if medical_record.notes:
            elements.append(Paragraph("Additional Notes", header_style))
            elements.append(Paragraph(medical_record.notes, content_style))
        
        # Build PDF
        doc.build(elements)
        
        # Get PDF value from the BytesIO buffer
        pdf = buffer.getvalue()
        buffer.close()
        
        # Generate response
        response = HttpResponse(content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="medical_record_{medical_record.id}.pdf"'
        response.write(pdf)
        
        return response

    # Mark a medical record as completed
    @action(detail=True, methods=['post'])
    def mark_completed(self, request, pk=None):
        """Mark a medical record as completed"""
        record = self.get_object()
        
        # Check if user is authorized to mark this record as completed
        if request.user.role == UserRoles.DOCTOR and record.appointment.doctor != request.user:
            return Response({
                "detail": "You can only mark your own medical records as completed"
            }, status=status.HTTP_403_FORBIDDEN)
        
        if record.status == MedicalRecordStatus.COMPLETED:
            return Response({
                "detail": "This medical record is already marked as completed"
            }, status=status.HTTP_400_BAD_REQUEST)
        
        record.mark_as_completed()
        
        # Create audit log
        MedicalRecordAudit.objects.create(
            medical_record=record,
            action='UPDATE',
            field_modified='status',
            old_value=MedicalRecordStatus.PROCESSING,
            new_value=MedicalRecordStatus.COMPLETED,
            performed_by=request.user,
            ip_address=request.META.get('REMOTE_ADDR', ''),
            user_agent=request.META.get('HTTP_USER_AGENT', '')
        )
        
        serializer = self.get_serializer(record)
        return Response(serializer.data)
    
    # Mark a medical record as processing
    @action(detail=True, methods=['post'])
    def mark_processing(self, request, pk=None):
        """Mark a medical record as processing (in progress)"""
        record = self.get_object()
        
        # Check if user is authorized to mark this record as processing
        if request.user.role == UserRoles.DOCTOR and record.appointment.doctor != request.user:
            return Response({
                "detail": "You can only mark your own medical records as processing"
            }, status=status.HTTP_403_FORBIDDEN)
        
        if record.status == MedicalRecordStatus.PROCESSING:
            return Response({
                "detail": "This medical record is already marked as processing"
            }, status=status.HTTP_400_BAD_REQUEST)
        
        record.mark_as_processing()
        
        # Create audit log
        MedicalRecordAudit.objects.create(
            medical_record=record,
            action='UPDATE',
            field_modified='status',
            old_value=MedicalRecordStatus.COMPLETED,
            new_value=MedicalRecordStatus.PROCESSING,
            performed_by=request.user,
            ip_address=request.META.get('REMOTE_ADDR', ''),
            user_agent=request.META.get('HTTP_USER_AGENT', '')
        )
        
        serializer = self.get_serializer(record)
        return Response(serializer.data)

class GetOrCreateMedicalRecordView(generics.GenericAPIView):
    """API to get or create a medical record for a specific appointment"""
    serializer_class = MedicalRecordSerializer
    permission_classes = [permissions.IsAuthenticated, IsVerified]
    
    def get(self, request, appointment_id):
        try:
            appointment = Appointment.objects.get(id=appointment_id)
            
            # Check permissions
            if request.user.role == UserRoles.DOCTOR and appointment.doctor != request.user:
                return Response(
                    {"error": "You can only access your own appointments' medical records"},
                    status=status.HTTP_403_FORBIDDEN
                )
            elif request.user.role == UserRoles.PATIENT and appointment.patient != request.user:
                return Response(
                    {"error": "You can only access your own medical records"},
                    status=status.HTTP_403_FORBIDDEN
                )
            
            # Check if appointment is in right status
            if request.user.role == UserRoles.DOCTOR and appointment.status not in [
                AppointmentStatus.CONFIRMED, AppointmentStatus.COMPLETED
            ]:
                return Response(
                    {"error": "Medical records can only be accessed for confirmed or completed appointments"},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Try to get existing record
            try:
                medical_record = MedicalRecord.objects.get(appointment=appointment)
                
                # Log the view action
                MedicalRecordAudit.objects.create(
                    medical_record=medical_record,
                    action='VIEW',
                    performed_by=request.user,
                    ip_address=request.META.get('REMOTE_ADDR', ''),
                    user_agent=request.META.get('HTTP_USER_AGENT', '')
                )
                
                serializer = self.get_serializer(medical_record)
                return Response(serializer.data)
            except MedicalRecord.DoesNotExist:
                # If doesn't exist and user is doctor, create new record
                if request.user.role == UserRoles.DOCTOR:
                    medical_record = MedicalRecord.objects.create(
                        appointment=appointment,
                        created_by=request.user
                    )
                    
                    # Log the creation
                    MedicalRecordAudit.objects.create(
                        medical_record=medical_record,
                        action='CREATE',
                        performed_by=request.user,
                        ip_address=request.META.get('REMOTE_ADDR', ''),
                        user_agent=request.META.get('HTTP_USER_AGENT', '')
                    )
                    
                    serializer = self.get_serializer(medical_record)
                    return Response(serializer.data, status=status.HTTP_201_CREATED)
                # If patient and record doesn't exist, return 404
                else:
                    return Response(
                        {"error": "No medical record found for this appointment"},
                        status=status.HTTP_404_NOT_FOUND
                    )
                
        except Appointment.DoesNotExist:
            return Response(
                {"error": "Appointment not found"},
                status=status.HTTP_404_NOT_FOUND
            )

class MedicalAttachmentViewSet(viewsets.ModelViewSet):
    """ViewSet for managing medical record attachments"""
    permission_classes = [permissions.IsAuthenticated, IsVerified]
    
    def get_serializer_class(self):
        if self.action == 'create':
            return MedicalAttachmentCreateSerializer
        return MedicalAttachmentSerializer
    
    def get_queryset(self):
        user = self.request.user
        
        if user.role in [UserRoles.ADMIN, UserRoles.RECEPTIONIST]:
            queryset = MedicalAttachment.objects.all()
        elif user.role == UserRoles.DOCTOR:
            queryset = MedicalAttachment.objects.filter(medical_record__appointment__doctor=user)
        elif user.role == UserRoles.PATIENT:
            queryset = MedicalAttachment.objects.filter(medical_record__appointment__patient=user)
        else:
            queryset = MedicalAttachment.objects.none()
        
        # Filter by medical record if specified
        medical_record_id = self.request.query_params.get('medical_record_id')
        if medical_record_id:
            queryset = queryset.filter(medical_record_id=medical_record_id)
        
        return queryset
    
    def get_permissions(self):
        if self.action == 'destroy':
            return [permissions.IsAuthenticated(), IsVerified(), IsAdminOrSuperuser()]
        return super().get_permissions()
    
    def perform_create(self, serializer):
        serializer.save(uploaded_by=self.request.user)
    
    @action(detail=True, methods=['get'])
    def download(self, request, pk=None):
        """Download attachment file"""
        attachment = self.get_object()
        
        # Open the file
        try:
            file_handle = attachment.file.open()
            response = FileResponse(file_handle, content_type='application/octet-stream')
            response['Content-Disposition'] = f'attachment; filename="{attachment.file_name}"'
            return response
        except Exception as e:
            logger.error(f"File download error: {str(e)}")
            return Response(
                {"error": "File could not be downloaded"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

class MedicalRecordAuditViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet for viewing medical record audit logs"""
    serializer_class = MedicalAuditSerializer
    permission_classes = [permissions.IsAuthenticated, IsVerified, IsAdminOrSuperuser]
    
    def get_queryset(self):
        queryset = MedicalRecordAudit.objects.all()
        
        # Filter by medical record if specified
        medical_record_id = self.request.query_params.get('medical_record_id')
        if medical_record_id:
            queryset = queryset.filter(medical_record_id=medical_record_id)
        
        # Filter by user if specified
        user_id = self.request.query_params.get('user_id')
        if user_id:
            queryset = queryset.filter(performed_by_id=user_id)
        
        # Filter by action if specified
        action = self.request.query_params.get('action')
        if action:
            queryset = queryset.filter(action=action)
        
        # Filter by date range
        date_from = self.request.query_params.get('date_from')
        if date_from:
            queryset = queryset.filter(timestamp__date__gte=date_from)
        
        date_to = self.request.query_params.get('date_to')
        if date_to:
            queryset = queryset.filter(timestamp__date__lte=date_to)
        
        return queryset.order_by('-timestamp')

class PatientMedicalHistoryView(generics.ListAPIView):
    """Get a patient's medical history (all medical records)"""
    serializer_class = MedicalRecordSerializer
    permission_classes = [permissions.IsAuthenticated, IsVerified]
    
    def get_queryset(self):
        patient_id = self.kwargs.get('patient_id')
        user = self.request.user
        
        if user.role == UserRoles.DOCTOR:
            # Doctors can see their own patients' records
            return MedicalRecord.objects.filter(
                appointment__patient_id=patient_id,
                appointment__doctor=user
            ).order_by('-created_at')
        elif user.role == UserRoles.PATIENT and str(user.id) == patient_id:
            # Patients can see their own records
            return MedicalRecord.objects.filter(
                appointment__patient_id=patient_id
            ).order_by('-created_at')
        elif user.role in [UserRoles.ADMIN, UserRoles.RECEPTIONIST]:
            # Admin and receptionist can see all records
            return MedicalRecord.objects.filter(
                appointment__patient_id=patient_id
            ).order_by('-created_at')
            
        return MedicalRecord.objects.none()


class CreateMedicalRecordWithAppointmentView(generics.CreateAPIView):
    """Create a medical record and optionally mark the appointment as complete"""
    serializer_class = MedicalRecordSerializer
    permission_classes = [permissions.IsAuthenticated, IsVerified]
    
    def create(self, request, *args, **kwargs):
        # Log the entire request data for debugging
        logger.info(f"CreateMedicalRecordWithAppointmentView received data: {request.data}")
        
        # Extract appointment_id and mark_complete from request data
        appointment_id = request.data.get('appointment_id')
        mark_complete = request.data.get('mark_complete', False)
        
        logger.info(f"Extracted appointment_id: {appointment_id}, mark_complete: {mark_complete}")
        
        if not appointment_id:
            return Response(
                {"error": "appointment_id is required"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Get the appointment
        try:
            appointment = Appointment.objects.get(id=appointment_id)
        except Appointment.DoesNotExist:
            return Response(
                {"error": "Appointment not found"},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Check if user is the doctor for this appointment
        if request.user.role == UserRoles.DOCTOR and appointment.doctor != request.user:
            return Response(
                {"error": "You can only create medical records for your own appointments"},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Check if medical record already exists
        if hasattr(appointment, 'medical_record'):
            return Response(
                {"error": "Medical record already exists for this appointment"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Check if appointment status is valid
        if appointment.status not in [AppointmentStatus.CONFIRMED, AppointmentStatus.COMPLETED]:
            return Response(
                {"error": "Medical records can only be created for confirmed or completed appointments"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Prepare data for medical record creation
        record_data = request.data.copy()
        record_data.pop('appointment_id', None)  # Remove appointment_id from data
        record_data.pop('mark_complete', None)   # Remove mark_complete from data
        
        # Create the medical record
        serializer = self.get_serializer(data=record_data)
        
        # Log validation errors if any
        if not serializer.is_valid():
            logger.error(f"Serializer validation errors: {serializer.errors}")
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
            
        record = serializer.save(
            appointment=appointment,
            created_by=request.user
        )
        
        # Set the current user and request for audit signals
        record._current_user = request.user
        record._current_request = request
        record.save()
        
        # Create audit log
        MedicalRecordAudit.objects.create(
            medical_record=record,
            action='CREATE',
            performed_by=request.user,
            ip_address=request.META.get('REMOTE_ADDR', ''),
            user_agent=request.META.get('HTTP_USER_AGENT', '')
        )
        
        # Mark appointment as complete if requested
        if mark_complete and appointment.status == AppointmentStatus.CONFIRMED:
            appointment.mark_completed()
            logger.info(f"Appointment {appointment.id} marked as completed during medical record creation")
        
        # Return the created record
        return Response(serializer.data, status=status.HTTP_201_CREATED)