import requests
import time
import json
import datetime
from fpdf import FPDF
from datetime import timedelta

# Base URL
BASE_URL = 'http://localhost:8000'

# Create a session to maintain cookies
session = requests.Session()

# Create a PDF class
class PDF(FPDF):
    def header(self):
        # Logo
        self.set_font('Arial', 'B', 15)
        self.cell(0, 10, 'Appointment Management Test Report', 0, 1, 'C')
        self.ln(10)
        
    def footer(self):
        # Footer
        self.set_y(-15)
        self.set_font('Arial', 'I', 8)
        self.cell(0, 10, f'Page {self.page_no()}', 0, 0, 'C')

# Initialize PDF
pdf = PDF()
pdf.add_page()
pdf.set_auto_page_break(auto=True, margin=15)

# Add report title and date
pdf.set_font('Arial', 'B', 16)
pdf.cell(0, 10, 'Appointment Management API Test Results', 0, 1, 'C')
pdf.set_font('Arial', '', 10)
pdf.cell(0, 10, f'Generated on: {datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")}', 0, 1, 'C')
pdf.ln(10)

# Test results will be stored here
test_results = []

def add_test_result(name, response, pdf):
    status_code = response.status_code
    
    # Try to parse JSON, if fails, just use text summary
    try:
        json_response = response.json()
        response_text = json.dumps(json_response, indent=2)
    except:
        response_text = response.text[:500] + ("..." if len(response.text) > 500 else "")
    
    # Print to console
    print(f"\n=== {name} ===")
    print(f"Status Code: {status_code}")
    print(f"Response: {response_text}")
    
    # Add to PDF
    pdf.set_font('Arial', 'B', 12)
    pdf.cell(0, 10, f"Test: {name}", 0, 1)
    
    # Status code with color
    pdf.set_font('Arial', '', 10)
    pdf.cell(40, 10, "Status Code:")
    
    # Set color based on success or failure
    if (status_code >= 200 and status_code < 300) or status_code == 205:
        pdf.set_text_color(0, 128, 0)  # Green
        result = "PASSED"
    else:
        pdf.set_text_color(255, 0, 0)  # Red
        result = "FAILED"
    
    pdf.cell(0, 10, f"{status_code}", 0, 1)
    pdf.set_text_color(0, 0, 0)  # Reset to black
    
    # Response data
    pdf.cell(40, 10, "Response:")
    pdf.ln(10)
    pdf.multi_cell(0, 5, response_text[:500])
    pdf.ln(5)
    
    # Save result
    test_results.append({"name": name, "result": result})
    
    return status_code

# Test 1: Get CSRF Token and Auth Setup
def test_get_csrf():
    response = session.get(f"{BASE_URL}/auth/csrf/")
    status = add_test_result("Get CSRF Token", response, pdf)
    
    if status == 200:
        try:
            csrf_token = response.json()['csrf']
            session.headers.update({'X-CSRFToken': csrf_token})
        except:
            pass
        
    return status == 200

# Test 2: Login as Doctor
def test_doctor_login():
    data = {
        "email": "sujan@gmail.com",  # Change to your doctor email
        "password": "astro098"   # Change to your doctor password
    }
    response = session.post(f"{BASE_URL}/auth/login/", json=data)
    status = add_test_result("Doctor Login", response, pdf)
    
    # Save doctor ID for later tests if available
    try:
        if status == 200:
            doctor_id = response.json()['id']
            session.headers.update({'test_doctor_id': str(doctor_id)})
    except:
        pass
        
    return status == 200

# Test 3: Login as Patient (for later tests)
def test_patient_login():
    data = {
        "email": "patient@gmail.com",  # Change to your patient email
        "password": "astro098"   # Change to your patient password
    }
    response = session.post(f"{BASE_URL}/auth/login/", json=data)
    status = add_test_result("Patient Login", response, pdf)
    
    # Save patient ID for later tests if available
    try:
        if status == 200:
            patient_id = response.json()['id']
            session.headers.update({'test_patient_id': str(patient_id)})
    except:
        pass
        
    return status == 200

# Test 4: Get Doctor's Available Time Slots
def test_get_available_slots():
    doctor_id = session.headers.get('test_doctor_id', '1')
    
    # Use a date 2 days in the future to ensure it's valid
    future_date = (datetime.datetime.now() + datetime.timedelta(days=2)).strftime('%Y-%m-%d')
    
    response = session.get(f"{BASE_URL}/appointment/available-slots-by-date/?doctor_id={doctor_id}&date={future_date}")
    status = add_test_result("Get Available Time Slots", response, pdf)
    
    # Save a time slot for booking if available
    try:
        slots = response.json().get('slots', [])
        if slots and len(slots) > 0:
            # Save the first available slot for booking
            first_slot = slots[0]
            session.headers.update({
                'test_slot_start': first_slot['start'],
                'test_slot_end': first_slot['end']
            })
    except:
        pass
        
    return status == 200

