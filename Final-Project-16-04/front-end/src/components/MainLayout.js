import React, { useState } from "react";
import Sidebar from "./Sidebar";
import { MdChevronRight, MdChevronLeft } from 'react-icons/md';

export default function MainLayout({ children, teams }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  return (
    <div className="flex h-screen bg-[#f3f2f1] font-sans relative" style={{fontFamily: 'Segoe UI, sans-serif'}}>
      {/* Mobile sidebar backdrop */}
      <div 
        className={`fixed inset-0 bg-gray-800/30 transition-opacity duration-300 lg:hidden ${
          isSidebarOpen ? 'opacity-100 z-40' : 'opacity-0 pointer-events-none'
        }`}
        onClick={() => setIsSidebarOpen(false)}
      />

      {/* Sidebar */}
      {isSidebarOpen && (
        <div className="fixed lg:static lg:flex-shrink-0 z-50 transition-transform duration-500 transform lg:transform-none translate-x-0" style={{left: 0, top: 0, height: '100vh'}}>
          <Sidebar teams={teams} onClose={() => setIsSidebarOpen(false)} />
        </div>
      )}
      {/* Hide sidebar button - outside, next to sidebar */}
      {isSidebarOpen && (
        <button
          className="fixed left-64 top-1/2 -translate-y-1/2 z-50 bg-white border-l-2 border-gray-200 rounded-none w-9 h-16 hover:bg-blue-50 transition-colors flex items-center justify-center active:scale-95"
          style={{transition: 'left 0.3s'}}
          onClick={() => setIsSidebarOpen(false)}
          title="Hide sidebar"
        >
          <MdChevronLeft className="h-6 w-6 text-[#0078d4] hover:text-[#005a9e] transition-colors" />
        </button>
      )}
      {/* Show sidebar button when hidden */}
      {!isSidebarOpen && (
        <button
          className="fixed left-0 top-1/2 -translate-y-1/2 z-50 bg-white border-r-2 border-gray-200 rounded-none w-9 h-16 hover:bg-blue-50 transition-colors flex items-center justify-center active:scale-95"
          style={{transition: 'left 0.3s'}}
          onClick={() => setIsSidebarOpen(true)}
          title="Show sidebar"
        >
          <MdChevronRight className="h-6 w-6 text-[#0078d4] hover:text-[#005a9e] transition-colors" />
        </button>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        {/* Mobile header */}
        <div className="lg:hidden flex items-center px-4 py-2 border-b bg-white rounded-md shadow-sm">
          <button
            onClick={() => setIsSidebarOpen(true)}
            className="p-2 rounded-md hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-primary/50"
          >
            <svg className="h-6 w-6 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>

        {/* Content area */}
        <main className="flex-1 overflow-auto bg-[#f3f2f1]">
          <div className="container mx-auto px-4 py-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
} 