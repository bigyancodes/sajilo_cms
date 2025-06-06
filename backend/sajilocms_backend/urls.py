"""
URL configuration for sajilocms_backend project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/5.1/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path('admin/', admin.site.urls),
    path('auth/', include('apps.accounts.urls')),
    path('appointment/', include('apps.appointment.urls')),
    path('ehr/', include('apps.ehr.urls')),
    path('communication/', include('apps.communication.urls')),
    path('chatbot/', include('apps.chatbot.urls')),
    path('api/pharmacy/', include('apps.pharmacy.urls', namespace='pharmacy')),
]
