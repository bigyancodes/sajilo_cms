from rest_framework import serializers
from .models import Medicine, Order, OrderMedicine, Billing, StockTransaction, AuditLog
from apps.accounts.models import CustomUser, UserRoles
from apps.accounts.serializers import CustomUserSerializer
from apps.ehr.models import Prescription
from django.utils import timezone

class MedicineSerializer(serializers.ModelSerializer):
    is_expired = serializers.BooleanField(read_only=True)
    
    class Meta:
        model = Medicine
        fields = [
            'id', 'name', 'generic_name', 'description', 'manufacturer',
            'manufacture_date', 'expiration_date', 'price', 'stock_quantity',
            'low_stock_threshold', 'category', 'barcode', 'created_at', 'updated_at',
            'is_expired'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'is_expired']

    def validate(self, data):
        # Trim string fields
        for field in ['name', 'generic_name', 'description', 'manufacturer', 'category', 'barcode']:
            if field in data and data[field]:
                data[field] = data[field].strip()

        # Validate manufacture_date is not after expiration_date
        if data.get('manufacture_date') and data.get('expiration_date'):
            if data['manufacture_date'] > data['expiration_date']:
                raise serializers.ValidationError({
                    'manufacture_date': 'Manufacture date cannot be after expiration date'
                })
        
        # Validate stock_quantity is not negative
        if 'stock_quantity' in data and data['stock_quantity'] < 0:
            raise serializers.ValidationError({
                'stock_quantity': 'Stock quantity cannot be negative'
            })
        
        # Validate price is not negative
        if 'price' in data and data['price'] < 0:
            raise serializers.ValidationError({
                'price': 'Price cannot be negative'
            })

        # Validate dates are not in the past
        today = timezone.now().date()
        if data.get('manufacture_date') and data['manufacture_date'] > today:
            raise serializers.ValidationError({
                'manufacture_date': 'Manufacture date cannot be in the future'
            })
        
        if data.get('expiration_date') and data['expiration_date'] < today:
            raise serializers.ValidationError({
                'expiration_date': 'Expiration date cannot be in the past'
            })

        # Validate required fields
        required_fields = ['name', 'manufacturer', 'manufacture_date', 'expiration_date', 'price']
        for field in required_fields:
            if not data.get(field):
                raise serializers.ValidationError({
                    field: f'{field.replace("_", " ").title()} is required'
                })
        
        return data

    def create(self, validated_data):
        try:
            # Ensure barcode is unique if provided
            if validated_data.get('barcode'):
                if Medicine.objects.filter(barcode=validated_data['barcode']).exists():
                    raise serializers.ValidationError({
                        'barcode': 'A medicine with this barcode already exists'
                    })
            return super().create(validated_data)
        except Exception as e:
            raise serializers.ValidationError(str(e))

    def update(self, instance, validated_data):
        try:
            # Check barcode uniqueness if being updated
            if validated_data.get('barcode'):
                existing = Medicine.objects.filter(barcode=validated_data['barcode']).exclude(id=instance.id).first()
                if existing:
                    raise serializers.ValidationError({
                        'barcode': 'A medicine with this barcode already exists'
                    })
            return super().update(instance, validated_data)
        except Exception as e:
            raise serializers.ValidationError(str(e))

class PrescriptionSerializer(serializers.ModelSerializer):
    medicine = MedicineSerializer(read_only=True)
    medical_record = serializers.StringRelatedField(read_only=True)
    class Meta:
        model = Prescription
        fields = [
            'id', 'medical_record', 'medicine', 'quantity', 'dosage',
            'frequency', 'duration', 'instructions', 'fulfillment_status',
            'created_at'
        ]
        read_only_fields = ['id', 'created_at', 'fulfillment_status']

class OrderMedicineSerializer(serializers.ModelSerializer):
    medicine = MedicineSerializer(read_only=True)
    prescription = PrescriptionSerializer(read_only=True)
    medicine_id = serializers.PrimaryKeyRelatedField(
        queryset=Medicine.objects.all(),
        source='medicine',
        write_only=True
    )
    prescription_id = serializers.PrimaryKeyRelatedField(
        queryset=Prescription.objects.all(),
        source='prescription',
        write_only=True,
        required=False,
        allow_null=True
    )

    class Meta:
        model = OrderMedicine
        fields = ['medicine', 'medicine_id', 'quantity', 'prescription', 'prescription_id']
        read_only_fields = ['medicine', 'prescription']

class OrderSerializer(serializers.ModelSerializer):
    patient = CustomUserSerializer(read_only=True)
    medicines = OrderMedicineSerializer(many=True, read_only=True)
    patient_id = serializers.PrimaryKeyRelatedField(
        queryset=CustomUser.objects.filter(role=UserRoles.PATIENT),
        source='patient',
        write_only=True
    )

    class Meta:
        model = Order
        fields = [
            'id', 'patient', 'patient_id', 'medicines', 'status',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'status']

    def create(self, validated_data):
        patient = validated_data.pop('patient')
        order = Order.objects.create(patient=patient)
        return order

class BillingSerializer(serializers.ModelSerializer):
    order = OrderSerializer(read_only=True)
    class Meta:
        model = Billing
        fields = [
            'id', 'order', 'total_amount', 'payment_status', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'total_amount', 'created_at', 'updated_at']

class StockTransactionSerializer(serializers.ModelSerializer):
    medicine = MedicineSerializer(read_only=True)
    performed_by = CustomUserSerializer(read_only=True)
    class Meta:
        model = StockTransaction
        fields = [
            'id', 'medicine', 'transaction_type', 'quantity', 'reason',
            'performed_by', 'created_at'
        ]
        read_only_fields = ['id', 'created_at', 'performed_by']

class AuditLogSerializer(serializers.ModelSerializer):
    performed_by = CustomUserSerializer(read_only=True)
    class Meta:
        model = AuditLog
        fields = [
            'id', 'action', 'model_name', 'object_id', 'performed_by',
            'details', 'timestamp', 'ip_address', 'user_agent'
        ]
        read_only_fields = fields