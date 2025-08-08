import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaHome, FaChevronRight } from 'react-icons/fa';
import { getAuthHeaders } from '../utils/auth';

const Breadcrumb = ({ folderId }) => {
  const [breadcrumb, setBreadcrumb] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchBreadcrumb = async () => {
      if (!folderId) {
        setBreadcrumb([{ id: null, name: 'Home' }]);
        return;
      }

      setIsLoading(true);
      try {
        const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';
        const response = await fetch(`${API_BASE_URL}/folders/${folderId}/breadcrumb`, {
          headers: getAuthHeaders()
        });
        
        if (response.ok) {
          const data = await response.json();
          setBreadcrumb(data.breadcrumb || []);
        } else {
          console.error('Failed to fetch breadcrumb');
          setBreadcrumb([{ id: null, name: 'Home' }]);
        }
      } catch (error) {
        console.error('Error fetching breadcrumb:', error);
        setBreadcrumb([{ id: null, name: 'Home' }]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchBreadcrumb();
  }, [folderId]);

  const handleBreadcrumbClick = (item) => {
    if (item.id === null) {
      navigate('/');
    } else {
      navigate(`/folder/${item.id}`);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center space-x-2 text-sm text-gray-500 mb-4">
        <div className="animate-pulse bg-gray-200 h-4 w-20 rounded"></div>
      </div>
    );
  }

  return (
    <nav className="flex items-center space-x-2 text-sm text-gray-600 mb-4">
      {breadcrumb.map((item, index) => (
        <React.Fragment key={item.id || 'home'}>
          {index > 0 && (
            <FaChevronRight className="w-3 h-3 text-gray-400" />
          )}
          <button
            onClick={() => handleBreadcrumbClick(item)}
            className={`flex items-center space-x-1 hover:text-blue-600 transition-colors ${
              index === breadcrumb.length - 1 
                ? 'text-gray-900 font-medium' 
                : 'text-gray-600 hover:text-blue-600'
            }`}
          >
            {item.id === null && <FaHome className="w-3 h-3" />}
            <span className="truncate max-w-32" title={item.name}>
              {item.name}
            </span>
          </button>
        </React.Fragment>
      ))}
    </nav>
  );
};

export default Breadcrumb; 