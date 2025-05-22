import requests
import time
import json
import datetime
from fpdf import FPDF

# Base URL
BASE_URL = 'http://localhost:8000'

# API Path - Updated to match your actual API path
API_PATH = 'communication'  # This matches your main URL configuration

# Create a session to maintain cookies
session = requests.Session()

# Create a PDF class
class PDF(FPDF):
    def header(self):
        # Logo
        self.set_font('Arial', 'B', 15)
        self.cell(0, 10, 'Communication System Test Report', 0, 1, 'C')
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
pdf.cell(0, 10, 'Communication API Test Results', 0, 1, 'C')
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

# Setup: Login as doctor and patient
doctor_email = "sujan@gmail.com"
doctor_password = "astro098"
patient_email = "patient@gmail.com" 
patient_password = "astro098"

def setup_login(email, password):
    data = {
        "email": email,
        "password": password
    }
    response = session.post(f"{BASE_URL}/auth/login/", json=data)
    print(f"Login response status: {response.status_code}")
    if response.status_code != 200:
        try:
            print(f"Login error: {response.json()}")
        except:
            print(f"Login response text: {response.text[:200]}")
    return response.status_code == 200

# Test 1: Get RTM Token
def test_get_rtm_token():
    response = session.get(f"{BASE_URL}/{API_PATH}/get_rtm_token/")
    status = add_test_result("Get RTM Token", response, pdf)
    return status == 200

# Test 2: Get Chat Partners
def test_get_chat_partners():
    response = session.get(f"{BASE_URL}/{API_PATH}/get_chat_partners/")
    status = add_test_result("Get Chat Partners", response, pdf)
    return status == 200, response.json() if status == 200 else []

# Test 3: Get Chat Channel
def test_get_chat_channel(partner_id):
    data = {
        "target_user_id": partner_id
    }
    response = session.post(f"{BASE_URL}/{API_PATH}/get_chat_channel/", json=data)
    status = add_test_result("Get Chat Channel", response, pdf)
    return status == 200

# Test 4: Get Messages
def test_get_messages(partner_id):
    response = session.get(f"{BASE_URL}/{API_PATH}/get_messages/?target_user_id={partner_id}")
    status = add_test_result("Get Messages", response, pdf)
    return status == 200

# Test 5: Send Message
def test_send_message(partner_id):
    data = {
        "recipient_id": partner_id,
        "content": f"Test message sent at {datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')}"
    }
    response = session.post(f"{BASE_URL}/{API_PATH}/send_message/", json=data)
    status = add_test_result("Send Message", response, pdf)
    return status == 201

# Test 6: Start Video Call
def test_start_video_call(partner_id):
    data = {
        "target_user_id": partner_id
    }
    response = session.post(f"{BASE_URL}/{API_PATH}/start_video_call/", json=data)
    status = add_test_result("Start Video Call", response, pdf)
    return status == 200

