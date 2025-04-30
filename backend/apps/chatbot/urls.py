from django.urls import path
from . import views

app_name = 'chatbot'

urlpatterns = [
    # Test endpoint
    path('test/', views.test_chatbot_connection, name='test-connection'),
    
    # List or create chat sessions
    path('sessions/', views.ChatSessionListView.as_view(), name='session-list'),
    
    # Retrieve or delete a specific chat session
    path('sessions/<int:pk>/', views.ChatSessionDetailView.as_view(), name='session-detail'),
    
    # Send a message to the AI
    path('message/', views.ChatMessageView.as_view(), name='send-message'),
]