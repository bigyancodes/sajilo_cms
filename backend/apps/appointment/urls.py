from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

app_name = "appointments"

# Create a router for ViewSets
router = DefaultRouter()
router.register(r'appointments', views.AppointmentViewSet, basename='appointment')
router.register(r'time-offs', views.TimeOffViewSet, basename='time-off')
router.register(r'available-slots', views.AvailableTimeSlotViewSet, basename='available-slot')

urlpatterns = [
    # Include the router URLs
    path('', include(router.urls)),
    
    # Admin endpoints
    path('admin/appointments/', views.AdminAppointmentListView.as_view(), name='admin-appointments'),
    path('admin/doctor-stats/', views.AdminDoctorAppointmentStatsView.as_view(), name='admin-doctor-stats'),
    
    # Patient endpoints
    path('patient/appointments/', views.PatientAppointmentListView.as_view(), name='patient-appointments'),
    
    # Doctor endpoints
    path('doctor/appointments/', views.DoctorAppointmentListView.as_view(), name='doctor-appointments'),
    path('doctor/patient-history/<int:patient_id>/', views.PatientAppointmentHistoryView.as_view(), name='patient-history'),
    
    # Available slots
    path('get-available-slots/', views.GetAvailableSlotsView.as_view(), name='get-available-slots'),
    path('create-available-slot/', views.CreateAvailableSlotView.as_view(), name='create-available-slot'),
    
    # Added alias for GET method clarity
    path('available-slots-by-date/', views.GetAvailableSlotsView.as_view(), name='available-slots-by-date'),
]