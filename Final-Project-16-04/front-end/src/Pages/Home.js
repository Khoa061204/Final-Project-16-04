import React from "react";
import Sidebar from "../components/Sidebar";
import TopBar from "../components/Topbar";
import FolderCard from "../components/FolderCard";
import ActionCard from "../components/ActionCard";  // Import ActionCard
import Tabs from "../components/Tabs";  // Import Tabs

const Home = () => {
  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <div className="flex flex-col flex-1">
        <TopBar />
        <main className="p-6">
          <h1 className="text-2xl font-semibold mb-4">Welcome back</h1>

          <div className="flex gap-4 mb-6">
            <ActionCard title="New document" />
            <ActionCard title="New project" />
            <ActionCard title="New team" />
            <ActionCard title="New organization" />
          </div>

          <Tabs />

          <div className="grid grid-cols-3 gap-6 mt-4">
            {/* Replace with dynamic data later */}
            <FolderCard title="3D renders" size="92 MB" items="18 images" />
            <FolderCard title="Team photos" size="188 MB" items="32 images" />
            <FolderCard title="UI presentations" size="286 MB" items="6 files" />
          </div>
        </main>
      </div>
    </div>
  );
};

export default Home;
