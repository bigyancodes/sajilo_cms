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
        logging.FileHandler("pharmacy_clean_test.log"),
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
pharmacist_email = "alan@gmail.com"
pharmacist_password = "astro098"

# Custom PDF class for report generation
class PDF(FPDF):
    def header(self):
        self.set_font('Helvetica', 'B', 16)
        self.set_text_color(0, 51, 102)  # Dark blue
        self.cell(0, 10, 'Pharmacy System Test Report', 0, 1, 'C')
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
        self.cell(0, 10, f'Page {self.page_no()} | Pharmacy System Testing', 0, 0, 'C')

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
        return response
    except requests.exceptions.RequestException as e:
        logger.error(f"Login failed: {str(e)}")
        if hasattr(e, 'response'):
            logger.error(f"Response: {e.response.text}")
        return None

def test_create_category():
    """Test creating a new category"""
    data = {
        "name": "Antibiotics Category",
        "description": "Medicines used to treat bacterial infections"
    }
    try:
        response = session.post(f"{BASE_URL}/pharmacy/categories/", json=data)
        response.raise_for_status()
        logger.info("Successfully created a new category")
        return response
    except requests.exceptions.RequestException as e:
        logger.error(f"Failed to create category: {str(e)}")
        if hasattr(e, 'response'):
            logger.error(f"Response: {e.response.text}")
        return None

def test_create_medicine(category_id):
    """Test creating a new medicine"""
    data = {
        "name": "Amoxicillin",
        "generic_name": "Amoxicillin",
        "manufacturer": "Himalayan Pharmaceuticals",
        "category": category_id,
        "dosage_form": "CAPSULE",
        "strength": "500mg",
        "unit_price": 15.50,
        "minimum_stock_level": 20,
        "prescription_required": True,
        "description": "Broad-spectrum antibiotic used to treat bacterial infections",
        "side_effects": "Nausea, vomiting, diarrhea, rash",
        "is_active": True
    }
    try:
        response = session.post(f"{BASE_URL}/pharmacy/medicines/", json=data)
        response.raise_for_status()
        logger.info("Successfully created a new medicine")
        return response
    except requests.exceptions.RequestException as e:
        logger.error(f"Failed to create medicine: {str(e)}")
        if hasattr(e, 'response'):
            logger.error(f"Response: {e.response.text}")
        return None

def test_low_stock_report():
    """Test generating a low stock report"""
    try:
        response = session.get(f"{BASE_URL}/pharmacy/reports/low-stock/")
        response.raise_for_status()
        logger.info("Successfully generated low stock report")
        return response
    except requests.exceptions.RequestException as e:
        logger.error(f"Failed to generate low stock report: {str(e)}")
        if hasattr(e, 'response'):
            logger.error(f"Response: {e.response.text}")
        return None

def run_tests():
    """Run a series of successful tests for the pharmacy system and generate a PDF report"""
    # Initialize PDF
    pdf = PDF()
    pdf.add_page()
    pdf.set_auto_page_break(auto=True, margin=15)
    
    # Add environment details
    pdf.set_font('Helvetica', 'B', 12)
    pdf.cell(0, 8, "Test Environment", 0, 1)
    pdf.set_font('Helvetica', '', 10)
    pdf.cell(0, 6, f"Base URL: {BASE_URL}", 0, 1)
    pdf.cell(0, 6, f"Patient User: {patient_email}", 0, 1)
    pdf.cell(0, 6, f"Pharmacist User: {pharmacist_email}", 0, 1)
    pdf.cell(0, 6, f"Run Time: {datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')}", 0, 1)
    pdf.ln(10)
    
    # List to store test results
    test_results = []
    
    # Test 1: Login as pharmacist (to create categories and medicines)
    start_time = time.time()
    pharmacist_login_response = setup_login(pharmacist_email, pharmacist_password)
    if not pharmacist_login_response:
        logger.error("Cannot continue tests - pharmacist login failed")
        pdf.set_font('Helvetica', 'B', 12)
        pdf.set_text_color(200, 0, 0)
        pdf.cell(0, 8, "SETUP FAILED: Could not login as pharmacist", 0, 1)
        pdf.set_text_color(0, 0, 0)
        pdf.output("pharmacy_clean_test_report.pdf")
        return
    
    test_results.append(add_test_result("Pharmacist Login", pharmacist_login_response, pdf, start_time))
    
    # Test 2: Create a category
    start_time = time.time()
    category_response = test_create_category()
    category_id = None
    if category_response:
        try:
            category_data = category_response.json()
            category_id = category_data.get('id')
            logger.info(f"Created category ID: {category_id}")
            test_results.append(add_test_result("Create Category (POST /pharmacy/categories/)", category_response, pdf, start_time))
        except json.JSONDecodeError:
            logger.error("Failed to parse category creation response")
    
    # Test 3: Create a medicine
    if category_id:
        start_time = time.time()
        medicine_response = test_create_medicine(category_id)
        if medicine_response:
            try:
                medicine_data = medicine_response.json()
                medicine_id = medicine_data.get('id')
                logger.info(f"Created medicine ID: {medicine_id}")
                test_results.append(add_test_result("Create Medicine (POST /pharmacy/medicines/)", medicine_response, pdf, start_time))
            except json.JSONDecodeError:
                logger.error("Failed to parse medicine creation response")
    
    # Test 4: Generate low stock report
    start_time = time.time()
    low_stock_response = test_low_stock_report()
    if low_stock_response:
        test_results.append(add_test_result("Generate Low Stock Report (GET /pharmacy/reports/low-stock/)", low_stock_response, pdf, start_time))
    
    # Logout pharmacist
    session.post(f"{BASE_URL}/auth/logout/")
    logger.info("Pharmacist logged out")
    
    # Test 5: Login as patient
    start_time = time.time()
    patient_login_response = setup_login(patient_email, patient_password)
    if patient_login_response:
        test_results.append(add_test_result("Patient Login", patient_login_response, pdf, start_time))
    
    # Logout patient
    session.post(f"{BASE_URL}/auth/logout/")
    logger.info("Patient logged out")
    
    # Test 6: Login as pharmacist for reports
    start_time = time.time()
    pharmacist_login_response = setup_login(pharmacist_email, pharmacist_password)
    if pharmacist_login_response:
        test_results.append(add_test_result("Pharmacist Login (Reports)", pharmacist_login_response, pdf, start_time))
    
    # Logout
    session.post(f"{BASE_URL}/auth/logout/")
    logger.info("Final logout completed")
    
    # Add summary to PDF
    pdf.add_page()
    pdf.set_font('Helvetica', 'B', 14)
    pdf.set_fill_color(200, 220, 255)
    pdf.cell(0, 10, "Test Summary", 0, 1, 'C', fill=True)
    pdf.ln(5)
    
    # Summary table with adjusted column widths
    pdf.set_font('Helvetica', 'B', 10)
    pdf.set_fill_color(240, 240, 240)
    pdf.cell(80, 8, "Test Name", 1, 0, 'C', fill=True)
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
    
    # Save PDF
    pdf.output("pharmacy_clean_test_report.pdf")
    print("\nPDF report saved as 'pharmacy_clean_test_report.pdf'")

if __name__ == "__main__":
    run_tests()