import os
import django
import datetime
import uuid
from django.utils import timezone

# Setup Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'sajilocms_backend.settings')
django.setup()

# Import models after Django setup
from django.contrib.auth import get_user_model
from apps.appointment.models import Appointment, AppointmentStatus

User = get_user_model()

def create_test_appointments():
    # Get a doctor
    doctors = User.objects.filter(role='DOCTOR')
    if not doctors.exists():
        print("No doctors found in the system. Please create a doctor first.")
        return
    
    # Get a patient
    patients = User.objects.filter(role='PATIENT')
    if not patients.exists():
        print("No patients found in the system. Please create a patient first.")
        return
    
    doctor = doctors.first()
    patient = patients.first()
    
    # Create appointments for today, tomorrow, and yesterday
    today = timezone.now()
    tomorrow = today + datetime.timedelta(days=1)
    yesterday = today - datetime.timedelta(days=1)
    
    # Today's appointment
    today_appt = Appointment.objects.create(
        id=uuid.uuid4(),
        doctor=doctor,
        patient=patient,
        appointment_time=today.replace(hour=10, minute=0, second=0),
        end_time=today.replace(hour=10, minute=30, second=0),
        reason="Regular checkup",
        status=AppointmentStatus.CONFIRMED
    )
    
    # Tomorrow's appointment
    tomorrow_appt = Appointment.objects.create(
        id=uuid.uuid4(),
        doctor=doctor,
        patient=patient,
        appointment_time=tomorrow.replace(hour=14, minute=0, second=0),
        end_time=tomorrow.replace(hour=14, minute=30, second=0),
        reason="Follow-up",
        status=AppointmentStatus.PENDING
    )
    
    # Yesterday's appointment (should be marked as MISSED if not updated)
    yesterday_appt = Appointment.objects.create(
        id=uuid.uuid4(),
        doctor=doctor,
        patient=patient,
        appointment_time=yesterday.replace(hour=9, minute=0, second=0),
        end_time=yesterday.replace(hour=9, minute=30, second=0),
        reason="Initial consultation",
        status=AppointmentStatus.COMPLETED
    )
    
    print(f"Created 3 test appointments:")
    print(f"1. Today ({today.strftime('%Y-%m-%d')}) at 10:00 AM - CONFIRMED")
    print(f"2. Tomorrow ({tomorrow.strftime('%Y-%m-%d')}) at 2:00 PM - PENDING")
    print(f"3. Yesterday ({yesterday.strftime('%Y-%m-%d')}) at 9:00 AM - COMPLETED")

def check_appointments():
    appointments = Appointment.objects.all().select_related('doctor', 'patient')
    count = appointments.count()
    
    print(f"Total appointments in the system: {count}")
    
    if count == 0:
        print("No appointments found. Creating test appointments...")
        create_test_appointments()
    else:
        print("Existing appointments:")
        for i, appt in enumerate(appointments, 1):
            doctor_name = appt.doctor.get_full_name() if appt.doctor else "No doctor"
            patient_name = appt.patient.get_full_name() if appt.patient else (appt.patient_name or "No patient")
            print(f"{i}. {appt.appointment_time.strftime('%Y-%m-%d %H:%M')} - Dr. {doctor_name} with {patient_name} - Status: {appt.status}")

if __name__ == "__main__":
    check_appointments()
