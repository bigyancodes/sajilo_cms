# Generated by Django 5.1.7 on 2025-03-28 14:38

from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('appointment', '0001_initial'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.AddField(
            model_name='timeoff',
            name='is_approved',
            field=models.BooleanField(default=False, help_text='Approved by admin'),
        ),
        migrations.AddIndex(
            model_name='timeoff',
            index=models.Index(fields=['is_approved'], name='appointment_is_appr_dd8e40_idx'),
        ),
    ]
