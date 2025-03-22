from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
from django.db import models
from django.utils.translation import gettext_lazy as _
import uuid

def profile_photo_path(instance, filename):
    """Generate a unique file path for profile photos."""
    ext = filename.split('.')[-1]
    filename = f"{uuid.uuid4()}.{ext}"
    return f'profile_photos/{filename}'

class UserRoles(models.TextChoices):
    ADMIN = "ADMIN", _("Admin")
    PATIENT = "PATIENT", _("Patient")
    RECEPTIONIST = "RECEPTIONIST", _("Receptionist")
    DOCTOR = "DOCTOR", _("Doctor")
    PHARMACIST = "PHARMACIST", _("Pharmacist")

class CustomUserManager(BaseUserManager):
    def create_user(self, email, role=UserRoles.PATIENT, password=None, **extra_fields):
        """Create and save a regular user with the given email and password."""
        if not email:
            raise ValueError(_("Email is required"))

        email = self.normalize_email(email)
        extra_fields.setdefault("is_verified", False)

        role = role.upper()
        if role not in UserRoles.values:
            raise ValueError(_("Invalid role selection"))

        user = self.model(email=email, role=role, **extra_fields)
        if password:
            user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        """Create and save a superuser with the given email and password."""
        email = self.normalize_email(email)
        extra_fields.setdefault("role", UserRoles.ADMIN)
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        extra_fields.setdefault("is_verified", True)

        if extra_fields.get("role") != UserRoles.ADMIN:
            raise ValueError(_("Superuser must have role='ADMIN'"))

        return self.create_user(email, password=password, **extra_fields)

class CustomUser(AbstractBaseUser, PermissionsMixin):
    email = models.EmailField(unique=True, max_length=255, db_index=True)
    first_name = models.CharField(max_length=50, blank=True, null=True)
    last_name = models.CharField(max_length=50, blank=True, null=True)
    profile_photo = models.ImageField(
        upload_to=profile_photo_path,
        null=True,
        blank=True,
        default=None
    )
    role = models.CharField(
        max_length=15,
        choices=UserRoles.choices,
        default=UserRoles.PATIENT,
        db_index=True
    )
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)
    is_verified = models.BooleanField(default=False)
    date_joined = models.DateTimeField(auto_now_add=True)

    objects = CustomUserManager()

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = ["role"]

    class Meta:
        indexes = [models.Index(fields=['email', 'role'])]

    def __str__(self):
        return f"{self.first_name or ''} {self.last_name or ''} - {self.role}"

    def get_full_name(self):
        """Return the user's full name, with a space in between."""
        return f"{self.first_name or ''} {self.last_name or ''}".strip()

class DoctorProfile(models.Model):
    user = models.OneToOneField(
        CustomUser,
        on_delete=models.CASCADE,
        related_name='doctor_profile'
    )
    license_number = models.CharField(max_length=100, unique=True, db_index=True)
    specialty = models.CharField(max_length=100, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Dr. {self.user.last_name} ({self.specialty})"