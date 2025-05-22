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
        self.cell(0, 10, 'Account Management Test Report', 0, 1, 'C')
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
pdf.cell(0, 10, 'Account Management API Test Results', 0, 1, 'C')
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

# Test 2: Login as Admin
def test_admin_login():
    data = {
        "email": "itsparajulibigyan@gmail.com",  # Change to your admin email
        "password": "astro098"   # Change to your admin password
    }
    response = session.post(f"{BASE_URL}/auth/login/", json=data)
    status = add_test_result("Admin Login", response, pdf)
    return status == 200

# Test 3: Get User List (Admin only)
def test_get_user_list():
    response = session.get(f"{BASE_URL}/auth/admin/users/")
    status = add_test_result("Get User List", response, pdf)
    
    # Save a user ID for later tests if available
    try:
        users = response.json()
        if users and len(users) > 0:
            # Find a patient user to test with
            for user in users:
                if user.get('role') == 'PATIENT':
                    session.headers.update({'test_user_id': str(user['id'])})
                    break
            
            # If no patient found, just use the first user
            if 'test_user_id' not in session.headers and len(users) > 0:
                session.headers.update({'test_user_id': str(users[0]['id'])})
    except:
        pass
    
    return status == 200

# Test 4: Get User Detail
def test_get_user_detail():
    # Use the user ID saved from previous test or a default
    user_id = session.headers.get('test_user_id', '1')
    
    response = session.get(f"{BASE_URL}/auth/admin/users/{user_id}/")
    status = add_test_result("Get User Detail", response, pdf)
    return status == 200

# Test 5: Register New Staff (Doctor)
def test_register_staff():
    timestamp = int(time.time())
    data = {
        "email": f"test.doctor.{timestamp}@example.com",
        "password": "StaffPass123!",
        "first_name": "Test",
        "last_name": "Doctor",
        "role": "DOCTOR",
        "license_number": f"DC{timestamp}",
        "specialty": "General Medicine"
    }
    
    response = session.post(f"{BASE_URL}/auth/admin/register-staff/", json=data)
    status = add_test_result("Register Staff (Doctor)", response, pdf)
    
    # Save the doctor ID for verification test
    try:
        if status == 201:
            doctor_id = response.json()['user']['id']
            session.headers.update({'test_doctor_id': str(doctor_id)})
    except:
        pass
        
    return status == 201

# Test 6: Verify Staff
def test_verify_staff():
    # Use the doctor ID from the previous test
    doctor_id = session.headers.get('test_doctor_id')
    
    if not doctor_id:
        # Skip this test if no doctor ID
        print("Skipping staff verification test - no doctor ID available")
        return False
    
    data = {
        "staff_id": int(doctor_id)
    }
    
    response = session.post(f"{BASE_URL}/auth/admin/verify-staff/", json=data)
    status = add_test_result("Verify Staff", response, pdf)
    return status == 200

# Test 7: Get Doctor List (Public)
def test_get_doctor_list():
    response = session.get(f"{BASE_URL}/auth/doctors/")
    status = add_test_result("Get Doctor List", response, pdf)
    
    # Save a doctor ID for further tests
    try:
        doctors = response.json()
        if doctors and len(doctors) > 0:
            session.headers.update({'public_doctor_id': str(doctors[0]['id'])})
    except:
        pass
        
    return status == 200

# Test 8: Get Doctor Detail (Public)
def test_get_doctor_detail():
    # Use the doctor ID from previous test or a default
    doctor_id = session.headers.get('public_doctor_id', 
                   session.headers.get('test_doctor_id', '1'))
    
    response = session.get(f"{BASE_URL}/auth/doctors/{doctor_id}/")
    status = add_test_result("Get Doctor Detail", response, pdf)
    return status == 200

# Test 9: Get Specialties List
def test_get_specialties():
    response = session.get(f"{BASE_URL}/auth/specialties/")
    status = add_test_result("Get Specialties List", response, pdf)
    return status == 200

# Test 10: Logout
def test_logout():
    response = session.post(f"{BASE_URL}/auth/logout/")
    status = add_test_result("Logout", response, pdf)
    return status in [200, 205]

# Run all tests
def run_all_tests():
    print("Starting Account Management Tests...")
    
    # First, set up authentication
    csrf_result = test_get_csrf()
    admin_login_result = test_admin_login()
    
    # Skip tests that require admin login if login failed
    if admin_login_result:
        user_list_result = test_get_user_list()
        user_detail_result = test_get_user_detail()
        register_staff_result = test_register_staff()
        verify_staff_result = test_verify_staff()
    else:
        user_list_result = False
        user_detail_result = False
        register_staff_result = False
        verify_staff_result = False
    
    # Public endpoints should work regardless of login
    doctor_list_result = test_get_doctor_list()
    doctor_detail_result = test_get_doctor_detail()
    specialties_result = test_get_specialties()
    
    # Finally, logout
    if admin_login_result:
        logout_result = test_logout()
    else:
        logout_result = False
    
    # Print summary
    print("\n=== TEST SUMMARY ===")
    print(f"CSRF Token: {'PASSED' if csrf_result else 'FAILED'}")
    print(f"Admin Login: {'PASSED' if admin_login_result else 'FAILED'}")
    print(f"User List: {'PASSED' if user_list_result else 'FAILED'}")
    print(f"User Detail: {'PASSED' if user_detail_result else 'FAILED'}")
    print(f"Register Staff: {'PASSED' if register_staff_result else 'FAILED'}")
    print(f"Verify Staff: {'PASSED' if verify_staff_result else 'FAILED'}")
    print(f"Doctor List: {'PASSED' if doctor_list_result else 'FAILED'}")
    print(f"Doctor Detail: {'PASSED' if doctor_detail_result else 'FAILED'}")
    print(f"Specialties List: {'PASSED' if specialties_result else 'FAILED'}")
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
    pdf.output("account_test_report.pdf")
    print("\nPDF report saved as 'account_test_report.pdf'")

if __name__ == "__main__":
    run_all_tests()