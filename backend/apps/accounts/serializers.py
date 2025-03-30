# apps/accounts/serializers.py
from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import UserRoles, DoctorProfile

User = get_user_model()

class CustomUserSerializer(serializers.ModelSerializer):
    """Serializer for basic user data, used for patients and profile updates."""
    profile_photo = serializers.ImageField(required=False, allow_null=True, write_only=True)
    profile_photo_url = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = User
        fields = [
            "id", "email", "first_name", "last_name", "role", "is_verified",
            "is_active", "date_joined", "profile_photo", "profile_photo_url", "password"
        ]
        extra_kwargs = {
            "password": {"write_only": True},
            "role": {"read_only": True},
        }

    def get_profile_photo_url(self, obj):
        """Return the full URL of the profile photo if it exists."""
        if obj.profile_photo and hasattr(obj.profile_photo, 'url'):
            return self.context['request'].build_absolute_uri(obj.profile_photo.url)
        return None

    def create(self, validated_data):
        """Create a new user with optional profile photo and password."""
        profile_photo = validated_data.pop('profile_photo', None)
        password = validated_data.pop('password', None)
        user = User(**validated_data)
        if password:
            user.set_password(password)
        if profile_photo:
            user.profile_photo = profile_photo
        user.save()
        return user

    def update(self, instance, validated_data):
        """Update an existing user, handling profile photo and password separately."""
        profile_photo = validated_data.pop('profile_photo', None)
        password = validated_data.pop('password', None)
        instance = super().update(instance, validated_data)
        if password:
            instance.set_password(password)
            instance.save()
        if profile_photo:
            instance.profile_photo = profile_photo
            instance.save()
        return instance

class DoctorProfileSerializer(serializers.ModelSerializer):
    """Serializer for DoctorProfile, used for detailed doctor data."""
    full_name = serializers.SerializerMethodField()

    class Meta:
        model = DoctorProfile
        fields = ['license_number', 'specialty', 'created_at', 'full_name']

    def get_full_name(self, obj):
        """Return the doctor's full name from the associated user."""
        return obj.user.get_full_name()

class StaffUserSerializer(CustomUserSerializer):
    """Serializer for staff registration, including doctor-specific fields."""
    license_number = serializers.CharField(write_only=True, required=False, allow_blank=True)
    specialty = serializers.CharField(write_only=True, required=False, allow_blank=True)

    class Meta(CustomUserSerializer.Meta):
        fields = CustomUserSerializer.Meta.fields + ['license_number', 'specialty']
        extra_kwargs = {
            **CustomUserSerializer.Meta.extra_kwargs,
            "role": {"required": True, "read_only": False}
        }

    def validate(self, data):
        """Validate staff-specific fields based on role."""
        role = data.get('role')
        license_number = data.get('license_number', '').strip()
        specialty = data.get('specialty', '').strip()

        if role == UserRoles.DOCTOR:
            if not license_number:
                raise serializers.ValidationError({"license_number": "This field is required for doctors."})
            if not specialty:
                raise serializers.ValidationError({"specialty": "This field is required for doctors."})
            # Case-insensitive uniqueness check for license_number
            if DoctorProfile.objects.filter(license_number__iexact=license_number).exclude(user=data.get('user')).exists():
                raise serializers.ValidationError({"license_number": "This license number is already in use."})
        elif role in [UserRoles.ADMIN, UserRoles.PATIENT, UserRoles.RECEPTIONIST, UserRoles.PHARMACIST]:
            data.pop('license_number', None)
            data.pop('specialty', None)

        return super().validate(data)

    def create(self, validated_data):
        """Create a staff user and associated DoctorProfile if applicable."""
        license_number = validated_data.pop('license_number', None)
        specialty = validated_data.pop('specialty', None)
        user = super().create(validated_data)
        if user.role == UserRoles.DOCTOR:
            DoctorProfile.objects.create(
                user=user,
                license_number=license_number,
                specialty=specialty
            )
        return user

class AdminUserSerializer(CustomUserSerializer):
    """Serializer for admin user management, including nested DoctorProfile data conditionally."""
    doctor_profile = serializers.SerializerMethodField(read_only=True)

    class Meta(CustomUserSerializer.Meta):
        fields = CustomUserSerializer.Meta.fields + ['doctor_profile']
        extra_kwargs = {
            **CustomUserSerializer.Meta.extra_kwargs,
            "role": {"read_only": False},
            "email": {"read_only": True},
            "password": {"required": False},
        }

    def get_doctor_profile(self, obj):
        """Return DoctorProfile data only if the user is a doctor."""
        if obj.role == UserRoles.DOCTOR and hasattr(obj, 'doctor_profile'):
            return DoctorProfileSerializer(obj.doctor_profile, context=self.context).data
        return None

    def validate(self, data):
        """Validate doctor-specific fields when role is DOCTOR."""
        role = data.get('role')
        if role == UserRoles.DOCTOR:
            # For updates, doctor_profile data might come from the frontend
            doctor_profile_data = self.context['request'].data.get('doctor_profile', {})
            license_number = doctor_profile_data.get('license_number', '').strip()
            specialty = doctor_profile_data.get('specialty', '').strip()

            if not license_number:
                raise serializers.ValidationError({"doctor_profile": {"license_number": "This field is required for doctors."}})
            if not specialty:
                raise serializers.ValidationError({"doctor_profile": {"specialty": "This field is required for doctors."}})
            # Case-insensitive uniqueness check for license_number
            if DoctorProfile.objects.filter(license_number__iexact=license_number).exclude(user=self.instance).exists():
                raise serializers.ValidationError({"doctor_profile": {"license_number": "This license number is already in use."}})
        return data

    def update(self, instance, validated_data):
        """Update user and DoctorProfile, deleting profile if role changes from DOCTOR."""
        password = validated_data.pop('password', None)
        instance = super().update(instance, validated_data)
        if password:
            instance.set_password(password)
            instance.save()
        if instance.role == UserRoles.DOCTOR:
            doctor_profile_data = self.context['request'].data.get('doctor_profile', {})
            DoctorProfile.objects.update_or_create(
                user=instance,
                defaults={
                    'license_number': doctor_profile_data.get('license_number', ''),
                    'specialty': doctor_profile_data.get('specialty', '')
                }
            )
        else:
            if hasattr(instance, 'doctor_profile'):
                instance.doctor_profile.delete()
        return instance

class PublicDoctorSerializer(serializers.ModelSerializer):
    full_name = serializers.SerializerMethodField()
    specialty = serializers.CharField(source='doctor_profile.specialty', read_only=True, allow_null=True)
    license_number = serializers.CharField(source='doctor_profile.license_number', read_only=True, allow_null=True)

    class Meta:
        model = User
        fields = ['id', 'email', 'first_name', 'last_name', 'specialty', 'license_number', 'full_name']

    def get_full_name(self, obj):
        return obj.get_full_name()