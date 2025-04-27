// src/api/chatbotService.js
import { rootAxiosInstance } from "./axiosInstance";

// Base URL for chatbot API endpoints
const CHATBOT_URL = "/chatbot/";

// Test connection to the chatbot API
export const testChatbotConnection = () => {
  return rootAxiosInstance.get(`${CHATBOT_URL}test/`);
};

// Get all chat sessions for the current user
export const fetchChatSessions = () => {
  return rootAxiosInstance.get(`${CHATBOT_URL}sessions/`);
};

// Get a specific chat session with all messages
export const fetchChatSessionById = (sessionId) => {
  return rootAxiosInstance.get(`${CHATBOT_URL}sessions/${sessionId}/`);
};

// Create a new chat session
export const createChatSession = (sessionData) => {
  return rootAxiosInstance.post(`${CHATBOT_URL}sessions/`, sessionData);
};

// Delete a chat session
export const deleteChatSession = (sessionId) => {
  return rootAxiosInstance.delete(`${CHATBOT_URL}sessions/${sessionId}/`);
};

// Send a message to the chatbot
export const sendMessage = (message, sessionId = null) => {
  const data = {
    message: message
  };
  
  // Include session_id if provided
  if (sessionId) {
    data.session_id = sessionId;
  }
  
  return rootAxiosInstance.post(`${CHATBOT_URL}message/`, data);
};