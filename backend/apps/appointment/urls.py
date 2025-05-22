
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework.decorators import api_view
from rest_framework.response import Response
from . import views
from .models import Appointment

app_name = "appointments"

router = DefaultRouter()
router.register(r'appointments', views.AppointmentViewSet, basename='appointment')
router.register(r'time-offs', views.TimeOffViewSet, basename='time-off')
router.register(r'available-slots', views.AvailableTimeSlotViewSet, basename='available-slot')
router.register(r'pricing', views.AppointmentPricingViewSet, basename='pricing')
router.register(r'bills', views.BillViewSet, basename='bill')

# Test endpoint to check all appointments in the system
@api_view(['GET'])
def test_all_appointments(request):
    appointments = Appointment.objects.all().select_related('doctor', 'patient')
    data = {
        'count': appointments.count(),
        'appointments': [
            {
                'id': str(appt.id),
                'doctor': appt.doctor.get_full_name() if appt.doctor else 'No doctor',
                'patient': appt.patient.get_full_name() if appt.patient else appt.patient_name or 'No patient',
                'time': appt.appointment_time.strftime('%Y-%m-%d %H:%M'),
                'status': appt.status
            } for appt in appointments
        ]
    }
    return Response(data)

urlpatterns = [
    # Include the router URLs
    path('', include(router.urls)),
    
    # Admin endpoints
    path('admin/appointments/', views.AdminAppointmentListView.as_view(), name='admin-appointments'),
    path('admin/doctor-stats/', views.AdminDoctorAppointmentStatsView.as_view(), name='admin-doctor-stats'),
    
    # Receptionist endpoints
    path('receptionist/appointments/', views.ReceptionistAppointmentListView.as_view(), name='receptionist-appointments'),
    
    # Patient endpoints
    path('patient/appointments/', views.PatientAppointmentListView.as_view(), name='patient-appointments'),
    
    # Doctor endpoints
    path('doctor/appointments/', views.DoctorAppointmentListView.as_view(), name='doctor-appointments'),
    path('doctor/patient-history/<int:patient_id>/', views.PatientAppointmentHistoryView.as_view(), name='patient-history'),
    
    # Available slots
    path('get-available-slots/', views.GetAvailableSlotsView.as_view(), name='get-available-slots'),
    path('create-available-slot/', views.CreateAvailableSlotView.as_view(), name='create-available-slot'),
    path('available-slots-by-date/', views.GetAvailableSlotsView.as_view(), name='available-slots-by-date'),
    
    # Stripe integration
    path('stripe/create-checkout/', views.create_stripe_checkout, name='create-stripe-checkout'),
    path('stripe/webhook/', views.stripe_webhook, name='stripe-webhook'),
    path('stripe/confirm-payment/<uuid:bill_id>/', views.confirm_stripe_payment, name='confirm-stripe-payment'),
    
    # Test endpoint
    path('test-all-appointments/', test_all_appointments, name='test-all-appointments'),
]