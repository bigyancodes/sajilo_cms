# accounts/urls.py
from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView, TokenVerifyView
from . import views

app_name = "accounts"

urlpatterns = [
    # CSRF Token
    path("csrf/", views.get_csrf_token, name="get_csrf_token"),
    
    # Authentication
    path("login/", views.CustomLoginView.as_view(), name="login"),
    path("login/google/", views.google_login, name="google_login"),
    path("logout/", views.custom_logout_view, name="logout"),
    path("register/", views.CustomRegisterView.as_view(), name="register"),
    path("profile/", views.UserProfileView.as_view(), name="profile"),
    
    # JWT Token Management
    path("token/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    path("token/verify/", TokenVerifyView.as_view(), name="token_verify"),
    
    # Admin Routes
    path("admin/users/", views.UserListView.as_view(), name="user_list"),
    path("admin/users/<int:pk>/", views.AdminUserDetailView.as_view(), name="user_detail"),
    path("admin/register-staff/", views.RegisterStaffView.as_view(), name="register_staff"),
    path("admin/verify-staff/", views.VerifyStaffView.as_view(), name="verify_staff"),
    
    # Doctor Routes
    path("doctors/", views.DoctorListView.as_view(), name="doctor_list"),
    path("doctors/<int:pk>/", views.DoctorDetailView.as_view(), name="doctor_detail"),
    path("specialties/", views.SpecialtyListView.as_view(), name="specialty_list"),
]