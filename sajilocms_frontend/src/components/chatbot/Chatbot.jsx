import React, { useEffect, useState, useRef, useCallback } from 'react';
import { sendMessage, fetchChatSessions, fetchChatSessionById } from '../../api/chatbotService';

const Chatbot = ({ embedded = false }) => {
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [showSessions, setShowSessions] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // For embedded mode, always consider it open
  useEffect(() => {
    if (embedded) {
      setIsOpen(true);
      
      // Listen for custom message events from quick action buttons
      const handleCustomMessage = (event) => {
        const { message } = event.detail;
        if (message) {
          setInputMessage(message);
          // Auto-submit the message
          setTimeout(() => {
            const submitEvent = new Event('submit', { bubbles: true, cancelable: true });
            const form = document.querySelector('form');
            if (form) {
              handleSendMessage({ preventDefault: () => {} });
            }
          }, 100);
        }
      };
      
      window.addEventListener('sendChatMessage', handleCustomMessage);
      
      return () => {
        window.removeEventListener('sendChatMessage', handleCustomMessage);
      };
    }
  }, [embedded]);

  // Define loadChatSession function with useCallback
  const loadChatSession = useCallback(async (id) => {
    try {
      setIsLoading(true);
      const response = await fetchChatSessionById(id);
      setSessionId(id);
      setMessages(response.data.messages || []);
      setShowSessions(false);
      setIsLoading(false);
    } catch (error) {
      console.error('Failed to load chat session:', error);
      setIsLoading(false);
    }
  }, []);

  // Wrap loadChatSessions with useCallback
  const loadChatSessions = useCallback(async () => {
    try {
      const response = await fetchChatSessions();
      setSessions(response.data);
      // Automatically load the most recent session if available
      if (response.data.length > 0 && !sessionId) {
        loadChatSession(response.data[0].id);
      }
    } catch (error) {
      console.error('Failed to load chat sessions:', error);
    }
  }, [sessionId, loadChatSession]);

  // Load chat sessions when component mounts
  useEffect(() => {
    if (isOpen) {
      loadChatSessions();
    }
  }, [isOpen, loadChatSessions]);

  // Scroll to bottom whenever messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  // Focus input when chat opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const handleStartNewChat = () => {
    setSessionId(null);
    setMessages([]);
    setShowSessions(false);
  };

  const handleInputChange = (e) => {
    setInputMessage(e.target.value);
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputMessage.trim()) return;

    const userMessage = inputMessage;
    setInputMessage('');
    
    // Add user message to the chat
    setMessages(prev => [...prev, { 
      role: 'user', 
      content: userMessage, 
      timestamp: new Date().toISOString(),
      id: Date.now()
    }]);
    
    try {
      setIsTyping(true);
      setIsLoading(true);
      
      // Simulate typing delay for better UX
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const response = await sendMessage(userMessage, sessionId);
      
      // Update session ID if this is a new conversation
      if (!sessionId) {
        setSessionId(response.data.session_id);
      }
      
      setIsTyping(false);
      
      // Add AI response to the chat
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: response.data.message, 
        timestamp: response.data.timestamp,
        id: Date.now() + 1
      }]);
      
      setIsLoading(false);
    } catch (error) {
      console.error('Failed to send message:', error);
      setIsTyping(false);
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: 'Sorry, I encountered an error. Please try again later.', 
        timestamp: new Date().toISOString(),
        id: Date.now() + 1
      }]);
      setIsLoading(false);
    }
  };

  const handleSuggestionClick = (suggestion) => {
    setInputMessage(suggestion);
    setTimeout(() => {
      const form = document.querySelector('form');
      if (form) {
        const event = new Event('submit', { bubbles: true, cancelable: true });
        form.dispatchEvent(event);
      }
    }, 100);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const toggleChat = () => {
    setIsOpen(!isOpen);
  };

  const toggleSessions = () => {
    setShowSessions(!showSessions);
  };

  // Format timestamp to a readable time
  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Enhanced typing indicator component
  const TypingIndicator = () => (
    <div className="flex justify-start mb-4">
      <div className="flex items-center space-x-2 bg-white border border-gray-200 rounded-2xl rounded-bl-md px-4 py-3 shadow-sm">
        <div className="flex items-center space-x-1">
          <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"></div>
          <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
          <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
        </div>
        <span className="text-sm text-gray-500">AI is typing...</span>
      </div>
    </div>
  );

  // Enhanced message bubble component
  const MessageBubble = ({ message, isUser }) => (
    <div className={`flex mb-4 ${isUser ? 'justify-end' : 'justify-start'}`}>
      {!isUser && (
        <div className="flex-shrink-0 mr-3">
          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center shadow-sm">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
          </div>
        </div>
      )}
      <div className={`flex flex-col max-w-xs lg:max-w-md ${isUser ? 'items-end' : 'items-start'}`}>
        <div
          className={`px-4 py-3 rounded-2xl shadow-sm ${
            isUser
              ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-br-md'
              : 'bg-white border border-gray-200 text-gray-800 rounded-bl-md'
          }`}
        >
          <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
        </div>
        <span className={`text-xs mt-1 px-2 ${isUser ? 'text-blue-600' : 'text-gray-500'}`}>
          {formatTime(message.timestamp)}
        </span>
      </div>
      {isUser && (
        <div className="flex-shrink-0 ml-3">
          <div className="w-8 h-8 bg-gradient-to-br from-gray-400 to-gray-500 rounded-full flex items-center justify-center shadow-sm">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
        </div>
      )}
    </div>
  );

  // Suggestion buttons component
  const SuggestionButtons = () => {
    const suggestions = [
      { text: 'When is my next appointment?', icon: '📅' },
      { text: 'Show me my prescriptions', icon: '💊' },
      { text: 'List all doctors', icon: '👨‍⚕️' },
      { text: 'My medical records', icon: '📋' }
    ];

    return (
      <div className="space-y-3">
        <p className="text-sm text-gray-600 text-center mb-4">
          Here are some things I can help you with:
        </p>
        <div className="grid grid-cols-1 gap-2">
          {suggestions.map((suggestion, index) => (
            <button
              key={index}
              onClick={() => handleSuggestionClick(suggestion.text)}
              className="flex items-center p-3 bg-white border border-gray-200 rounded-xl hover:border-blue-300 hover:bg-blue-50 transition-all duration-200 group"
            >
              <span className="text-lg mr-3">{suggestion.icon}</span>
              <span className="text-sm text-gray-700 group-hover:text-blue-700 font-medium">
                {suggestion.text}
              </span>
            </button>
          ))}
        </div>
      </div>
    );
  };

  // Welcome screen component
  const WelcomeScreen = () => (
    <div className="flex flex-col items-center justify-center h-full p-6 text-center">
      <div className="w-20 h-20 bg-gradient-to-br from-blue-100 to-blue-200 rounded-3xl flex items-center justify-center mb-6 shadow-sm">
        <svg className="w-10 h-10 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
        </svg>
      </div>
      <h3 className="text-xl font-bold text-gray-800 mb-3">
        Healthcare Assistant
      </h3>
      <p className="text-gray-600 mb-8 leading-relaxed">
        I'm here to help you manage your healthcare needs. Ask me about appointments, 
        prescriptions, medical records, or finding doctors.
      </p>
      <SuggestionButtons />
    </div>
  );

  // If this is embedded in the dashboard, we render a simpler version
  if (embedded) {
    return (
      <div className="h-full flex flex-col bg-gray-50">
        {/* Chat messages */}
        <div className="flex-1 overflow-y-auto p-4">
          {messages.length === 0 ? (
            <WelcomeScreen />
          ) : (
            <div className="space-y-2">
              {messages.map((message) => (
                <MessageBubble 
                  key={message.id} 
                  message={message} 
                  isUser={message.role === 'user'} 
                />
              ))}
              {isTyping && <TypingIndicator />}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Chat input */}
        <div className="border-t border-gray-200 bg-white p-4">
          <form onSubmit={handleSendMessage} className="flex items-center space-x-3">
            <div className="flex-1 relative">
              <input
                type="text"
                ref={inputRef}
                value={inputMessage}
                onChange={handleInputChange}
                placeholder="Type your message..."
                className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 pr-12 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                disabled={isLoading}
              />
              <button
                type="submit"
                disabled={!inputMessage.trim() || isLoading}
                className={`absolute right-2 top-1/2 transform -translate-y-1/2 w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200 ${
                  !inputMessage.trim() || isLoading
                    ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700 hover:scale-105 shadow-sm'
                }`}
                aria-label="Send message"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // Regular floating chatbot for other pages
  return (
    <div className="fixed bottom-6 right-6 z-50">
      {/* Chat toggle button */}
      <button 
        onClick={toggleChat}
        className={`flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg hover:shadow-xl transform transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-blue-500 focus:ring-opacity-50 ${
          isOpen ? 'scale-95' : 'hover:scale-105'
        }`}
        aria-label="Toggle chat"
      >
        <div className="relative">
          {isOpen ? (
            <svg className="w-6 h-6 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <>
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
              {/* Online indicator */}
              <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-400 rounded-full border-2 border-white animate-pulse"></div>
            </>
          )}
        </div>
      </button>

      {/* Chat window */}
      {isOpen && (
        <div className="absolute bottom-20 right-0 w-96 h-[32rem] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-gray-100 transform transition-all duration-300 animate-in slide-in-from-bottom-4">
          {/* Chat header */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-4 flex justify-between items-center">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-lg">Healthcare AI</h3>
                <p className="text-xs text-blue-100">Online now</p>
              </div>
            </div>
            <div className="flex space-x-2">
              <button 
                onClick={toggleSessions}
                className="p-2 text-white hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors focus:outline-none"
                aria-label="Show chat history"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </button>
              <button 
                onClick={handleStartNewChat}
                className="p-2 text-white hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors focus:outline-none"
                aria-label="New chat"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              </button>
            </div>
          </div>

          {/* Sessions sidebar */}
          {showSessions && (
            <div className="absolute top-16 left-0 w-full h-[calc(100%-64px)] bg-white z-10 border-r border-gray-200 overflow-y-auto">
              <div className="p-4 bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
                <h4 className="font-semibold text-gray-800">Chat History</h4>
                <p className="text-xs text-gray-600 mt-1">Your recent conversations</p>
              </div>
              <div className="divide-y divide-gray-100">
                {sessions.length > 0 ? (
                  sessions.map(session => (
                    <button
                      key={session.id}
                      onClick={() => loadChatSession(session.id)}
                      className="block w-full text-left px-4 py-4 hover:bg-blue-50 transition-colors group"
                    >
                      <p className="font-medium text-gray-900 truncate group-hover:text-blue-700">
                        {session.title}
                      </p>
                      <p className="text-sm text-gray-500 mt-1">
                        {new Date(session.created_at).toLocaleDateString()}
                      </p>
                    </button>
                  ))
                ) : (
                  <div className="p-8 text-center">
                    <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                      <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                      </svg>
                    </div>
                    <p className="text-gray-500 text-sm">No chat history yet</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Chat messages */}
          <div className="flex-1 overflow-y-auto bg-gradient-to-b from-gray-50 to-white p-4">
            {messages.length === 0 ? (
              <WelcomeScreen />
            ) : (
              <div>
                {messages.map((message) => (
                  <MessageBubble 
                    key={message.id} 
                    message={message} 
                    isUser={message.role === 'user'} 
                  />
                ))}
                {isTyping && <TypingIndicator />}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          {/* Chat input */}
          <div className="border-t border-gray-200 bg-white p-4">
            <form onSubmit={handleSendMessage} className="flex items-center space-x-3">
              <div className="flex-1 relative">
                <input
                  type="text"
                  ref={inputRef}
                  value={inputMessage}
                  onChange={handleInputChange}
                  placeholder="Type your message..."
                  className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 pr-12 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={isLoading}
                />
                <button
                  type="submit"
                  disabled={!inputMessage.trim() || isLoading}
                  className={`absolute right-2 top-1/2 transform -translate-y-1/2 w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200 ${
                    !inputMessage.trim() || isLoading
                      ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                      : 'bg-blue-600 text-white hover:bg-blue-700 hover:scale-105 shadow-sm'
                  }`}
                  aria-label="Send message"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Chatbot;