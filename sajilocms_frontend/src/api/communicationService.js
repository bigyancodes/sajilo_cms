// src/api/communicationService.js
import { rootAxiosInstance } from "./axiosInstance";

// Base URL for communication API endpoints
const COMM_URL = "/communication/";

// Get RTM token for Agora
export const getRTMToken = () => {
  return rootAxiosInstance.get(`${COMM_URL}get_rtm_token/`);
};

// Get list of users the logged in user can chat with
export const getChatPartners = () => {
  return rootAxiosInstance.get(`${COMM_URL}get_chat_partners/`);
};

// Get a unique chat channel name for two users
export const getChatChannel = (targetUserId) => {
  return rootAxiosInstance.post(`${COMM_URL}get_chat_channel/`, {
    target_user_id: targetUserId,
  });
};

// Start a video call with another user
export const startVideoCall = (targetUserId) => {
  return rootAxiosInstance.post(`${COMM_URL}start_video_call/`, {
    target_user_id: targetUserId,
  });
};

// Get chat history between the current user and a target user
export const getMessages = (targetUserId) => {
  return rootAxiosInstance.get(`${COMM_URL}get_messages/?target_user_id=${targetUserId}`);
};

// Send a message to another user
export const sendMessage = (recipientId, content) => {
  return rootAxiosInstance.post(`${COMM_URL}send_message/`, {
    recipient_id: recipientId,
    content: content,
  });
};