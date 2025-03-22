#!/bin/bash

echo "🔧 Setting up Sajilo CMS Django Backend (Arch Linux Edition)..."

PYTHON_BIN=$(which python3 || which python)
if [ -z "$PYTHON_BIN" ]; then
  echo "❌ Python not found. Please install Python."
  exit 1
fi

if [ ! -d "env" ]; then
  echo "📁 Creating virtual environment..."
  $PYTHON_BIN -m venv env
else
  echo "✅ Virtual environment already exists"
fi

echo "⚡ Activating virtual environment..."
source env/bin/activate

echo "⬆️ Upgrading pip..."
pip install --upgrade pip

if [ -f "requirements.txt" ]; then
  echo "📦 Installing from requirements.txt..."
  pip install -r requirements.txt
else
  echo "📦 Installing core dependencies..."
  pip install Django==5.1.7 djangorestframework djangorestframework-simplejwt django-environ django-cors-headers django-oauth-toolkit social-auth-app-django
  pip freeze > requirements.txt
  echo "✅ requirements.txt generated"
fi

if [ ! -f ".env" ]; then
  echo "⚙️ Creating default .env file..."
  cat <<EOT >> .env
SECRET_KEY=your-secret-key
DEBUG=True
ALLOWED_HOSTS=127.0.0.1,localhost
CORS_ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
DATABASE_URL=sqlite:///db.sqlite3
EOT
else
  echo "✅ .env file already exists"
fi

echo "🔄 Running Django migrations..."
python manage.py migrate

echo "🚀 Starting development server..."
python manage.py runserver
