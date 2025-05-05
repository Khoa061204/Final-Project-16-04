import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import Sidebar from "../components/Sidebar";
import Topbar from "../components/Topbar";

function UploadFile() {
  const navigate = useNavigate();
  const [file, setFile] = useState(null);
  const [message, setMessage] = useState("");
  const [progress, setProgress] = useState(0);
  const [loading, setLoading] = useState(false);

  // Configure AWS S3 client
  const s3Client = new S3Client({
    region: process.env.REACT_APP_AWS_REGION,
    credentials: {
      accessKeyId: process.env.REACT_APP_AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.REACT_APP_AWS_SECRET_ACCESS_KEY,
    },
  });

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
    setMessage("");
    setProgress(0);
  };

  const handleUpload = async () => {
    if (!file) {
      setMessage("Please select a file first");
      return;
    }

    setLoading(true);
    setMessage("Uploading to AWS S3...");

    const params = {
      Bucket: process.env.REACT_APP_AWS_BUCKET_NAME,
      Key: `uploads/${Date.now()}_${file.name}`,
      Body: file,
      ContentType: file.type,
    };

    try {
      const command = new PutObjectCommand(params);
      await s3Client.send(command);
      
      setMessage("✅ File uploaded successfully to AWS S3!");
      setProgress(100);
      
      // Generate public URL (if bucket is public)
      const fileUrl = `https://${params.Bucket}.s3.${process.env.REACT_APP_AWS_REGION}.amazonaws.com/${params.Key}`;
      console.log("File URL:", fileUrl);
      
      // You can save this URL to your database here
      
    } catch (error) {
      console.error("AWS Upload Error:", error);
      setMessage(`❌ Upload failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <div className="flex flex-col flex-1">
        <Topbar />
        <main className="p-6 overflow-y-auto">
          <div className="max-w-md mx-auto bg-white p-6 rounded-lg shadow">
            <button 
              onClick={() => navigate(-1)}
              className="mb-4 text-blue-600 hover:text-blue-800"
            >
              ← Back to Home
            </button>
            
            <h2 className="text-xl font-semibold mb-4">Upload File</h2>
            
            <input
              type="file"
              onChange={handleFileChange}
              disabled={loading}
              className="block w-full mb-4 p-2 border rounded"
            />
            
            {progress > 0 && (
              <div className="w-full bg-gray-200 rounded-full h-2.5 mb-4">
                <div 
                  className="bg-blue-600 h-2.5 rounded-full" 
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
            )}
            
            <button
              onClick={handleUpload}
              disabled={loading || !file}
              className={`w-full py-2 px-4 rounded-md text-white font-medium ${
                loading || !file ? "bg-gray-400" : "bg-blue-600 hover:bg-blue-700"
              }`}
            >
              {loading ? "Uploading to AWS..." : "Upload File"}
            </button>
            
            {message && (
              <div className={`mt-4 p-3 rounded-md ${
                message.includes("✅") ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
              }`}>
                {message}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

export default UploadFile;