# Test 5: Create Available Time Slot (for Doctor)
def test_create_available_slot():
    # This test creates a new availability for the doctor
    # Use the doctor's ID from login
    doctor_id = session.headers.get('test_doctor_id', '1')
    
    # Set availability for tomorrow
    data = {
        "doctor_id": int(doctor_id),
        "day_of_week": datetime.datetime.now().weekday(),  # Today's day of week
        "start_time": "14:00:00",  # 2 PM
        "end_time": "17:00:00"     # 5 PM
    }
    
    response = session.post(f"{BASE_URL}/appointment/create-available-slot/", json=data)
    status = add_test_result("Create Available Time Slot", response, pdf)
    return status == 201

# Test 6: Book Appointment (as Patient)
def test_book_appointment():
    # First, we need to switch to patient user
    logged_in = test_patient_login()
    if not logged_in:
        return False
    
    # Check if we have slot data from previous test
    slot_start = session.headers.get('test_slot_start')
    slot_end = session.headers.get('test_slot_end')
    doctor_id = session.headers.get('test_doctor_id', '1')
    
    if not slot_start or not slot_end:
        # If no slot data, create an appointment for tomorrow
        tomorrow = datetime.datetime.now() + datetime.timedelta(days=1)
        slot_start = tomorrow.replace(hour=15, minute=0, second=0).isoformat()  # 3:00 PM tomorrow
        slot_end = tomorrow.replace(hour=15, minute=25, second=0).isoformat()   # 3:25 PM tomorrow
    
    # Create appointment data
    data = {
        "doctor": int(doctor_id),
        "appointment_time": slot_start,
        "end_time": slot_end,
        "reason": "API Test Appointment"
    }
    
    response = session.post(f"{BASE_URL}/appointment/appointments/", json=data)
    status = add_test_result("Book Appointment", response, pdf)
    
    # Save appointment ID for later tests
    try:
        if status == 201:
            appointment_id = response.json()['id']
            session.headers.update({'test_appointment_id': appointment_id})
    except:
        pass
        
    return status == 201

# Test 7: Get Patient Appointments
def test_get_patient_appointments():
    response = session.get(f"{BASE_URL}/appointment/patient/appointments/?filter=upcoming")
    status = add_test_result("Get Patient Appointments", response, pdf)
    return status == 200

# Test 8: Cancel Appointment (as Patient)
def test_cancel_appointment():
    appointment_id = session.headers.get('test_appointment_id')
    if not appointment_id:
        # Skip this test if no appointment was created
        print("Skipping appointment cancellation - no appointment ID available")
        return False
    
    response = session.post(f"{BASE_URL}/appointment/appointments/{appointment_id}/cancel/")
    status = add_test_result("Cancel Appointment", response, pdf)
    return status == 200

# Test 9: Login as Doctor and Get Doctor Appointments
def test_get_doctor_appointments():
    # Switch back to doctor user
    logged_in = test_doctor_login()
    if not logged_in:
        return False
    
    response = session.get(f"{BASE_URL}/appointment/doctor/appointments/?filter=upcoming")
    status = add_test_result("Get Doctor Appointments", response, pdf)
    return status == 200

# Test 10: Create Time Off for Doctor
def test_create_time_off():
    # Create time off for tomorrow
    tomorrow = datetime.datetime.now() + datetime.timedelta(days=1)
    start_time = tomorrow.replace(hour=10, minute=0, second=0).isoformat()  # 10:00 AM
    end_time = tomorrow.replace(hour=12, minute=0, second=0).isoformat()    # 12:00 PM
    
    data = {
        "start_time": start_time,
        "end_time": end_time,
        "reason": "Personal appointment"
    }
    
    response = session.post(f"{BASE_URL}/appointment/time-offs/", json=data)
    status = add_test_result("Create Time Off", response, pdf)
    
    # Save time off ID for later approval
    try:
        if status == 201:
            time_off_id = response.json()['id']
            session.headers.update({'test_time_off_id': str(time_off_id)})
    except:
        pass
        
    return status == 201

