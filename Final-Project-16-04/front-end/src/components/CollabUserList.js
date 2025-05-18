import React, { useEffect, useState } from 'react';

const CollabUserList = ({ provider }) => {
  const [users, setUsers] = useState([]);

  useEffect(() => {
    if (!provider) return;
    const awareness = provider.awareness;

    const updateUsers = () => {
      const states = Array.from(awareness.getStates().values());
      const userList = states
        .map(state => state.user)
        .filter(Boolean);
      setUsers(userList);
    };

    awareness.on('change', updateUsers);
    updateUsers();
    return () => {
      awareness.off('change', updateUsers);
    };
  }, [provider]);

  if (!users.length) return null;

  return (
    <div className="flex items-center space-x-2 p-2 bg-gray-50 border-b border-gray-200">
      <span className="text-sm text-gray-700">Active collaborators:</span>
      {users.map((user, idx) => (
        <span
          key={user.name + idx}
          className="px-2 py-1 rounded text-xs font-medium"
          style={{ background: user.color || '#ccc', color: '#fff' }}
        >
          {user.name}
        </span>
      ))}
    </div>
  );
};

export default CollabUserList; 