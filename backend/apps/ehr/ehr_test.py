import requests
import json
import logging
import uuid
import datetime
import time
from fpdf import FPDF

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s',
    handlers=[
        logging.FileHandler("ehr_debug.log"),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

# Base URL
BASE_URL = 'http://localhost:8000'

# Create a session to maintain cookies
session = requests.Session()

# Test user credentials
doctor_email = "pradeepkoirala07@gmail.com"
doctor_password = "astro098"

# Custom PDF class for report generation
class PDF(FPDF):
    def header(self):
        self.set_font('Helvetica', 'B', 16)
        self.set_text_color(0, 51, 102)  # Dark blue
        self.cell(0, 10, 'EHR System: Medical Record Creation Test Report', 0, 1, 'C')
        self.set_font('Helvetica', 'I', 10)
        self.set_text_color(100, 100, 100)  # Gray
        self.cell(0, 6, f'Generated: {datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")}', 0, 1, 'C')
        self.ln(5)
        self.line(10, self.get_y(), 200, self.get_y())  # Horizontal line
        self.ln(5)

    def footer(self):
        self.set_y(-15)
        self.set_font('Helvetica', 'I', 8)
        self.set_text_color(150, 150, 150)
        self.cell(0, 10, f'Page {self.page_no()} | EHR System Testing', 0, 0, 'C')

# Function to add test results to PDF and console
def add_test_result(name, response, pdf, start_time):
    status_code = response.status_code if response else "No Response"
    duration = time.time() - start_time
    error_message = ""
    
    try:
        json_response = response.json()
        response_text = json.dumps(json_response, indent=2)
    except:
        response_text = response.text if response else "No Response"
        if response:
            error_message = response.text[:200] if len(response.text) > 0 else "No error details available"
    
    # Print to console
    print(f"\n=== {name} ===")
    print(f"Status Code: {status_code}")
    print(f"Duration: {duration:.2f} seconds")
    print(f"Response: {response_text}")
    if error_message:
        print(f"Error: {error_message}")
    
    # Add to PDF
    pdf.set_font('Helvetica', 'B', 12)
    pdf.set_fill_color(230, 240, 255)  # Light blue background
    pdf.cell(0, 8, f"Test: {name}", 0, 1, 'L', fill=True)
    
    pdf.set_font('Helvetica', '', 10)
    pdf.cell(40, 6, "Status Code: ")
    if status_code == "No Response" or not (200 <= int(status_code) < 300):
        pdf.set_text_color(200, 0, 0)  # Red
        result = "FAILED"
    else:
        pdf.set_text_color(0, 128, 0)  # Green
        result = "PASSED"
    pdf.cell(0, 6, f"{status_code}", 0, 1)
    pdf.set_text_color(0, 0, 0)
    
    pdf.cell(40, 6, "Duration: ")
    pdf.cell(0, 6, f"{duration:.2f} seconds", 0, 1)
    
    if error_message and result == "FAILED":
        pdf.cell(40, 6, "Error: ")
        pdf.multi_cell(0, 5, error_message)
    
    pdf.cell(40, 6, "Response: ")
    pdf.ln(6)
    pdf.set_font('Courier', '', 9)
    pdf.multi_cell(0, 5, response_text[:500] + ("..." if len(response_text) > 500 else ""))
    pdf.set_font('Helvetica', '', 10)
    pdf.ln(5)
    
    return {"name": name, "result": result, "status_code": str(status_code), "duration": duration}

def setup_login(email, password):
    """Login and return auth token and user details"""
    data = {"email": email, "password": password}
    try:
        response = session.post(f"{BASE_URL}/auth/login/", json=data)
        response.raise_for_status()
        logger.info(f"Successfully logged in as {email}")
        return response.json()
    except requests.exceptions.RequestException as e:
        logger.error(f"Login failed: {str(e)}")
        if hasattr(e, 'response'):
            logger.error(f"Response: {e.response.text}")
        return None

def get_appointment_details(appointment_id):
    """Fetch appointment details to check status"""
    try:
        response = session.get(f"{BASE_URL}/appointment/appointments/{appointment_id}/")
        response.raise_for_status()
        logger.info(f"Successfully retrieved appointment {appointment_id}")
        return response.json()
    except requests.exceptions.RequestException as e:
        logger.error(f"Failed to get appointment: {str(e)}")
        if hasattr(e, 'response'):
            logger.error(f"Response: {e.response.text}")
        return None

def get_confirmed_appointments():
    """Get CONFIRMED status appointments for creating medical records"""
    try:
        response = session.get(f"{BASE_URL}/appointment/doctor/appointments/?status=CONFIRMED")
        response.raise_for_status()
        logger.info("Successfully retrieved confirmed appointments")
        return response.json()
    except requests.exceptions.RequestException as e:
        logger.error(f"Failed to get confirmed appointments: {str(e)}")
        if hasattr(e, 'response'):
            logger.error(f"Response: {e.response.text}")
        return []

def create_medical_record(appointment_id, data=None):
    """Create a medical record"""
    if data is None:
        data = {
            "appointment": appointment_id,
            "chief_complaint": "Headache and fever",
            "observations": "Temperature: 38.5°C, BP: 120/80",
            "diagnosis": "Common cold",
            "treatment_plan": "Rest and hydration",
            "notes": "Follow up in 3 days if symptoms persist",
            "prescriptions": [
                {"medication": "Paracetamol", "dosage": "500mg", "frequency": "Every 6 hours", "duration": "3 days", "instructions": "Take with food"}
            ]
        }
    
    logger.info(f"Creating medical record with data: {json.dumps(data, indent=2)}")
    try:
        response = session.post(f"{BASE_URL}/ehr/records/", json=data)
        logger.info(f"Response status code: {response.status_code}")
        try:
            response_data = response.json()
            logger.info(f"Response data: {json.dumps(response_data, indent=2)}")
        except json.JSONDecodeError:
            logger.info(f"Response text: {response.text}")
        return response
    except requests.exceptions.RequestException as e:
        logger.error(f"Failed to create medical record: {str(e)}")
        return None

def get_or_create_medical_record(appointment_id):
    """Get or create a medical record using the specific endpoint"""
    try:
        response = session.get(f"{BASE_URL}/ehr/appointment/{appointment_id}/")
        logger.info(f"Get or create medical record response: {response.status_code}")
        try:
            response_data = response.json()
            logger.info(f"Response data: {json.dumps(response_data, indent=2)}")
        except json.JSONDecodeError:
            logger.info(f"Response text: {response.text}")
        return response
    except requests.exceptions.RequestException as e:
        logger.error(f"Failed to get or create medical record: {str(e)}")
        return None

def run_tests():
    """Run a series of tests to diagnose medical record creation issues and generate a PDF report"""
    # Initialize PDF
    pdf = PDF()
    pdf.add_page()
    pdf.set_auto_page_break(auto=True, margin=15)
    
    # Add environment details
    pdf.set_font('Helvetica', 'B', 12)
    pdf.cell(0, 8, "Test Environment", 0, 1)
    pdf.set_font('Helvetica', '', 10)
    pdf.cell(0, 6, f"Base URL: {BASE_URL}", 0, 1)
    pdf.cell(0, 6, f"Test User: {doctor_email}", 0, 1)
    pdf.cell(0, 6, f"Run Time: {datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')}", 0, 1)
    pdf.ln(10)
    
    # List to store test results
    test_results = []
    
    # Login as doctor
    start_time = time.time()
    login_response = setup_login(doctor_email, doctor_password)
    if not login_response:
        logger.error("Cannot continue tests - login failed")
        pdf.set_font('Helvetica', 'B', 12)
        pdf.set_text_color(200, 0, 0)
        pdf.cell(0, 8, "SETUP FAILED: Could not login as doctor", 0, 1)
        pdf.set_text_color(0, 0, 0)
        pdf.output("medical_record_test_report.pdf")
        return
    
    user_info = login_response.get('user', {})
    logger.info(f"Logged in as: {user_info.get('first_name')} {user_info.get('last_name')} (Role: {user_info.get('role')})")
    test_results.append({"name": "Doctor Login", "result": "PASSED", "status_code": "200", "duration": time.time() - start_time})
    
    # Get confirmed appointments
    start_time = time.time()
    confirmed_appointments = get_confirmed_appointments()
    if not confirmed_appointments:
        logger.error("No confirmed appointments found. Cannot create medical records.")
        pdf.set_font('Helvetica', 'B', 12)
        pdf.set_text_color(200, 0, 0)
        pdf.cell(0, 8, "SETUP FAILED: No confirmed appointments found", 0, 1)
        pdf.set_text_color(0, 0, 0)
        pdf.output("medical_record_test_report.pdf")
        return
    
    logger.info(f"Found {len(confirmed_appointments)} confirmed appointments")
    
    # Find an appointment without an existing medical record
    test_appointment = None
    for appointment in confirmed_appointments:
        appointment_id = appointment.get('id')
        logger.info(f"Checking appointment {appointment_id} with status {appointment.get('status')}")
        medical_record_exists = appointment.get('medical_record') is not None
        if not medical_record_exists and appointment.get('status') == 'CONFIRMED':
            test_appointment = appointment
            break
    
    if not test_appointment:
        logger.warning("Could not find a confirmed appointment without a medical record. Using first available.")
        test_appointment = confirmed_appointments[0]
    
    appointment_id = test_appointment.get('id')
    logger.info(f"Testing with appointment: {appointment_id} (Status: {test_appointment.get('status')})")
    
    appointment_details = get_appointment_details(appointment_id)
    if appointment_details:
        logger.info(f"Appointment details: {json.dumps(appointment_details, indent=2)}")
    
    # Test Case 1: Create medical record
    start_time = time.time()
    create_response = create_medical_record(appointment_id)
    test_results.append(add_test_result("Create Medical Record (POST /ehr/records/)", create_response, pdf, start_time))
    
    # Test Case 2: Get or create medical record
    start_time = time.time()
    get_create_response = get_or_create_medical_record(appointment_id)
    test_results.append(add_test_result("Get/Create Medical Record (GET /ehr/appointment/{id}/)", get_create_response, pdf, start_time))
    
    # Add summary to PDF
    pdf.add_page()
    pdf.set_font('Helvetica', 'B', 14)
    pdf.set_fill_color(200, 220, 255)
    pdf.cell(0, 10, "Test Summary", 0, 1, 'C', fill=True)
    pdf.ln(5)
    
    # Summary table
    pdf.set_font('Helvetica', 'B', 10)
    pdf.set_fill_color(240, 240, 240)
    pdf.cell(60, 8, "Test Name", 1, 0, 'C', fill=True)
    pdf.cell(30, 8, "Result", 1, 0, 'C', fill=True)
    pdf.cell(30, 8, "Status Code", 1, 0, 'C', fill=True)
    pdf.cell(30, 8, "Duration (s)", 1, 1, 'C', fill=True)
    
    pdf.set_font('Helvetica', '', 9)
    for test in test_results:
        pdf.cell(60, 8, test["name"], 1, 0)
        if test["result"] == "PASSED":
            pdf.set_text_color(0, 128, 0)
        else:
            pdf.set_text_color(200, 0, 0)
        pdf.cell(30, 8, test["result"], 1, 0, 'C')
        pdf.set_text_color(0, 0, 0)
        pdf.cell(30, 8, test["status_code"], 1, 0, 'C')
        pdf.cell(30, 8, f"{test['duration']:.2f}", 1, 1, 'C')
    
    # Overall result
    all_passed = all(test["result"] == "PASSED" for test in test_results)
    pdf.ln(10)
    pdf.set_font('Helvetica', 'B', 12)
    pdf.cell(30, 8, "Overall Result: ")
    if all_passed:
        pdf.set_text_color(0, 128, 0)
        result_text = "ALL TESTS PASSED"
    else:
        pdf.set_text_color(200, 0, 0)
        result_text = "SOME TESTS FAILED"
    pdf.cell(0, 8, result_text, 0, 1)
    pdf.set_text_color(0, 0, 0)
    
    # Logout
    session.post(f"{BASE_URL}/auth/logout/")
    logger.info("Tests completed and logged out")
    
    # Save PDF
    pdf.output("medical_record_test_report.pdf")
    print("\nPDF report saved as 'medical_record_test_report.pdf'")

if __name__ == "__main__":
    run_tests()