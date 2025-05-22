# Sajilo Clinic Management System

A comprehensive clinic management system built with Django and React.

## Backend Setup

1. **Create a virtual environment and install dependencies:**
   ```bash
   cd backend
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   pip install -r requirements.txt
   ```

2. **Set up environment variables:**
   Create a `.env` file in the `backend` directory with the following content:
   ```
   DEBUG=True
   SECRET_KEY=your-secret-key-here
   DATABASE_URL=sqlite:///db.sqlite3
   CORS_ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
   FRONTEND_URL=http://localhost:3000
   EMAIL_BACKEND=django.core.mail.console.EmailBackend  # For development
   DEFAULT_FROM_EMAIL=webmaster@example.com
   ```

   For production, make sure to:
   - Set `DEBUG=False`
   - Use a proper database (PostgreSQL recommended)
   - Set up a real email backend (like SendGrid or Amazon SES)
   - Set a strong `SECRET_KEY`

3. **Run migrations:**
   ```bash
   python manage.py migrate
   ```

4. **Create a superuser (admin):**
   ```bash
   python manage.py createsuperuser
   ```

5. **Run the development server:**
   ```bash
   python manage.py runserver
   ```

## Frontend Setup

1. **Install dependencies:**
   ```bash
   cd ../sajilocms_frontend
   yarn install
   ```

2. **Start the development server:**
   ```bash
   yarn start
   ```

## Password Reset Feature

The application includes a password reset feature that allows users to reset their passwords via email. Here's how it works:

1. Users can click on the "Forgot Password?" link on the login page.
2. They enter their email address and submit the form.
3. If the email exists in the system, they'll receive a password reset link.
4. Clicking the link takes them to a page where they can enter a new password.
5. After setting a new password, they'll be redirected to the login page.

### Email Configuration

For production, you'll need to configure an email backend in your Django settings. Here's an example for SendGrid:

```python
EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
EMAIL_HOST = 'smtp.sendgrid.net'
EMAIL_PORT = 587
EMAIL_USE_TLS = True
EMAIL_HOST_USER = 'apikey'  # This is literally the string 'apikey'
EMAIL_HOST_PASSWORD = 'your-sendgrid-api-key'
DEFAULT_FROM_EMAIL = 'no-reply@yourdomain.com'
```

### Environment Variables

Make sure the following environment variables are set in your `.env` file:

- `FRONTEND_URL`: The base URL of your frontend application (e.g., `http://localhost:3000`)
- `DEFAULT_FROM_EMAIL`: The email address that will be used as the sender for password reset emails

## License

This project is licensed under the MIT License.
