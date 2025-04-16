import React, { useState } from "react";

const Tabs = () => {
  const [activeTab, setActiveTab] = useState("recent");
  
  const tabs = [
    { id: "recent", label: "Recent" },
    { id: "shared", label: "Shared" },
    { id: "favorites", label: "Favorites" },
    { id: "all", label: "All files" }
  ];
  
  return (
    <div className="border-b border-gray-200">
      <nav className="flex">
        {tabs.map(tab => (
          <button
            key={tab.id}
            className={`px-4 py-2 font-medium text-sm ${
              activeTab === tab.id
                ? "text-indigo-900 bg-indigo-50 rounded-t-lg border-b-2 border-indigo-500"
                : "text-gray-500 hover:text-gray-700"
            }`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </nav>
    </div>
  );
};

export default Tabs;