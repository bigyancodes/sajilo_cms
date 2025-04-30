// src/components/communication/CommunicationList.jsx
import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { rootAxiosInstance } from "../../api/axiosInstance";
import VideoCall from "./VideoCall";

const CommunicationList = ({ userRole }) => {
  const [chatPartners, setChatPartners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [videoCallData, setVideoCallData] = useState(null);
  const [selectedPartnerId, setSelectedPartnerId] = useState(null);

  useEffect(() => {
    const fetchChatPartners = async () => {
      try {
        setLoading(true);
        const response = await rootAxiosInstance.get("/communication/get_chat_partners/");
        // Deduplicate partners
        const uniquePartners = response.data.reduce((acc, partner) => {
          if (!acc.some((p) => p.id === partner.id)) {
            acc.push(partner);
          }
          return acc;
        }, []);
        setChatPartners(uniquePartners);
        setError(null);
      } catch (err) {
        console.error("Error fetching chat partners:", err);
        setError("Failed to load your connections. Please try again later.");
      } finally {
        setLoading(false);
      }
    };

    fetchChatPartners();
  }, []);

  const startVideoCall = async (partnerId) => {
    try {
      const response = await rootAxiosInstance.post("/communication/start_video_call/", {
        target_user_id: partnerId,
      });
      const { token, channel_name, app_id } = response.data;
      
      // Include app_id in the data passed to the VideoCall component
      setVideoCallData({ token, channelName: channel_name, appId: app_id });
      setSelectedPartnerId(partnerId);
    } catch (err) {
      console.error("Failed to start video call:", err);
      setError("Failed to start video call: " + (err.response?.data?.error || err.message));
    }
  };

  const endVideoCall = () => {
    setVideoCallData(null);
    setSelectedPartnerId(null);
  };

  return (
    <>
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
          <h3 className="text-lg leading-6 font-medium text-gray-900">
            {userRole === "DOCTOR" ? "Patient Communications" : "Doctor Communications"}
          </h3>
          <p className="mt-1 max-w-2xl text-sm text-gray-500">
            Chat with your {userRole === "DOCTOR" ? "patients" : "doctors"} after completed appointments.
          </p>
        </div>

        {loading ? (
          <div className="p-6 text-center">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500 mx-auto"></div>
            <p className="mt-2 text-gray-600">Loading communications...</p>
          </div>
        ) : error ? (
          <div className="p-6 text-center text-red-600">{error}</div>
        ) : chatPartners.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            <p>No communication history found.</p>
            <p className="mt-2 text-sm">
              {userRole === "PATIENT"
                ? "You'll be able to message your doctors after completing an appointment."
                : "You'll be able to message your patients after completing an appointment."}
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-200">
            {chatPartners.map((partner) => (
              <li key={partner.id}>
                <div className="px-4 py-4 flex items-center sm:px-6">
                  <div className="min-w-0 flex-1 sm:flex sm:items-center sm:justify-between">
                    <div>
                      <div className="flex text-sm">
                        <p className="font-medium text-blue-600 truncate">
                          {partner.first_name} {partner.last_name}
                        </p>
                        <p className="ml-1 flex-shrink-0 font-normal text-gray-500">
                          {partner.role === "DOCTOR" ? "Doctor" : "Patient"}
                        </p>
                      </div>
                      <div className="mt-2 flex">
                        <div className="flex items-center text-sm text-gray-500">
                          <svg
                            className="flex-shrink-0 mr-1.5 h-5 w-5 text-gray-400"
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 20 20"
                            fill="currentColor"
                          >
                            <path
                              fillRule="evenodd"
                              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-6-3a2 2 0 11-4 0 2 2 0 014 0zm-2 4a5 5 0 00-4.546 2.916A5.986 5.986 0 0010 16a5.986 5.986 0 004.546-2.084A5 5 0 0010 11z"
                              clipRule="evenodd"
                            />
                          </svg>
                          <span>{partner.email}</span>
                        </div>
                      </div>
                    </div>
                    <div className="mt-4 flex-shrink-0 sm:mt-0 flex space-x-2">
                      <button
                        onClick={() => startVideoCall(partner.id)}
                        className="p-2 bg-green-500 rounded-full hover:bg-green-600"
                        title="Start Video Call"
                      >
                        <svg
                          className="h-5 w-5 text-white"
                          fill="none"
                          stroke="currentColor"
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
                      <Link to={`/chat/${partner.id}`} className="block hover:bg-gray-50">
                        <div className="flex overflow-hidden">
                          <svg
                            className="h-5 w-5 text-gray-400"
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 20 20"
                            fill="currentColor"
                            aria-hidden="true"
                          >
                            <path
                              fillRule="evenodd"
                              d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                              clipRule="evenodd"
                            />
                          </svg>
                        </div>
                      </Link>
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {videoCallData && selectedPartnerId && (
        <VideoCall
          channelName={videoCallData.channelName}
          token={videoCallData.token}
          appId={videoCallData.appId} 
          onClose={endVideoCall}
        />
      )}
    </>
  );
};

export default CommunicationList;