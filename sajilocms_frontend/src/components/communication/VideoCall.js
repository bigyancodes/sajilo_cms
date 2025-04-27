// src/components/communication/VideoCall.js
import React, { useEffect, useRef, useState } from "react";

const VideoCall = ({ channelName, token, appId, onClose }) => {
  const [localAudioEnabled, setLocalAudioEnabled] = useState(true);
  const [localVideoEnabled, setLocalVideoEnabled] = useState(true);
  const [remoteUser, setRemoteUser] = useState(null);
  const [error, setError] = useState(null);
  
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const rtcClient = useRef(null);
  const localTracks = useRef({ audioTrack: null, videoTrack: null });
  
  // Initialize Agora RTC
  useEffect(() => {
    let mounted = true;
    
    const initializeCall = async () => {
      try {
        // Create RTC client
        const AgoraRTC = window.AgoraRTC || { createClient: () => null };
        const client = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' });
        rtcClient.current = client;
        
        // Set up event handlers
        client.on('user-published', handleUserPublished);
        client.on('user-unpublished', handleUserUnpublished);
        client.on('user-joined', handleUserJoined);
        client.on('user-left', handleUserLeft);
        
        // Join the channel
        console.log("Joining channel with token:", token ? "provided" : "missing");
        
        await client.join(
          appId, // Use the app_id passed from props
          channelName, 
          token,
          null // Use null to let Agora auto-assign a uid
        );
        
        if (mounted) {
          // Create local tracks
          const [microphoneTrack, cameraTrack] = await AgoraRTC.createMicrophoneAndCameraTracks();
          localTracks.current.audioTrack = microphoneTrack;
          localTracks.current.videoTrack = cameraTrack;
          
          // Play local video
          if (localVideoRef.current) {
            cameraTrack.play(localVideoRef.current);
          }
          
          // Publish local tracks
          await client.publish([microphoneTrack, cameraTrack]);
          console.log("Successfully published local tracks");
        }
      } catch (err) {
        console.error("Error joining video call:", err);
        if (mounted) {
          setError("Failed to join video call. Please check your camera and microphone permissions.");
        }
      }
    };
    
    initializeCall();
    
    // Cleanup function
    return () => {
      mounted = false;
      leaveCall();
    };
  }, [channelName, token, appId]);
  
  const handleUserJoined = (user) => {
    console.log("User joined:", user.uid);
    setRemoteUser(user);
  };
  
  const handleUserLeft = (user) => {
    console.log("User left:", user.uid);
    setRemoteUser(null);
  };
  
  // Handle user published event
  const handleUserPublished = async (user, mediaType) => {
    // Subscribe to the remote user
    await rtcClient.current.subscribe(user, mediaType);
    console.log("Subscribed to", mediaType, "from user", user.uid);
    
    if (mediaType === 'video') {
      // Play the remote video
      if (remoteVideoRef.current) {
        user.videoTrack.play(remoteVideoRef.current);
      }
    }
    
    if (mediaType === 'audio') {
      user.audioTrack.play();
    }
    
    setRemoteUser(user);
  };
  
  // Handle user unpublished event
  const handleUserUnpublished = (user, mediaType) => {
    console.log("User unpublished:", user.uid, mediaType);
  };
  
  // Leave the call
  const leaveCall = async () => {
    try {
      // Stop and close local tracks
      if (localTracks.current.audioTrack) {
        localTracks.current.audioTrack.close();
      }
      
      if (localTracks.current.videoTrack) {
        localTracks.current.videoTrack.close();
      }
      
      // Leave the channel
      if (rtcClient.current) {
        await rtcClient.current.leave();
      }
    } catch (err) {
      console.error("Error leaving call:", err);
    }
  };
  
  // Toggle audio
  const toggleAudio = () => {
    if (localTracks.current.audioTrack) {
      if (localAudioEnabled) {
        localTracks.current.audioTrack.setEnabled(false);
      } else {
        localTracks.current.audioTrack.setEnabled(true);
      }
      setLocalAudioEnabled(!localAudioEnabled);
    }
  };
  
  // Toggle video
  const toggleVideo = () => {
    if (localTracks.current.videoTrack) {
      if (localVideoEnabled) {
        localTracks.current.videoTrack.setEnabled(false);
      } else {
        localTracks.current.videoTrack.setEnabled(true);
      }
      setLocalVideoEnabled(!localVideoEnabled);
    }
  };
  
  const handleEndCall = () => {
    leaveCall();
    onClose();
  };
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl p-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium">Video Call</h3>
          <button 
            onClick={handleEndCall}
            className="text-gray-500 hover:text-gray-700"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        {error ? (
          <div className="p-4 text-center text-red-500">{error}</div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            {/* Local video */}
            <div className="relative">
              <div ref={localVideoRef} className="w-full h-64 bg-gray-200 rounded"></div>
              <div className="absolute bottom-2 left-2 text-white bg-black bg-opacity-50 px-2 py-1 rounded text-sm">
                You
              </div>
            </div>
            
            {/* Remote video */}
            <div className="relative">
              <div ref={remoteVideoRef} className="w-full h-64 bg-gray-200 rounded"></div>
              <div className="absolute bottom-2 left-2 text-white bg-black bg-opacity-50 px-2 py-1 rounded text-sm">
                {remoteUser ? "Remote User" : "Waiting for other user..."}
              </div>
            </div>
          </div>
        )}
        
        {/* Call controls */}
        <div className="flex justify-center mt-4 space-x-4">
          <button
            onClick={toggleAudio}
            className="p-3 rounded-full bg-gray-200 hover:bg-gray-300"
            title={localAudioEnabled ? "Mute" : "Unmute"}
          >
            {localAudioEnabled ? (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" clipRule="evenodd" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
              </svg>
            )}
          </button>
          
          <button
            onClick={toggleVideo}
            className="p-3 rounded-full bg-gray-200 hover:bg-gray-300"
            title={localVideoEnabled ? "Turn off camera" : "Turn on camera"}
          >
            {localVideoEnabled ? (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )}
          </button>
          
          <button
            onClick={handleEndCall}
            className="p-3 rounded-full bg-red-500 hover:bg-red-600"
            title="End call"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 8l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M5 3a2 2 0 00-2 2v1c0 8.284 6.716 15 15 15h1a2 2 0 002-2v-3.28a1 1 0 00-.684-.948l-4.493-1.498a1 1 0 00-1.21.502l-1.13 2.257a11.042 11.042 0 01-5.516-5.517l2.257-1.128a1 1 0 00.502-1.21L9.228 3.683A1 1 0 008.279 3H5z" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};

export default VideoCall;