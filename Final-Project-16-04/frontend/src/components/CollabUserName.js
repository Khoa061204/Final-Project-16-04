import React, { useState, useEffect } from 'react';

const LOCAL_STORAGE_KEY = 'collab_username';

const CollabUserName = () => {
  const [username, setUsername] = useState('');

  useEffect(() => {
    const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (stored) setUsername(stored);
  }, []);

  const handleChange = (e) => {
    setUsername(e.target.value);
    localStorage.setItem(LOCAL_STORAGE_KEY, e.target.value);
  };

  return (
    <div className="flex items-center space-x-2 p-2 bg-gray-50 border-b border-gray-200">
      <span className="text-sm text-gray-700">Your name for collaboration:</span>
      <input
        type="text"
        value={username}
        onChange={handleChange}
        placeholder="Enter your name"
        className="px-2 py-1 border rounded text-sm focus:outline-none focus:ring"
        style={{ minWidth: 120 }}
      />
    </div>
  );
};

export default CollabUserName; 