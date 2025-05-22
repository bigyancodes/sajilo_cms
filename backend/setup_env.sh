#!/bin/bash

# Activate virtual environment
source env/bin/activate

# Install required packages
pip install Django==5.1.7
pip install django-cors-headers==4.7.0
pip install django-environ==0.12.0
pip install django-filter==25.1
pip install djangorestframework==3.15.2
pip install djangorestframework_simplejwt==5.5.0
pip install stripe==7.6.0
pip install pillow==11.1.0

# Apply migrations
python manage.py migrate

# Run the server
echo "Setup complete! Run 'python manage.py runserver' to start the server." 