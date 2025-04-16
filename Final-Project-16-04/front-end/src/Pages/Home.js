import React from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import Topbar from "../components/Topbar";
import FolderCard from "../components/FolderCard";
import ActionCard from "../components/ActionCard";
import Tabs from "../components/Tabs";

const Home = () => {
  const navigate = useNavigate();

  const actionItems = [
    { 
      title: "New document", 
      color: "violet", 
      icon: "📄",
      onClick: () => console.log("New document clicked")
    },
    { 
      title: "Upload file", 
      color: "blue", 
      icon: "⬆️",
      onClick: () => {console.log("Upload button clicked!"); // Basic verification
      navigate("/upload");}},
    { 
      title: "New team", 
      color: "green", 
      icon: "👥",
      onClick: () => console.log("New team clicked")
    },
    { 
      title: "New organization", 
      color: "orange", 
      icon: "🏢",
      onClick: () => console.log("New organization clicked")
    }
  ];
  
  const folderItems = [
    { title: "3D renders", size: "92 MB", items: "18 images" },
    { title: "Team photos", size: "188 MB", items: "32 images" },
    { title: "UI presentations", size: "286 MB", items: "6 files" }
  ];
  
  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <div className="flex flex-col flex-1">
        <Topbar />
        <main className="p-6 overflow-y-auto">
          <h1 className="text-2xl font-semibold mb-6 text-indigo-900">Welcome back</h1>

          <div className="flex gap-4 mb-8 flex-wrap">
            {actionItems.map((item, index) => (
              <ActionCard 
                key={index}
                title={item.title}
                color={item.color}
                icon={item.icon}
                onClick={item.onClick}
              />
            ))}
          </div>

          <Tabs />

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
            {folderItems.map((folder, index) => (
              <FolderCard
                key={index}
                title={folder.title}
                size={folder.size}
                items={folder.items}
              />
            ))}
          </div>
        </main>
      </div>
    </div>
  );
};

export default Home;