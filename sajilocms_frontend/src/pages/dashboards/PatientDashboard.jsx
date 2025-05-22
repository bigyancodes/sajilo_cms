import React, { useState, useContext, useEffect } from "react";
import { Link } from "react-router-dom";
import { AuthContext } from "../../context/AuthContext";
import PatientAppointments from "../../components/appointments/PatientAppointments";
import PatientEHRDashboard from "../../components/ehr/PatientEHRDashboard";
import CommunicationList from "../../components/communication/CommunicationList";
import Chatbot from "../../components/chatbot/Chatbot";

// Import pharmacy components
import MedicineList from "../../components/pharmacy/MedicineList";
import Cart from "../../components/pharmacy/Cart";
import OrderList from "../../components/pharmacy/OrderList";

// Import billing services
import { getBillsByPatient } from "../../api/billingService";

// Import profile component
import UserProfile from "../../components/profile/UserProfile";

const PatientDashboard = () => {
  const { user } = useContext(AuthContext);
  // Get active section from localStorage or default to "appointments"
  const [activeSection, setActiveSection] = useState(() => {
    const savedSection = localStorage.getItem('activeSection');
    return savedSection || "appointments";
  });
  
  // Get profile visibility from localStorage or default to false
  const [showProfile, setShowProfile] = useState(() => {
    return localStorage.getItem('showProfile') === 'true';
  });
  // State for managing the active tab in the appointments section
  const [appointmentView, setAppointmentView] = useState("upcoming"); // 'upcoming' or 'past'
  
  // State for managing the active tab in the pharmacy section
  const [pharmacyTab, setPharmacyTab] = useState(0); // 0: Browse Medicines, 1: My Cart, 2: My Orders

  // Save activeSection to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('activeSection', activeSection);
  }, [activeSection]);

  // Save showProfile to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('showProfile', showProfile.toString());
  }, [showProfile]);

  // Fetch bills when the billing section is active
  useEffect(() => {
    if (activeSection === "billing") {
      setLoadingBills(true);
      getBillsByPatient()
        .then(response => {
          setBills(response.data);
          setLoadingBills(false);
        })
        .catch(error => {
          console.error("Error fetching bills:", error);
          setLoadingBills(false);
        });
    }
  }, [activeSection]);

  // State for managing bills
  const [bills, setBills] = useState([]);
  const [loadingBills, setLoadingBills] = useState(false);

  // Navigation items
  const navItems = [
    { id: "appointments", label: "Appointments", icon: "calendar" },
    { id: "medical-records", label: "Medical Records", icon: "document-text" },
    { id: "communication", label: "Communication", icon: "chat-alt" },
    { id: "ai-assistant", label: "AI Assistant", icon: "lightning-bolt" },
    { id: "pharmacy", label: "Pharmacy", icon: "pill" },
    { id: "billing", label: "My Bills", icon: "cash" }
  ];

  // Icon components (enhanced with consistent styling)
  const icons = {
    calendar: (
      <svg className="w-5 h-5 transition-colors duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
    "document-text": (
      <svg className="w-5 h-5 transition-colors duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
    "chat-alt": (
      <svg className="w-5 h-5 transition-colors duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
      </svg>
    ),
    "lightning-bolt": (
      <svg className="w-5 h-5 transition-colors duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
    pill: (
      <svg className="w-5 h-5 transition-colors duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
    ),
    cash: (
      <svg className="w-5 h-5 transition-colors duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    ),
    
    checkmark: (
      <svg className="h-5 w-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    settings: (
      <svg className="w-5 h-5 transition-colors duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
    user: (
      <svg className="w-5 h-5 transition-colors duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
      </svg>
    )
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Enhanced Left sidebar */}
      <div className="w-64 bg-gradient-to-b from-blue-600 to-blue-700 shadow-xl flex-shrink-0 flex flex-col">
        {/* Header Section */}
        <div className="px-6 py-6 border-b border-blue-500 border-opacity-30">
          <div className="flex items-center">
            <div className="bg-white bg-opacity-20 rounded-full p-2 mr-3">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
            </div>
            <div>
              <h2 className="text-white font-semibold text-lg">HealthCare</h2>
              <p className="text-blue-100 text-xs">Patient Portal</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-4">
          <div className="px-3 space-y-1">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveSection(item.id)}
                className={`flex items-center w-full px-3 py-3 text-left text-sm font-medium rounded-lg transition-all duration-200 group ${
                  activeSection === item.id
                    ? "bg-white text-blue-600 shadow-md transform translate-x-1" 
                    : "text-blue-100 hover:bg-blue-500 hover:bg-opacity-50 hover:text-white hover:translate-x-1"
                }`}
              >
                <span className={`mr-3 ${
                  activeSection === item.id 
                    ? "text-blue-600" 
                    : "text-blue-200 group-hover:text-white"
                }`}>
                  {icons[item.icon]}
                </span>
                <span className="font-medium">{item.label}</span>
                {activeSection === item.id && (
                  <div className="ml-auto w-2 h-2 bg-blue-600 rounded-full"></div>
                )}
              </button>
            ))}
          </div>
        </nav>

        {/* Profile Section at bottom */}
        <div className="px-3 pb-4 border-t border-blue-500 border-opacity-30 pt-4">
          <button 
            onClick={() => {
              setShowProfile(true);
              setActiveSection("none"); // Hide other sections
            }} 
            className="flex items-center w-full px-3 py-3 text-left text-sm font-medium rounded-lg text-blue-100 hover:bg-blue-500 hover:bg-opacity-50 hover:text-white transition-all duration-200 group hover:translate-x-1"
          >
            <span className="mr-3 text-blue-200 group-hover:text-white">
              {icons.settings}
            </span>
            <span className="font-medium">My Profile</span>
            <svg className="ml-auto w-4 h-4 text-blue-200 group-hover:text-white transition-colors duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-6 pt-24"> {/* Added pt-24 for navbar spacing */}
          <div>
            {!showProfile && (
              <>
                <h1 className="text-2xl font-bold text-gray-800 mb-1">
                  {activeSection === "appointments" ? "Appointments" : 
                  activeSection === "medical-records" ? "Medical Records" :
                  activeSection === "communication" ? "Communication" :
                  activeSection === "ai-assistant" ? "AI Assistant" : 
                  activeSection === "pharmacy" ? "Pharmacy" : 
                  activeSection === "billing" ? "My Bills" : ""}
                </h1>
                <p className="text-gray-600 text-sm">
                  {activeSection === "appointments" && "Manage and schedule your healthcare appointments"}
                  {activeSection === "medical-records" && "Access and review your electronic health records"}
                  {activeSection === "communication" && "Message your healthcare providers"}
                  {activeSection === "ai-assistant" && "Get instant answers to your health questions"}
                  {activeSection === "pharmacy" && "View and manage your prescriptions"}
                  {activeSection === "billing" && "View and manage your medical bills"}
                </p>
              </>
            )}
          </div>

          {/* Content sections */}
          {activeSection === "appointments" ? (
            <div className="mt-6">
              <div className="space-y-6">
                <div className="bg-white rounded-lg shadow-sm border border-gray-100">
                  <div className="p-4 border-b border-gray-100 bg-blue-600 text-white rounded-t-lg">
                    <h2 className="text-lg font-semibold">My Appointments</h2>
                    <p className="text-sm text-blue-100">Manage your upcoming and past appointments</p>
                  </div>
                  <div className="p-4">
                    <div className="flex border-b border-gray-200 mb-4">
                      <button 
                        onClick={() => setAppointmentView("upcoming")}
                        className={`px-4 py-2 font-medium ${
                          appointmentView === "upcoming" 
                            ? "text-blue-600 border-b-2 border-blue-600" 
                            : "text-gray-500 hover:text-gray-700"
                        }`}
                      >
                        Upcoming
                      </button>
                      <button 
                        onClick={() => setAppointmentView("past")}
                        className={`px-4 py-2 font-medium ${
                          appointmentView === "past" 
                            ? "text-blue-600 border-b-2 border-blue-600" 
                            : "text-gray-500 hover:text-gray-700"
                        }`}
                      >
                        Past
                      </button>
                    </div>
                    
                    {/* Use the updated PatientAppointments component with props */}
                    <PatientAppointments viewType={appointmentView} hideHeader={true} />
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow-sm border border-gray-100">
                  <div className="p-4 border-b border-gray-100">
                    <h2 className="text-lg font-semibold text-gray-800">Health Tips</h2>
                  </div>
                  <div className="p-4">
                    <ul className="space-y-3 text-sm">
                      <li className="flex items-start">
                        <svg className="h-5 w-5 text-green-500 mt-0.5 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                        </svg>
                        <span>Regular check-ups are key to preventive care</span>
                      </li>
                      <li className="flex items-start">
                        <svg className="h-5 w-5 text-green-500 mt-0.5 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                        </svg>
                        <span>Stay hydrated by drinking 8 glasses of water daily</span>
                      </li>
                      <li className="flex items-start">
                        <svg className="h-5 w-5 text-green-500 mt-0.5 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                        </svg>
                        <span>At least 30 minutes of physical activity daily</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          ) : activeSection === "medical-records" ? (
            <div className="mt-6 bg-white rounded-lg shadow-sm border border-gray-100 p-6">
              <PatientEHRDashboard />
            </div>
          ) : activeSection === "communication" ? (
            <div className="mt-6 bg-white rounded-lg shadow-sm border border-gray-100 p-6">
              <CommunicationList userRole="PATIENT" />
            </div>
          ) : activeSection === "pharmacy" ? (
            <div className="mt-6 bg-white rounded-lg shadow-sm border border-gray-100 p-6">
              <div className="mb-4">
                <h2 className="text-xl font-semibold text-gray-800">Pharmacy</h2>
                <p className="text-gray-600">Browse medicines, manage your cart, and view your orders</p>
              </div>
              
              <div className="mb-6">
                <div className="flex border-b border-gray-200">
                  <button
                    className={`px-4 py-2 font-medium ${pharmacyTab === 0 ? "text-blue-600 border-b-2 border-blue-600" : "text-gray-500 hover:text-gray-700"}`}
                    onClick={() => setPharmacyTab(0)}
                  >
                    <div className="flex items-center">
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                      Browse Medicines
                    </div>
                  </button>
                  <button
                    className={`px-4 py-2 font-medium ${pharmacyTab === 1 ? "text-blue-600 border-b-2 border-blue-600" : "text-gray-500 hover:text-gray-700"}`}
                    onClick={() => setPharmacyTab(1)}
                  >
                    <div className="flex items-center">
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                      My Cart
                    </div>
                  </button>
                  <button
                    className={`px-4 py-2 font-medium ${pharmacyTab === 2 ? "text-blue-600 border-b-2 border-blue-600" : "text-gray-500 hover:text-gray-700"}`}
                    onClick={() => setPharmacyTab(2)}
                  >
                    <div className="flex items-center">
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                      My Orders
                    </div>
                  </button>
                </div>
              </div>
              
              <div>
                {pharmacyTab === 0 && <MedicineList userRole="PATIENT" />}
                {pharmacyTab === 1 && <Cart />}
                {pharmacyTab === 2 && <OrderList />}
              </div>
            </div>
          ) : activeSection === "ai-assistant" ? (
            <div className="mt-6">
              {/* Standard Chatbot Interface */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
                {/* Chat Header */}
                <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                        </svg>
                      </div>
                      <div>
                        <h3 className="font-semibold text-lg">Healthcare AI Assistant</h3>
                        <p className="text-blue-100 text-sm">Online now • Ready to help</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
                      <span className="text-sm text-blue-100">Active</span>
                    </div>
                  </div>
                </div>
                
                {/* Main Chat Container */}
                <div className="h-[500px]">
                  <Chatbot embedded={true} />
                </div>
              </div>
              
              {/* Quick Actions and Help Section */}
              <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Quick Actions */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                    <svg className="w-5 h-5 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    Quick Actions
                  </h3>
                  <div className="grid grid-cols-1 gap-3">
                    <button 
                      onClick={() => {
                        // Trigger message in chatbot
                        const event = new CustomEvent('sendChatMessage', { 
                          detail: { message: 'When is my next appointment?' } 
                        });
                        window.dispatchEvent(event);
                      }}
                      className="w-full text-left p-4 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-all duration-200 group"
                    >
                      <div className="flex items-center">
                        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mr-3 group-hover:bg-blue-200">
                          <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        </div>
                        <div>
                          <span className="text-sm font-medium text-blue-700 group-hover:text-blue-800 block">View My Appointments</span>
                          <span className="text-xs text-blue-600 group-hover:text-blue-700">Check upcoming and past appointments</span>
                        </div>
                      </div>
                    </button>
                    
                    <button 
                      onClick={() => {
                        const event = new CustomEvent('sendChatMessage', { 
                          detail: { message: 'Show me my prescriptions' } 
                        });
                        window.dispatchEvent(event);
                      }}
                      className="w-full text-left p-4 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 transition-all duration-200 group"
                    >
                      <div className="flex items-center">
                        <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center mr-3 group-hover:bg-green-200">
                          <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                          </svg>
                        </div>
                        <div>
                          <span className="text-sm font-medium text-green-700 group-hover:text-green-800 block">Check My Prescriptions</span>
                          <span className="text-xs text-green-600 group-hover:text-green-700">View current medications and dosages</span>
                        </div>
                      </div>
                    </button>
                    
                    <button 
                      onClick={() => {
                        const event = new CustomEvent('sendChatMessage', { 
                          detail: { message: 'List all doctors' } 
                        });
                        window.dispatchEvent(event);
                      }}
                      className="w-full text-left p-4 bg-purple-50 border border-purple-200 rounded-lg hover:bg-purple-100 transition-all duration-200 group"
                    >
                      <div className="flex items-center">
                        <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center mr-3 group-hover:bg-purple-200">
                          <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                        </div>
                        <div>
                          <span className="text-sm font-medium text-purple-700 group-hover:text-purple-800 block">Find Doctors</span>
                          <span className="text-xs text-purple-600 group-hover:text-purple-700">Search for specialists and availability</span>
                        </div>
                      </div>
                    </button>
                    
                    <button 
                      onClick={() => {
                        const event = new CustomEvent('sendChatMessage', { 
                          detail: { message: 'Show my medical records' } 
                        });
                        window.dispatchEvent(event);
                      }}
                      className="w-full text-left p-4 bg-orange-50 border border-orange-200 rounded-lg hover:bg-orange-100 transition-all duration-200 group"
                    >
                      <div className="flex items-center">
                        <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center mr-3 group-hover:bg-orange-200">
                          <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        </div>
                        <div>
                          <span className="text-sm font-medium text-orange-700 group-hover:text-orange-800 block">Medical Records</span>
                          <span className="text-xs text-orange-600 group-hover:text-orange-700">Access your health history and reports</span>
                        </div>
                      </div>
                    </button>
                  </div>
                </div>
                
                {/* Common Questions */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                    <svg className="w-5 h-5 mr-2 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 .895 4 2s-1.79 2-4 2-4-.895-4-2 1.79-2 4-2zM13.5 12c0 .552-.895 1-2 1s-2-.448-2-1 .895-1 2-1 2 .448 2 1zM7 20l4-16m6 16l4-16" />
                    </svg>
                    Common Questions
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <h4 className="text-sm font-medium text-blue-700 mb-3">Appointments</h4>
                      <div className="space-y-2">
                        <button 
                          onClick={() => {
                            const event = new CustomEvent('sendChatMessage', { 
                              detail: { message: 'When is my next appointment?' } 
                            });
                            window.dispatchEvent(event);
                          }}
                          className="block w-full text-left text-xs text-gray-600 bg-gray-50 p-3 rounded-lg border-l-4 border-blue-300 hover:bg-blue-50 hover:border-blue-400 transition-colors"
                        >
                          "When is my next appointment?"
                        </button>
                        <button 
                          onClick={() => {
                            const event = new CustomEvent('sendChatMessage', { 
                              detail: { message: 'Do I have any appointments this week?' } 
                            });
                            window.dispatchEvent(event);
                          }}
                          className="block w-full text-left text-xs text-gray-600 bg-gray-50 p-3 rounded-lg border-l-4 border-blue-300 hover:bg-blue-50 hover:border-blue-400 transition-colors"
                        >
                          "Do I have any appointments this week?"
                        </button>
                      </div>
                    </div>
                    
                    <div>
                      <h4 className="text-sm font-medium text-green-700 mb-3">Health Records</h4>
                      <div className="space-y-2">
                        <button 
                          onClick={() => {
                            const event = new CustomEvent('sendChatMessage', { 
                              detail: { message: 'Show my recent test results' } 
                            });
                            window.dispatchEvent(event);
                          }}
                          className="block w-full text-left text-xs text-gray-600 bg-gray-50 p-3 rounded-lg border-l-4 border-green-300 hover:bg-green-50 hover:border-green-400 transition-colors"
                        >
                          "Show my recent test results"
                        </button>
                        <button 
                          onClick={() => {
                            const event = new CustomEvent('sendChatMessage', { 
                              detail: { message: 'What is my blood pressure history?' } 
                            });
                            window.dispatchEvent(event);
                          }}
                          className="block w-full text-left text-xs text-gray-600 bg-gray-50 p-3 rounded-lg border-l-4 border-green-300 hover:bg-green-50 hover:border-green-400 transition-colors"
                        >
                          "What is my blood pressure history?"
                        </button>
                      </div>
                    </div>
                    
                    <div>
                      <h4 className="text-sm font-medium text-purple-700 mb-3">Medications</h4>
                      <div className="space-y-2">
                        <button 
                          onClick={() => {
                            const event = new CustomEvent('sendChatMessage', { 
                              detail: { message: 'What medications am I taking?' } 
                            });
                            window.dispatchEvent(event);
                          }}
                          className="block w-full text-left text-xs text-gray-600 bg-gray-50 p-3 rounded-lg border-l-4 border-purple-300 hover:bg-purple-50 hover:border-purple-400 transition-colors"
                        >
                          "What medications am I taking?"
                        </button>
                        <button 
                          onClick={() => {
                            const event = new CustomEvent('sendChatMessage', { 
                              detail: { message: 'When should I take my medicine?' } 
                            });
                            window.dispatchEvent(event);
                          }}
                          className="block w-full text-left text-xs text-gray-600 bg-gray-50 p-3 rounded-lg border-l-4 border-purple-300 hover:bg-purple-50 hover:border-purple-400 transition-colors"
                        >
                          "When should I take my medicine?"
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : activeSection === "billing" ? (
            <div className="mt-6 bg-white rounded-lg shadow-sm border border-gray-100 p-6">
              <div className="mb-6">
                <h2 className="text-xl font-semibold text-gray-800">My Bills</h2>
                <p className="mt-2 text-gray-600 text-sm">
                  View and manage your medical appointment bills
                </p>
              </div>
              
              {loadingBills ? (
                <div className="p-6 text-center">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  <p className="mt-2 text-gray-600">Loading your bills...</p>
                </div>
              ) : bills.length === 0 ? (
                <div className="p-6 text-center">
                  <p className="text-gray-600">You don't have any bills yet.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Doctor</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {bills.map((bill) => (
                        <tr key={bill.id}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {bill.bill_date ? bill.bill_date : 
                             bill.appointment_details && bill.appointment_details.appointment_date ? 
                             bill.appointment_details.appointment_date : 
                             bill.created_at ? new Date(bill.created_at).toLocaleDateString() : 'N/A'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">
                              {bill.appointment_details && bill.appointment_details.doctor_name ? 
                                bill.appointment_details.doctor_name : 'Doctor information not available'}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            NPR {bill.amount ? bill.amount.toLocaleString() : '0'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                              bill.status === 'PAID' ? 'bg-green-100 text-green-800' :
                              bill.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                              bill.status === 'REFUNDED' ? 'bg-blue-100 text-blue-800' :
                              'bg-red-100 text-red-800'
                            }`}>
                              {bill.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            {bill.status === 'PENDING' && (
                              <Link 
                                to={`/bill/${bill.id}`}
                                className="text-blue-600 hover:text-blue-900 bg-blue-50 px-3 py-1 rounded-md"
                              >
                                View & Pay
                              </Link>
                            )}
                            {bill.status !== 'PENDING' && (
                              <Link 
                                to={`/bill/${bill.id}`}
                                className="text-gray-600 hover:text-gray-900 bg-gray-50 px-3 py-1 rounded-md"
                              >
                                View Details
                              </Link>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ) : showProfile ? (
        <div className="bg-white shadow-sm rounded-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
            <div>
              <h2 className="text-xl font-semibold text-gray-800">My Profile</h2>
              <p className="text-gray-600 text-sm mt-1">View and update your profile information</p>
            </div>
            <button 
              onClick={() => {
                setShowProfile(false);
                setActiveSection("appointments");
              }}
              className="text-gray-500 hover:text-gray-700"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="max-w-3xl mx-auto">
            <UserProfile />
          </div>
        </div>
      ) : null}
        </div>
      </div>
    </div>
  );
}

export default PatientDashboard;