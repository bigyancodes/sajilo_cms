// src/components/communication/ChatRoom.jsx
import React, { useState, useEffect, useRef, useContext } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { rootAxiosInstance } from "../../api/axiosInstance";
import AgoraRTC from "agora-rtc-sdk-ng";
import { AuthContext } from "../../context/AuthContext";
import { fetchAppointments } from "../../api/appointmentService";

// Initialize Agora client
const ChatRoom = () => {
  const { targetUserId } = useParams();
  const navigate = useNavigate();
  const { user, logout } = useContext(AuthContext);

  // State management
  const [callStatus, setCallStatus] = useState("chat"); // 'chat', 'active', 'ended'
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOn, setIsCameraOn] = useState(true);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [remoteVideoTrack, setRemoteVideoTrack] = useState(null);
  const [chatPartners, setChatPartners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [hasCompletedAppointment, setHasCompletedAppointment] = useState(false);
  const [tokenDebugInfo, setTokenDebugInfo] = useState(null);

  // Refs for video elements and tracks
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const localTracks = useRef({ audioTrack: null, videoTrack: null });
  const agoraClientRef = useRef(null);
  
  // Initialize Agora client if not already done
  if (!agoraClientRef.current) {
    agoraClientRef.current = AgoraRTC.createClient({ mode: "rtc", codec: "vp8" });
  }
  const agoraClient = agoraClientRef.current;

  const BASE_URL = "http://localhost:8000/communication/";

  // Direct token test function
  const testDirectToken = async () => {
    if (!(await requestPermissions())) return;

    try {
      setError(null);
      
      // The token you provided
      const TEST_TOKEN = "007eJxSYLji5rBv5b5Y9olnm92tOzp/+s/5PkkvSPM9h/HfaK5Jdz0UGAzTjI0NzQ0tjVINDE0sU82TLM2MEk3MzUwsU0wsjYyN98uoZXBwMDBopnkwMjIwMrAwMDKA+ExgkhlMskDJYGffYAgJCAAA//8woxyx";
      
      // Use a very simple channel name
      const TEST_CHANNEL = "SCMS";
      
      // Your Agora App ID (replace with your actual App ID)
      const APP_ID = "1f3317192e0149e7b962a47649d49233"; // Replace with your App ID
      
      console.log("Starting direct token test...");
      console.log("App ID:", APP_ID);
      console.log("Channel:", TEST_CHANNEL);
      console.log("Token (first 10 chars):", TEST_TOKEN.substring(0, 10) + "...");
      
      // Set debug info for UI
      setTokenDebugInfo({
        tokenLength: TEST_TOKEN ? TEST_TOKEN.length : 0,
        tokenStart: TEST_TOKEN ? TEST_TOKEN.substring(0, 10) : '',
        tokenEnd: TEST_TOKEN ? TEST_TOKEN.substring(TEST_TOKEN.length - 5) : '',
        channelName: TEST_CHANNEL,
        appIdLength: APP_ID ? APP_ID.length : 0,
        uid: "null (auto-assigned)",
        testMode: true
      });
      
      // Clean up any existing connection
      if (agoraClient.connectionState === 'CONNECTED') {
        console.log("Client already connected, leaving channel first");
        await agoraClient.leave();
      }
      
      // Join with the test token
      console.log("Joining channel with test token...");
      await agoraClient.join(
        APP_ID,
        TEST_CHANNEL,
        TEST_TOKEN,
        null // Let Agora assign a user ID
      );
      
      console.log("Successfully joined channel!");
      
      // Create tracks
      console.log("Creating audio and video tracks...");
      const [audioTrack, videoTrack] = await AgoraRTC.createMicrophoneAndCameraTracks();
      
      // Store tracks
      localTracks.current = { audioTrack, videoTrack };
      
      // Play local video
      if (localVideoRef.current) {
        videoTrack.play(localVideoRef.current);
      }
      
      // Publish tracks
      console.log("Publishing tracks...");
      await agoraClient.publish([audioTrack, videoTrack]);
      console.log("Successfully published tracks!");
      
      // Set up event handlers
      agoraClient.on("user-published", async (remoteUser, mediaType) => {
        console.log(`Remote user ${remoteUser.uid} published ${mediaType}`);
        await agoraClient.subscribe(remoteUser, mediaType);
        
        if (mediaType === "video") {
          setRemoteVideoTrack(remoteUser.videoTrack);
          if (remoteVideoRef.current) {
            remoteUser.videoTrack.play(remoteVideoRef.current);
          }
        }
        if (mediaType === "audio") {
          remoteUser.audioTrack.play();
        }
      });
      
      // Set call as active
      setCallStatus("active");
      
    } catch (error) {
      console.error("Direct token test failed:", error);
      setError(`Direct token test failed: ${error.message}`);
    }
  };

  // Fetch chat partners and verify authorization
  useEffect(() => {
    const fetchChatPartners = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch chat partners
        const partnersResponse = await rootAxiosInstance.get(`${BASE_URL}get_chat_partners/`);
        const partners = partnersResponse.data;
        setChatPartners(partners);

        // Verify targetUserId is a valid chat partner
        if (!partners.some((partner) => partner.id === parseInt(targetUserId))) {
          setError("You are not authorized to chat with this user.");
          navigate("/unauthorized");
          return;
        }

        // Fetch completed appointments to ensure video call eligibility
        const params = {
          doctor_id: user.role === "DOCTOR" ? user.id : targetUserId,
          patient_id: user.role === "PATIENT" ? user.id : targetUserId,
          status: "COMPLETED", // Fixed: Match backend's AppointmentStatus.COMPLETED
        };
        console.log("Fetching appointments with params:", params);
        const appointmentsResponse = await fetchAppointments(params);
        console.log("Appointments response:", appointmentsResponse.data);

        if (!appointmentsResponse.data.length) {
          setError("No completed appointments found. Video calls are not available.");
          setHasCompletedAppointment(false);
        } else {
          setHasCompletedAppointment(true);
        }
      } catch (err) {
        setError("Failed to load chat partners. Please try again.");
        if (err.response?.status === 401) {
          setTimeout(() => logout(), 2000);
        }
      } finally {
        setLoading(false);
      }
    };

    if (user) fetchChatPartners();
  }, [user, targetUserId, navigate, logout]);

  // Fetch messages
  useEffect(() => {
    const fetchMessages = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await rootAxiosInstance.get(`${BASE_URL}get_messages/`, {
          params: { target_user_id: targetUserId },
        });
        setMessages(response.data);
      } catch (err) {
        if (err.response?.status === 401) {
          setError("Authentication failed. Please log in again.");
          setTimeout(() => logout(), 2000);
        } else if (err.response?.status === 403) {
          setError(err.response.data.error || "You are not authorized to view messages.");
        } else {
          setError("Failed to load messages.");
        }
      } finally {
        setLoading(false);
      }
    };

    if (user && targetUserId) fetchMessages();
  }, [user, targetUserId, logout]);

  // Send message
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    try {
      setError(null);
      const response = await rootAxiosInstance.post(`${BASE_URL}send_message/`, {
        recipient_id: targetUserId,
        content: newMessage,
      });
      setMessages([...messages, response.data]);
      setNewMessage("");
    } catch (err) {
      setError("Failed to send message.");
      if (err.response?.status === 401) {
        setTimeout(() => logout(), 2000);
      }
    }
  };

  // Request permissions
  const requestPermissions = async () => {
    try {
      await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      return true;
    } catch (err) {
      setError("Camera and microphone permissions are required.");
      return false;
    }
  };

  // This function validates the Agora app ID
  const validateAgoraAppId = (appId) => {
    if (!appId) return "App ID is missing";
    if (appId.length !== 32) return `App ID has incorrect length (${appId.length}, expected 32)`;
    return null;
  };

  // Start video call
  const startVideoCall = async () => {
    if (!(await requestPermissions())) return;

    try {
      setError(null);
      console.log("Starting video call process...");
      const response = await rootAxiosInstance.post(`${BASE_URL}start_video_call/`, {
        target_user_id: targetUserId,
      });
      
      const { token, channel_name, app_id, uid, expires_at } = response.data;

      // Validate AppID
      const appIdError = validateAgoraAppId(app_id);
      if (appIdError) {
        setError(appIdError);
        return;
      }

      // Set debug info for UI display
      setTokenDebugInfo({
        tokenLength: token ? token.length : 0,
        tokenStart: token ? token.substring(0, 10) : '',
        tokenEnd: token ? token.substring(token.length - 5) : '',
        channelName: channel_name,
        appIdLength: app_id ? app_id.length : 0,
        uid: uid,
        expiresAt: expires_at ? new Date(expires_at * 1000).toLocaleString() : 'N/A',
        testMode: false
      });

      console.log("Video call parameters:", {
        appId: app_id,
        appIdLength: app_id ? app_id.length : 0, 
        channelName: channel_name,
        tokenLength: token ? token.length : 0,
        tokenPreview: token ? `${token.substring(0, 10)}...${token.substring(token.length - 5)}` : '',
        uid: uid,
        expiresAt: expires_at ? new Date(expires_at * 1000).toLocaleString() : 'N/A',
      });

      try {
        console.log("Initializing and checking client for cleanup...");
        if (agoraClient.connectionState === 'CONNECTED') {
          console.log("Client already connected, leaving channel first");
          await agoraClient.leave();
        }

        console.log(`Joining channel: ${channel_name}`);
        // Join with uid from backend
        await agoraClient.join(
          app_id,
          channel_name,
          token,
          null // Use null to let Agora assign a uid
        );

        console.log("Successfully joined channel, creating tracks");
        const [audioTrack, videoTrack] = await AgoraRTC.createMicrophoneAndCameraTracks({
          encoderConfig: "high_quality"
        });
        
        console.log("Tracks created successfully");
        
        // Store tracks in ref for later use
        localTracks.current = { audioTrack, videoTrack };
        
        // Play local video
        console.log("Playing local video track");
        if (localVideoRef.current && videoTrack) {
          videoTrack.play(localVideoRef.current);
        }

        console.log("Publishing tracks to remote users");
        await agoraClient.publish([audioTrack, videoTrack]);
        console.log("Successfully published local tracks");
        
        // Set up event handlers for remote users
        console.log("Setting up event handlers for remote users");
        agoraClient.on("user-published", async (remoteUser, mediaType) => {
          console.log(`Remote user ${remoteUser.uid} published ${mediaType} stream`);
            await agoraClient.subscribe(remoteUser, mediaType);
            console.log(`Subscribed to ${mediaType} from user ${remoteUser.uid}`);
            
            if (mediaType === "video") {
              setRemoteVideoTrack(remoteUser.videoTrack);
              console.log("Playing remote video track");
              if (remoteVideoRef.current) {
                remoteUser.videoTrack.play(remoteVideoRef.current);
              }
            }
            if (mediaType === "audio") {
              console.log("Playing remote audio track");
              remoteUser.audioTrack.play();
            }
        });

        agoraClient.on("user-unpublished", (remoteUser, mediaType) => {
          console.log(`Remote user ${remoteUser.uid} unpublished ${mediaType} stream`);
          if (mediaType === "video") {
            setRemoteVideoTrack(null);
          }
        });
        
        console.log("Call setup complete, setting call status to active");
        setCallStatus("active");
      } catch (joinError) {
        console.error("Error joining channel:", joinError);
        setError(`Failed to join video call: ${joinError.message}`);
        return;
      }
    } catch (err) {
      console.error("Video call error:", err);
      if (err.response?.data) {
        console.error("Server error details:", err.response.data);
      }
      setError(err.message || "Failed to start video call. Please try again.");
      if (err.response?.status === 401) {
        setTimeout(() => logout(), 2000);
      }
    }
  };

  // End video call
  const endVideoCall = async () => {
    try {
      console.log("Ending video call...");
      if (localTracks.current) {
        if (localTracks.current.audioTrack) {
          console.log("Stopping audio track");
          localTracks.current.audioTrack.stop();
          localTracks.current.audioTrack.close();
        }
        if (localTracks.current.videoTrack) {
          console.log("Stopping video track");
          localTracks.current.videoTrack.stop();
          localTracks.current.videoTrack.close();
        }
      }
      
      console.log("Leaving Agora channel");
      await agoraClient.leave();
      console.log("Successfully left channel");
      
      localTracks.current = { audioTrack: null, videoTrack: null };
      setRemoteVideoTrack(null);
      setCallStatus("ended");
    } catch (err) {
      console.error("Error ending call:", err);
      setError("Failed to end call properly.");
    }
  };

  // Toggle mute
  const toggleMute = () => {
    if (localTracks.current && localTracks.current.audioTrack) {
      localTracks.current.audioTrack.setEnabled(!isMuted);
      setIsMuted(!isMuted);
    }
  };

  // Toggle camera
  const toggleCamera = async () => {
    if (localTracks.current && localTracks.current.videoTrack) {
      if (isCameraOn) {
        localTracks.current.videoTrack.setEnabled(false);
        setIsCameraOn(false);
      } else {
        localTracks.current.videoTrack.setEnabled(true);
        setIsCameraOn(true);
      }
    }
  };

  // Chat view
  if (callStatus === "chat") {
    return (
      <div className="flex justify-center items-center h-screen bg-gray-100">
        <div className="w-full max-w-2xl bg-white rounded-lg shadow-lg flex flex-col h-[80vh]">
          <div className="flex items-center justify-between p-4 bg-blue-600 text-white rounded-t-lg">
            <h2 className="text-lg font-medium">
              Chat with {chatPartners.find((p) => p.id === parseInt(targetUserId))?.first_name || "User"}
            </h2>
            <div className="flex space-x-2">
              {/* Test button */}
              <button
                onClick={testDirectToken}
                className="p-2 bg-yellow-500 rounded-full hover:bg-yellow-600"
                title="Test with Direct Token"
              >
                <svg 
                  xmlns="http://www.w3.org/2000/svg" 
                  className="h-6 w-6" 
                  fill="none" 
                  viewBox="0 0 24 24" 
                  stroke="white"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={2} 
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" 
                  />
                </svg>
              </button>
              
              {/* Original video call button */}
              <button
                onClick={startVideoCall}
                className="p-2 bg-green-500 rounded-full hover:bg-green-600"
                disabled={loading || !hasCompletedAppointment}
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="white"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                  />
                </svg>
              </button>
            </div>
          </div>
          <div className="flex-1 p-6 overflow-y-auto">
            {loading ? (
              <p className="text-center text-gray-500">Loading...</p>
            ) : error ? (
              <div className="text-center text-red-500">
                <p className="mb-2">{error}</p>
                {tokenDebugInfo && (
                  <div className="mt-4 text-left p-3 bg-gray-100 rounded text-xs font-mono">
                    <h4 className="text-sm font-semibold text-gray-700 mb-1">Debug Info:</h4>
                    <ul>
                      <li>Token Length: {tokenDebugInfo.tokenLength}</li>
                      <li>Token: {tokenDebugInfo.tokenStart}...{tokenDebugInfo.tokenEnd}</li>
                      <li>Channel: {tokenDebugInfo.channelName}</li>
                      <li>App ID Length: {tokenDebugInfo.appIdLength}</li>
                      <li>UID: {tokenDebugInfo.uid}</li>
                      {tokenDebugInfo.expiresAt && <li>Expires: {tokenDebugInfo.expiresAt}</li>}
                      {tokenDebugInfo.testMode && <li><strong>Mode: Direct Token Test</strong></li>}
                    </ul>
                  </div>
                )}
              </div>
            ) : messages.length === 0 ? (
              <p className="text-center text-gray-500">No messages yet.</p>
            ) : (
              messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.sender.id === user.id ? "justify-end" : "justify-start"} mb-4`}
                >
                  <div
                    className={`max-w-[70%] p-3 rounded-lg ${
                      msg.sender.id === user.id ? "bg-blue-500 text-white" : "bg-gray-200 text-gray-800"
                    }`}
                  >
                    <p>{msg.content}</p>
                    <span className="text-xs text-gray-400">
                      {new Date(msg.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
          <form onSubmit={handleSendMessage} className="p-4 border-t flex">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type a message..."
              className="flex-1 p-2 border rounded-l-md"
            />
            <button type="submit" className="p-2 bg-blue-600 text-white rounded-r-md">
              Send
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Ended call view
  if (callStatus === "ended") {
    return (
      <div className="flex justify-center items-center h-screen bg-black text-white">
        <div className="text-center">
          <h1 className="text-3xl mb-4">Call Ended</h1>
          <button
            onClick={() => setCallStatus("chat")}
            className="px-4 py-2 bg-blue-600 rounded-md"
          >
            Return to Chat
          </button>
        </div>
      </div>
    );
  }

  // Active call view
  return (
    <div className="relative w-screen h-screen bg-black">
      <div
        ref={remoteVideoRef}
        className="absolute top-0 left-0 w-full h-full bg-gray-700 flex items-center justify-center text-white"
      >
        {!remoteVideoTrack && <p>Waiting for participant...</p>}
      </div>
      <div
        ref={localVideoRef}
        className="absolute bottom-20 right-5 w-48 h-36 bg-gray-600"
      />
      <div className="absolute bottom-0 w-full h-16 bg-black/50 flex justify-center items-center">
        <button
          onClick={toggleMute}
          className={`mx-2 px-4 py-2 rounded-full ${isMuted ? "bg-gray-600" : "bg-white text-black"}`}
        >
          {isMuted ? "Unmute" : "Mute"}
        </button>
        <button
          onClick={toggleCamera}
          className={`mx-2 px-4 py-2 rounded-full ${isCameraOn ? "bg-white text-black" : "bg-gray-600"}`}
        >
          {isCameraOn ? "Camera Off" : "Camera On"}
        </button>
        <button
          onClick={endVideoCall}
          className="mx-2 px-4 py-2 bg-red-500 rounded-full"
        >
          End Call
        </button>
      </div>
    </div>
  );
};

export default ChatRoom;