# Test 11: Login as Admin and Approve Time Off
def test_approve_time_off():
    # First, switch to admin user
    data = {
        "email": "itsparajulibigyan@gmail.com",  # Change to your admin email
        "password": "astro098"   # Change to your admin password
    }
    login_response = session.post(f"{BASE_URL}/auth/login/", json=data)
    admin_logged_in = login_response.status_code == 200
    
    if not admin_logged_in:
        print("Failed to login as admin, skipping time off approval")
        return False
    
    # Get time off ID from previous test
    time_off_id = session.headers.get('test_time_off_id')
    if not time_off_id:
        print("No time off ID available, skipping approval test")
        return False
    
    response = session.post(f"{BASE_URL}/appointment/time-offs/{time_off_id}/approve/")
    status = add_test_result("Approve Time Off", response, pdf)
    return status == 200

# Test 12: Get Doctor Stats (Admin Only)
def test_get_doctor_stats():
    response = session.get(f"{BASE_URL}/appointment/admin/doctor-stats/")
    status = add_test_result("Get Doctor Stats", response, pdf)
    return status == 200

# Run all tests
def run_all_tests():
    print("Starting Appointment Management Tests...")
    
    # First, set up authentication
    csrf_result = test_get_csrf()
    
    # Run tests for appointment functionality
    doctor_login_result = test_doctor_login()
    available_slots_result = test_get_available_slots()
    create_slot_result = test_create_available_slot()
    book_appointment_result = test_book_appointment()
    
    # Patient appointment operations
    patient_appointments_result = test_get_patient_appointments()
    cancel_appointment_result = test_cancel_appointment()
    
    # Doctor operations
    doctor_appointments_result = test_get_doctor_appointments()
    time_off_result = test_create_time_off()
    
    # Admin operations
    approve_time_off_result = test_approve_time_off()
    doctor_stats_result = test_get_doctor_stats()
    
    # Print summary
    print("\n=== TEST SUMMARY ===")
    print(f"CSRF Token: {'PASSED' if csrf_result else 'FAILED'}")
    print(f"Doctor Login: {'PASSED' if doctor_login_result else 'FAILED'}")
    print(f"Get Available Slots: {'PASSED' if available_slots_result else 'FAILED'}")
    print(f"Create Available Slot: {'PASSED' if create_slot_result else 'FAILED'}")
    print(f"Book Appointment: {'PASSED' if book_appointment_result else 'FAILED'}")
    print(f"Get Patient Appointments: {'PASSED' if patient_appointments_result else 'FAILED'}")
    print(f"Cancel Appointment: {'PASSED' if cancel_appointment_result else 'FAILED'}")
    print(f"Get Doctor Appointments: {'PASSED' if doctor_appointments_result else 'FAILED'}")
    print(f"Create Time Off: {'PASSED' if time_off_result else 'FAILED'}")
    print(f"Approve Time Off: {'PASSED' if approve_time_off_result else 'FAILED'}")
    print(f"Get Doctor Stats: {'PASSED' if doctor_stats_result else 'FAILED'}")
    
    # Add summary to PDF
    pdf.add_page()
    pdf.set_font('Arial', 'B', 14)
    pdf.cell(0, 10, "TEST SUMMARY", 0, 1, 'C')
    pdf.ln(5)
    
    # Create a summary table
    pdf.set_font('Arial', 'B', 12)
    pdf.cell(100, 10, "Test Name", 1, 0, 'C')
    pdf.cell(40, 10, "Result", 1, 1, 'C')
    
    pdf.set_font('Arial', '', 10)
    for test in test_results:
        pdf.cell(100, 10, test["name"], 1, 0)
        
        # Set color based on result
        if test["result"] == "PASSED":
            pdf.set_text_color(0, 128, 0)  # Green
        else:
            pdf.set_text_color(255, 0, 0)  # Red
            
        pdf.cell(40, 10, test["result"], 1, 1, 'C')
        pdf.set_text_color(0, 0, 0)  # Reset to black
    
    # Overall result
    all_passed = all(test["result"] == "PASSED" for test in test_results)
    pdf.ln(10)
    pdf.set_font('Arial', 'B', 14)
    pdf.cell(0, 10, "Overall Result:", 0, 0)
    
    if all_passed:
        pdf.set_text_color(0, 128, 0)  # Green
        result_text = "ALL TESTS PASSED"
    else:
        pdf.set_text_color(255, 0, 0)  # Red
        result_text = "SOME TESTS FAILED"
        
    pdf.cell(0, 10, result_text, 0, 1)
    
    # Save PDF
    pdf.output("appointment_test_report.pdf")
    print("\nPDF report saved as 'appointment_test_report.pdf'")

if __name__ == "__main__":
    run_all_tests()