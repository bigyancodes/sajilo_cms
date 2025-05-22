import requests
import json
import logging
import datetime
import time
from fpdf import FPDF

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s',
    handlers=[
        logging.FileHandler("chatbot_debug.log"),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

# Base URL
BASE_URL = 'http://localhost:8000'

# Create a session to maintain cookies
session = requests.Session()

# Test user credentials
patient_email = "patient@gmail.com"
patient_password = "astro098"

# Custom PDF class for report generation
class PDF(FPDF):
    def header(self):
        self.set_font('Helvetica', 'B', 16)
        self.set_text_color(0, 51, 102)  # Dark blue
        self.cell(0, 10, 'Chatbot System Test Report', 0, 1, 'C')
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
        self.cell(0, 10, f'Page {self.page_no()} | Chatbot System Testing', 0, 0, 'C')

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

def test_chatbot_connection():
    """Test the chatbot connection endpoint"""
    try:
        response = session.get(f"{BASE_URL}/chatbot/test/")
        response.raise_for_status()
        logger.info("Successfully tested chatbot connection")
        return response
    except requests.exceptions.RequestException as e:
        logger.error(f"Failed to test chatbot connection: {str(e)}")
        if hasattr(e, 'response'):
            logger.error(f"Response: {e.response.text}")
        return None

def test_create_session():
    """Test creating a new chat session"""
    try:
        response = session.post(f"{BASE_URL}/chatbot/sessions/")
        response.raise_for_status()
        logger.info("Successfully created a new chat session")
        return response
    except requests.exceptions.RequestException as e:
        logger.error(f"Failed to create chat session: {str(e)}")
        if hasattr(e, 'response'):
            logger.error(f"Response: {e.response.text}")
        return None

def test_send_message(session_id=None):
    """Test sending a message to the chatbot"""
    data = {
        "message": "Hello, can you help me with my upcoming appointments?",
        "session_id": session_id
    }
    try:
        response = session.post(f"{BASE_URL}/chatbot/message/", json=data)
        response.raise_for_status()
        logger.info("Successfully sent a message to the chatbot")
        return response
    except requests.exceptions.RequestException as e:
        logger.error(f"Failed to send message: {str(e)}")
        if hasattr(e, 'response'):
            logger.error(f"Response: {e.response.text}")
        return None

def test_retrieve_session(session_id):
    """Test retrieving a specific chat session"""
    try:
        response = session.get(f"{BASE_URL}/chatbot/sessions/{session_id}/")
        response.raise_for_status()
        logger.info(f"Successfully retrieved chat session {session_id}")
        return response
    except requests.exceptions.RequestException as e:
        logger.error(f"Failed to retrieve chat session: {str(e)}")
        if hasattr(e, 'response'):
            logger.error(f"Response: {e.response.text}")
        return None

def test_delete_session(session_id):
    """Test deleting a specific chat session"""
    try:
        response = session.delete(f"{BASE_URL}/chatbot/sessions/{session_id}/")
        response.raise_for_status()
        logger.info(f"Successfully deleted chat session {session_id}")
        return response
    except requests.exceptions.RequestException as e:
        logger.error(f"Failed to delete chat session: {str(e)}")
        if hasattr(e, 'response'):
            logger.error(f"Response: {e.response.text}")
        return None

def run_tests():
    """Run a series of tests for the chatbot system and generate a PDF report"""
    # Initialize PDF
    pdf = PDF()
    pdf.add_page()
    pdf.set_auto_page_break(auto=True, margin=15)
    
    # Add environment details
    pdf.set_font('Helvetica', 'B', 12)
    pdf.cell(0, 8, "Test Environment", 0, 1)
    pdf.set_font('Helvetica', '', 10)
    pdf.cell(0, 6, f"Base URL: {BASE_URL}", 0, 1)
    pdf.cell(0, 6, f"Test User: {patient_email}", 0, 1)
    pdf.cell(0, 6, f"Run Time: {datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')}", 0, 1)
    pdf.ln(10)
    
    # List to store test results
    test_results = []
    
    # Test 1: Login as patient
    start_time = time.time()
    login_response = setup_login(patient_email, patient_password)
    if not login_response:
        logger.error("Cannot continue tests - login failed")
        pdf.set_font('Helvetica', 'B', 12)
        pdf.set_text_color(200, 0, 0)
        pdf.cell(0, 8, "SETUP FAILED: Could not login as patient", 0, 1)
        pdf.set_text_color(0, 0, 0)
        pdf.output("chatbot_test_report.pdf")
        return
    
    user_info = login_response.get('user', {})
    logger.info(f"Logged in as: {user_info.get('first_name')} {user_info.get('last_name')} (Role: {user_info.get('role')})")
    test_results.append({"name": "Patient Login", "result": "PASSED", "status_code": "200", "duration": time.time() - start_time})
    
    # Test 2: Test chatbot connection
    start_time = time.time()
    connection_response = test_chatbot_connection()
    test_results.append(add_test_result("Test Chatbot Connection (GET /chatbot/test/)", connection_response, pdf, start_time))
    
    # Test 3: Create a new chat session
    start_time = time.time()
    create_session_response = test_create_session()
    session_id = None
    if create_session_response:
        try:
            session_data = create_session_response.json()
            session_id = session_data.get('id')
            logger.info(f"Created session ID: {session_id}")
        except json.JSONDecodeError:
            logger.error("Failed to parse session creation response")
    test_results.append(add_test_result("Create Chat Session (POST /chatbot/sessions/)", create_session_response, pdf, start_time))
    
    # Test 4: Send a message to the chatbot
    if session_id:
        start_time = time.time()
        message_response = test_send_message(session_id)
        test_results.append(add_test_result("Send Message (POST /chatbot/message/)", message_response, pdf, start_time))
    else:
        logger.warning("Skipping message test due to session creation failure")
        test_results.append({
            "name": "Send Message (POST /chatbot/message/)",
            "result": "SKIPPED",
            "status_code": "N/A",
            "duration": 0
        })
    
    # Test 5: Retrieve the chat session
    if session_id:
        start_time = time.time()
        retrieve_response = test_retrieve_session(session_id)
        test_results.append(add_test_result(f"Retrieve Chat Session (GET /chatbot/sessions/{session_id}/)", retrieve_response, pdf, start_time))
    else:
        logger.warning("Skipping session retrieval test due to session creation failure")
        test_results.append({
            "name": "Retrieve Chat Session",
            "result": "SKIPPED",
            "status_code": "N/A",
            "duration": 0
        })
    
    # Test 6: Delete the chat session
    if session_id:
        start_time = time.time()
        delete_response = test_delete_session(session_id)
        test_results.append(add_test_result(f"Delete Chat Session (DELETE /chatbot/sessions/{session_id}/)", delete_response, pdf, start_time))
    else:
        logger.warning("Skipping session deletion test due to session creation failure")
        test_results.append({
            "name": "Delete Chat Session",
            "result": "SKIPPED",
            "status_code": "N/A",
            "duration": 0
        })
    
    # Add summary to PDF
    pdf.add_page()
    pdf.set_font('Helvetica', 'B', 14)
    pdf.set_fill_color(200, 220, 255)
    pdf.cell(0, 10, "Test Summary", 0, 1, 'C', fill=True)
    pdf.ln(5)
    
    # Summary table with adjusted column widths
    pdf.set_font('Helvetica', 'B', 10)
    pdf.set_fill_color(240, 240, 240)
    pdf.cell(80, 8, "Test Name", 1, 0, 'C', fill=True)  # Increased width for better readability
    pdf.cell(40, 8, "Result", 1, 0, 'C', fill=True)
    pdf.cell(30, 8, "Status Code", 1, 0, "C", fill=True)
    pdf.cell(30, 8, "Duration (s)", 1, 1, 'C', fill=True)
    
    pdf.set_font('Helvetica', '', 9)
    for test in test_results:
        pdf.cell(80, 8, test["name"], 1, 0)
        if test["result"] == "PASSED":
            pdf.set_text_color(0, 128, 0)
        elif test["result"] == "SKIPPED":
            pdf.set_text_color(255, 165, 0)  # Orange for skipped tests
        else:
            pdf.set_text_color(200, 0, 0)
        pdf.cell(40, 8, test["result"], 1, 0, 'C')
        pdf.set_text_color(0, 0, 0)
        pdf.cell(30, 8, test["status_code"], 1, 0, 'C')
        pdf.cell(30, 8, f"{test['duration']:.2f}", 1, 1, 'C')
    
    # Overall result
    all_passed = all(test["result"] == "PASSED" for test in test_results if test["result"] != "SKIPPED")
    pdf.ln(10)
    pdf.set_font('Helvetica', 'B', 12)
    pdf.cell(30, 8, "Overall Result: ")
    if all_passed:
        pdf.set_text_color(0, 128, 0)
        result_text = "ALL TESTS PASSED"
    else:
        pdf.set_text_color(200, 0, 0)
        result_text = "SOME TESTS FAILED OR SKIPPED"
    pdf.cell(0, 8, result_text, 0, 1)
    pdf.set_text_color(0, 0, 0)
    
    # Logout
    session.post(f"{BASE_URL}/auth/logout/")
    logger.info("Tests completed and logged out")
    
    # Save PDF
    pdf.output("chatbot_test_report.pdf")
    print("\nPDF report saved as 'chatbot_test_report.pdf'")

if __name__ == "__main__":
    run_tests()