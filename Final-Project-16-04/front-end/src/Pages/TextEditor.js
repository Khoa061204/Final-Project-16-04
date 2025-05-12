// front-end/src/Pages/DocumentList.js
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Topbar from '../components/Topbar';

const DocumentList = () => {
  const [documents, setDocuments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  // Get auth token from localStorage
  const getToken = () => localStorage.getItem('token');

  // Fetch documents from server
  useEffect(() => {
    const fetchDocuments = async () => {
      try {
        const response = await fetch('http://localhost:5000/documents', {
          headers: {
            'Authorization': `Bearer ${getToken()}`
          }
        });
        
        if (!response.ok) {
          throw new Error('Failed to fetch documents');
        }
        
        const data = await response.json();
        setDocuments(data.documents || []);
        setIsLoading(false);
      } catch (err) {
        console.error('Error fetching documents:', err);
        setError('Failed to load documents. Please try again later.');
        setIsLoading(false);
      }
    };
    
    fetchDocuments();
  }, []);

  // Create a new document
  const createNewDocument = async () => {
    try {
      const response = await fetch('http://localhost:5000/documents', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getToken()}`
        },
        body: JSON.stringify({ title: 'Untitled Document' })
      });
      
      if (!response.ok) {
        throw new Error('Failed to create document');
      }
      
      const data = await response.json();
      
      // Navigate to the new document
      navigate(`/documents/${data.document.id}`);
    } catch (err) {
      console.error('Error creating document:', err);
      setError('Failed to create document. Please try again.');
    }
  };

  // Format date string
  const formatDate = (dateString) => {
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  // Render document content
  const renderContent = () => {
    // If still loading, show loading state
    if (isLoading) {
      return (
        <div className="flex flex-col items-center justify-center h-full">
          <div className="w-10 h-10 border-4 border-gray-200 border-t-blue-500 rounded-full animate-spin mb-4"></div>
          <p className="text-gray-600">Loading documents...</p>
        </div>
      );
    }

    // If error occurred, show error message
    if (error) {
      return (
        <div className="flex flex-col items-center justify-center h-full text-center px-4">
          <h2 className="text-red-500 text-xl font-semibold mb-2">Error</h2>
          <p className="text-gray-600">{error}</p>
        </div>
      );
    }

    return (
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-semibold text-gray-800">My Documents</h1>
          <button 
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md font-medium transition-colors"
            onClick={createNewDocument}
          >
            Create New Document
          </button>
        </div>

        {documents.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg shadow-sm border border-gray-200">
            <p className="text-gray-600 mb-4">You don't have any documents yet.</p>
            <button 
              className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md font-medium transition-colors"
              onClick={createNewDocument}
            >
              Create Your First Document
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {documents.map(doc => (
              <Link 
                to={`/documents/${doc.id}`} 
                className="border border-gray-200 rounded-md p-4 hover:shadow-md transition-shadow bg-white flex flex-col" 
                key={doc.id}
              >
                <h3 className="font-medium text-gray-800 mb-2 truncate">{doc.title}</h3>
                <p className="text-gray-500 text-sm mt-auto">
                  Last edited: {formatDate(doc.updatedAt)}
                </p>
              </Link>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex h-screen">
      <Sidebar />
      <div className="flex flex-col flex-1 overflow-hidden">
        <Topbar />
        <div className="flex-1 overflow-auto bg-gray-50">
          {renderContent()}
        </div>
      </div>
    </div>
  );
};

export default DocumentList;