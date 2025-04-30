from django.urls import path
from .views import (
    GetRTMTokenView,
    GetChatPartnersView,
    GetChatChannelView,
    StartVideoCallView,
    GetMessagesView,
    SendMessageView,
)

urlpatterns = [
    path('get_rtm_token/', GetRTMTokenView.as_view(), name='get_rtm_token'),
    path('get_chat_partners/', GetChatPartnersView.as_view(), name='get_chat_partners'),
    path('get_chat_channel/', GetChatChannelView.as_view(), name='get_chat_channel'),
    path('start_video_call/', StartVideoCallView.as_view(), name='start_video_call'),
    path('get_messages/', GetMessagesView.as_view(), name='get_messages'),
    path('send_message/', SendMessageView.as_view(), name='send_message'),
]