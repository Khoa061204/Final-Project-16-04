import React, { useState } from "react";
import Sidebar from "../components/Sidebar";
import Topbar from "../components/Topbar";
import FolderCard from "../components/FolderCard";
import ActionCard from "../components/ActionCard";
import Tabs from "../components/Tabs";

function UploadFilePage() {
  const [file, setFile] = useState(null);
  const [message, setMessage] = useState("");
  const [fileUrl, setFileUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
    setMessage("");
    setFileUrl("");
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files.length) {
      setFile(e.dataTransfer.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setMessage("Please select a file first.");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);
    setLoading(true);

    try {
      const response = await fetch("http://localhost:5000/upload", {
        method: "POST",
        body: formData,
      });

      const result = await response.json();
      if (response.ok) {
        setFileUrl(result.fileUrl || "");
        setMessage("File uploaded successfully!");
      } else {
        setMessage("Upload failed. Please try again.");
      }
    } catch (error) {
      console.error("Upload error:", error);
      setMessage("An error occurred during upload.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <Topbar />
        
        <main className="flex-1 overflow-y-auto p-8">
          <div className="max-w-3xl mx-auto">
            <h1 className="text-2xl font-semibold text-gray-800 mb-6">Upload Files</h1>
            
            <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
              <div 
                className={`border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-colors ${
                  isDragOver ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-blue-400 hover:bg-blue-50'
                }`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => document.getElementById('file-input').click()}
              >
                <div className="flex flex-col items-center justify-center space-y-2">
                  <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path>
                  </svg>
                  <p className="text-gray-600">
                    {file ? (
                      <span className="font-medium text-blue-600">{file.name}</span>
                    ) : (
                      <>
                        <span className="font-medium text-blue-600">Click to upload</span> or drag and drop
                      </>
                    )}
                  </p>
                  <p className="text-sm text-gray-500">PNG, JPG, GIF up to 10MB</p>
                </div>
                <input
                  id="file-input"
                  type="file"
                  className="hidden"
                  onChange={handleFileChange}
                />
              </div>

              <div className="mt-4 flex justify-end">
                <button
                  onClick={handleUpload}
                  disabled={!file || loading}
                  className={`px-6 py-2 rounded-md text-white font-medium ${
                    !file || loading ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
                  }`}
                >
                  {loading ? (
                    <span className="flex items-center">
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Uploading...
                    </span>
                  ) : 'Upload'}
                </button>
              </div>

              {message && (
                <div className={`mt-4 p-3 rounded-md ${
                  message.includes('success') ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                }`}>
                  {message}
                </div>
              )}

              {fileUrl && (
                <div className="mt-4 p-3 bg-blue-50 rounded-md">
                  <p className="text-blue-700 break-all">
                    File URL: <a href={fileUrl} target="_blank" rel="noopener noreferrer" className="underline">{fileUrl}</a>
                  </p>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <ActionCard 
                icon="📄" 
                title="New Document" 
                description="Create a new text document"
              />
              <ActionCard 
                icon="📂" 
                title="New Folder" 
                description="Organize your files"
              />
              <ActionCard 
                icon="👥" 
                title="Share" 
                description="Collaborate with others"
              />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

export default UploadFilePage;