# Run all tests
def run_all_tests():
    print("Starting Communication System Tests...")
    
    # Print the API URLs we're testing
    print(f"Using API URL base: {BASE_URL}/{API_PATH}/")
    
    # Try to get csrf token to ensure we have proper cookies
    try:
        csrf_response = session.get(f"{BASE_URL}/auth/csrf/")
        if csrf_response.status_code == 200:
            print("Successfully got CSRF token")
        else:
            print(f"Warning: CSRF request returned status {csrf_response.status_code}")
    except Exception as e:
        print(f"Error fetching CSRF token: {str(e)}")
    
    # First login as patient
    print("\nLogging in as patient...")
    patient_login = setup_login(patient_email, patient_password)
    
    if not patient_login:
        print("Failed to login as patient. Tests cannot continue.")
        pdf.set_font('Arial', 'B', 12)
        pdf.set_text_color(255, 0, 0)
        pdf.cell(0, 10, "SETUP FAILED: Could not login as patient", 0, 1)
        pdf.set_text_color(0, 0, 0)
        return
    
    # Test as patient
    rtm_token_result = test_get_rtm_token()
    chat_partners_result, partners = test_get_chat_partners()
    
    # If we have partners, test the rest of the functionality
    if chat_partners_result and partners:
        partner_id = partners[0]['id']
        channel_result = test_get_chat_channel(partner_id)
        messages_result = test_get_messages(partner_id)
        send_message_result = test_send_message(partner_id)
        video_call_result = test_start_video_call(partner_id)
    else:
        pdf.set_font('Arial', '', 10)
        pdf.set_text_color(255, 0, 0)
        pdf.cell(0, 10, "WARNING: No chat partners found for patient. Some tests skipped.", 0, 1)
        pdf.set_text_color(0, 0, 0)
        channel_result = False
        messages_result = False
        send_message_result = False
        video_call_result = False
    
    # Logout patient
    session.post(f"{BASE_URL}/auth/logout/")
    
    # Login as doctor
    print("\nLogging in as doctor...")
    doctor_login = setup_login(doctor_email, doctor_password)
    
    if not doctor_login:
        print("Failed to login as doctor. Doctor tests cannot continue.")
        pdf.set_font('Arial', 'B', 12)
        pdf.set_text_color(255, 0, 0)
        pdf.cell(0, 10, "SETUP FAILED: Could not login as doctor", 0, 1)
        pdf.set_text_color(0, 0, 0)
    else:
        # Run basic tests as doctor
        doctor_rtm_token_result = test_get_rtm_token()
        doctor_chat_partners_result, doctor_partners = test_get_chat_partners()
        
        # If we have partners, test functionality
        if doctor_chat_partners_result and doctor_partners:
            doctor_partner_id = doctor_partners[0]['id']
            doctor_channel_result = test_get_chat_channel(doctor_partner_id)
            doctor_messages_result = test_get_messages(doctor_partner_id)
            doctor_send_message_result = test_send_message(doctor_partner_id)
        else:
            pdf.set_font('Arial', '', 10)
            pdf.set_text_color(255, 0, 0)
            pdf.cell(0, 10, "WARNING: No chat partners found for doctor. Some tests skipped.", 0, 1)
            pdf.set_text_color(0, 0, 0)
            doctor_channel_result = False
            doctor_messages_result = False
            doctor_send_message_result = False
        
        # Logout doctor
        session.post(f"{BASE_URL}/auth/logout/")
    
    # Print summary
    print("\n=== TEST SUMMARY ===")
    print(f"Patient RTM Token: {'PASSED' if rtm_token_result else 'FAILED'}")
    print(f"Patient Chat Partners: {'PASSED' if chat_partners_result else 'FAILED'}")
    print(f"Patient Get Channel: {'PASSED' if channel_result else 'SKIPPED/FAILED'}")
    print(f"Patient Get Messages: {'PASSED' if messages_result else 'SKIPPED/FAILED'}")
    print(f"Patient Send Message: {'PASSED' if send_message_result else 'SKIPPED/FAILED'}")
    print(f"Patient Start Video Call: {'PASSED' if video_call_result else 'SKIPPED/FAILED'}")
    if doctor_login:
        print(f"Doctor RTM Token: {'PASSED' if doctor_rtm_token_result else 'FAILED'}")
        print(f"Doctor Chat Partners: {'PASSED' if doctor_chat_partners_result else 'FAILED'}")
        print(f"Doctor Get Channel: {'PASSED' if doctor_channel_result else 'SKIPPED/FAILED'}")
        print(f"Doctor Get Messages: {'PASSED' if doctor_messages_result else 'SKIPPED/FAILED'}")
        print(f"Doctor Send Message: {'PASSED' if doctor_send_message_result else 'SKIPPED/FAILED'}")
    
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
    pdf.output("communication_test_report.pdf")
    print("\nPDF report saved as 'communication_test_report.pdf'")

if __name__ == "__main__":
    run_all_tests()