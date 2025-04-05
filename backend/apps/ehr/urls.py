from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

app_name = "ehr"

# Create a router for ViewSets
router = DefaultRouter()
router.register(r'records', views.MedicalRecordViewSet, basename='medical-record')
router.register(r'attachments', views.MedicalAttachmentViewSet, basename='medical-attachment')
router.register(r'audit-logs', views.MedicalRecordAuditViewSet, basename='medical-audit')

urlpatterns = [
    # Include the router URLs
    path('', include(router.urls)),
    
    # Custom endpoints
    path('appointment/<uuid:appointment_id>/', views.GetOrCreateMedicalRecordView.as_view(), name='get-or-create-record'),
    
    # New endpoint for patient medical history
    path('patient-history/<str:patient_id>/', views.PatientMedicalHistoryView.as_view(), name='patient-medical-history'),
]