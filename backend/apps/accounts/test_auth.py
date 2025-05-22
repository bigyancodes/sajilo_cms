import requests
import time
import json
import datetime
from fpdf import FPDF

# Base URL
BASE_URL = 'http://localhost:8000'

# Create a session to maintain cookies
session = requests.Session()

# Create a PDF class
class PDF(FPDF):
    def header(self):
        # Logo
        self.set_font('Arial', 'B', 15)
        self.cell(0, 10, 'Authentication System Test Report', 0, 1, 'C')
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
pdf.cell(0, 10, 'Authentication API Test Results', 0, 1, 'C')
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

# Test 1: Get CSRF Token
def test_get_csrf():
    response = session.get(f"{BASE_URL}/auth/csrf/")
    status = add_test_result("Get CSRF Token", response, pdf)
    return status == 200

# Test 2: Register Patient
def test_register_patient():
    email = f"test.patient.{int(time.time())}@gmail.com"
    data = {
        "email": email,
        "password": "SecurePass123!",
        "first_name": "Test",
        "last_name": "Patient"
    }
    response = session.post(f"{BASE_URL}/auth/register/", json=data)
    status = add_test_result("Register Patient", response, pdf)
    return status == 201, email

# Test 3: Login
def test_login(email):
    data = {
        "email": email,
        "password": "SecurePass123!"
    }
    response = session.post(f"{BASE_URL}/auth/login/", json=data)
    status = add_test_result("Login", response, pdf)
    return status == 200

# Test 4: Get Profile
def test_get_profile():
    response = session.get(f"{BASE_URL}/auth/profile/")
    status = add_test_result("Get Profile", response, pdf)
    return status == 200

# Test 5: Logout
def test_logout():
    response = session.post(f"{BASE_URL}/auth/logout/")
    status = add_test_result("Logout", response, pdf)
    return status in [200, 205]  # Accept both common success status codes

# Run all tests
def run_all_tests():
    print("Starting Auth System Tests...")
    csrf_result = test_get_csrf()
    registration_result, email = test_register_patient()
    if registration_result:
        login_result = test_login(email)
        if login_result:
            profile_result = test_get_profile()
            logout_result = test_logout()
        else:
            profile_result = False
            logout_result = False
    else:
        login_result = False
        profile_result = False
        logout_result = False
    
    # Print summary
    print("\n=== TEST SUMMARY ===")
    print(f"CSRF Token: {'PASSED' if csrf_result else 'FAILED'}")
    print(f"Register: {'PASSED' if registration_result else 'FAILED'}")
    print(f"Login: {'PASSED' if login_result else 'FAILED'}")
    print(f"Get Profile: {'PASSED' if profile_result else 'FAILED'}")
    print(f"Logout: {'PASSED' if logout_result else 'FAILED'}")
    
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
    pdf.output("auth_test_report.pdf")
    print("\nPDF report saved as 'auth_test_report.pdf'")

if __name__ == "__main__":
    run_all_tests()