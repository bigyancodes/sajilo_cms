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
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // For embedded mode, always consider it open
  useEffect(() => {
    if (embedded) {
      setIsOpen(true);
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
  }, [messages]);

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
    setMessages(prev => [...prev, { role: 'user', content: userMessage, timestamp: new Date().toISOString() }]);
    
    try {
      setIsLoading(true);
      const response = await sendMessage(userMessage, sessionId);
      
      // Update session ID if this is a new conversation
      if (!sessionId) {
        setSessionId(response.data.session_id);
      }
      
      // Add AI response to the chat
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: response.data.message, 
        timestamp: response.data.timestamp 
      }]);
      
      setIsLoading(false);
    } catch (error) {
      console.error('Failed to send message:', error);
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: 'Sorry, I encountered an error. Please try again later.', 
        timestamp: new Date().toISOString() 
      }]);
      setIsLoading(false);
    }
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

  // If this is embedded in the dashboard, we render a simpler version
  if (embedded) {
    return (
      <div className="h-full flex flex-col">
        {/* Chat messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                </svg>
              </div>
              <h4 className="text-lg font-semibold text-gray-700 mb-2">Welcome to Healthcare Assistant</h4>
              <p className="text-gray-600 mb-6">
                I can help you with your appointments, medical records, and finding doctors. What would you like to know?
              </p>
              <div className="space-y-2 w-full">
                {['When is my next appointment?', 'Show me my prescriptions', 'List all doctors'].map((suggestion, index) => (
                  <button
                    key={index}
                    onClick={() => {
                      setInputMessage(suggestion);
                      // Slight delay to allow state update
                      setTimeout(() => handleSendMessage({ preventDefault: () => {} }), 100);
                    }}
                    className="block w-full text-left p-3 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((message, index) => (
              <div 
                key={index} 
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div 
                  className={`
                    max-w-[80%] rounded-lg p-3 
                    ${message.role === 'user' 
                      ? 'bg-blue-600 text-white rounded-br-none' 
                      : 'bg-white border border-gray-200 rounded-bl-none'
                    }
                  `}
                >
                  <div className="whitespace-pre-wrap">{message.content}</div>
                  <div 
                    className={`text-xs mt-1 text-right ${message.role === 'user' ? 'text-blue-200' : 'text-gray-500'}`}
                  >
                    {formatTime(message.timestamp)}
                  </div>
                </div>
              </div>
            ))
          )}
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-white border border-gray-200 rounded-lg rounded-bl-none p-3 max-w-[80%]">
                <div className="flex space-x-2">
                  <div className="w-2 h-2 rounded-full bg-gray-300 animate-bounce" style={{ animationDelay: '0ms' }}></div>
                  <div className="w-2 h-2 rounded-full bg-gray-300 animate-bounce" style={{ animationDelay: '150ms' }}></div>
                  <div className="w-2 h-2 rounded-full bg-gray-300 animate-bounce" style={{ animationDelay: '300ms' }}></div>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Chat input */}
        <form onSubmit={handleSendMessage} className="border-t border-gray-200 p-4 bg-white">
          <div className="flex items-center space-x-2">
            <input
              type="text"
              ref={inputRef}
              value={inputMessage}
              onChange={handleInputChange}
              placeholder="Type a message..."
              className="flex-1 border border-gray-300 rounded-full px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={!inputMessage.trim() || isLoading}
              className={`
                rounded-full p-2 focus:outline-none 
                ${!inputMessage.trim() || isLoading
                  ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
                }
              `}
              aria-label="Send message"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </button>
          </div>
        </form>
      </div>
    );
  }

  // Regular floating chatbot for other pages
  return (
    <div className="fixed bottom-4 right-4 z-50">
      {/* Chat toggle button */}
      <button 
        onClick={toggleChat}
        className="flex items-center justify-center w-14 h-14 rounded-full bg-blue-600 text-white shadow-lg hover:bg-blue-700 transition-colors focus:outline-none"
        aria-label="Toggle chat"
      >
        {isOpen ? (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
          </svg>
        )}
      </button>

      {/* Chat window */}
      {isOpen && (
        <div className="absolute bottom-16 right-0 w-96 h-[32rem] bg-white rounded-lg shadow-xl flex flex-col overflow-hidden border border-gray-200">
          {/* Chat header */}
          <div className="bg-blue-600 text-white p-4 flex justify-between items-center">
            <h3 className="font-semibold">Healthcare Assistant</h3>
            <div className="flex space-x-2">
              <button 
                onClick={toggleSessions}
                className="text-white hover:text-blue-200 focus:outline-none"
                aria-label="Show chat history"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
                </svg>
              </button>
              <button 
                onClick={handleStartNewChat}
                className="text-white hover:text-blue-200 focus:outline-none"
                aria-label="New chat"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              </button>
            </div>
          </div>

          {/* Sessions sidebar */}
          {showSessions && (
            <div className="absolute top-14 left-0 w-full h-[calc(100%-64px)] bg-white z-10 border-r border-gray-200 overflow-y-auto">
              <div className="p-4 bg-gray-50 border-b border-gray-200">
                <h4 className="font-semibold text-gray-700">Chat History</h4>
              </div>
              <div className="divide-y divide-gray-200">
                {sessions.length > 0 ? (
                  sessions.map(session => (
                    <button
                      key={session.id}
                      onClick={() => loadChatSession(session.id)}
                      className="block w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors"
                    >
                      <p className="font-medium text-gray-900 truncate">{session.title}</p>
                      <p className="text-sm text-gray-500">
                        {new Date(session.created_at).toLocaleDateString()}
                      </p>
                    </button>
                  ))
                ) : (
                  <p className="p-4 text-gray-500 text-center">No chat history found</p>
                )}
              </div>
            </div>
          )}

          {/* Chat messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                  </svg>
                </div>
                <h4 className="text-lg font-semibold text-gray-700 mb-2">Welcome to Healthcare Assistant</h4>
                <p className="text-gray-600 mb-6">
                  I can help you with your appointments, medical records, and finding doctors. What would you like to know?
                </p>
                <div className="space-y-2 w-full">
                  {['When is my next appointment?', 'Show me my prescriptions', 'List all doctors'].map((suggestion, index) => (
                    <button
                      key={index}
                      onClick={() => {
                        setInputMessage(suggestion);
                        // Slight delay to allow state update
                        setTimeout(() => handleSendMessage({ preventDefault: () => {} }), 100);
                      }}
                      className="block w-full text-left p-3 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              messages.map((message, index) => (
                <div 
                  key={index} 
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div 
                    className={`
                      max-w-[80%] rounded-lg p-3 
                      ${message.role === 'user' 
                        ? 'bg-blue-600 text-white rounded-br-none' 
                        : 'bg-white border border-gray-200 rounded-bl-none'
                      }
                    `}
                  >
                    <div className="whitespace-pre-wrap">{message.content}</div>
                    <div 
                      className={`text-xs mt-1 text-right ${message.role === 'user' ? 'text-blue-200' : 'text-gray-500'}`}
                    >
                      {formatTime(message.timestamp)}
                    </div>
                  </div>
                </div>
              ))
            )}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-white border border-gray-200 rounded-lg rounded-bl-none p-3 max-w-[80%]">
                  <div className="flex space-x-2">
                    <div className="w-2 h-2 rounded-full bg-gray-300 animate-bounce" style={{ animationDelay: '0ms' }}></div>
                    <div className="w-2 h-2 rounded-full bg-gray-300 animate-bounce" style={{ animationDelay: '150ms' }}></div>
                    <div className="w-2 h-2 rounded-full bg-gray-300 animate-bounce" style={{ animationDelay: '300ms' }}></div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Chat input */}
          <form onSubmit={handleSendMessage} className="border-t border-gray-200 p-4 bg-white">
            <div className="flex items-center space-x-2">
              <input
                type="text"
                ref={inputRef}
                value={inputMessage}
                onChange={handleInputChange}
                placeholder="Type a message..."
                className="flex-1 border border-gray-300 rounded-full px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={isLoading}
              />
              <button
                type="submit"
                disabled={!inputMessage.trim() || isLoading}
                className={`
                  rounded-full p-2 focus:outline-none 
                  ${!inputMessage.trim() || isLoading
                    ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                  }
                `}
                aria-label="Send message"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default Chatbot;