import React from 'react';

const CollabUserList = ({ users = [], userCount = 0 }) => {
  // If no users or only current user, don't show the list
  if (userCount <= 1) return null;

  return (
    <div className="flex items-center space-x-2 p-2 bg-gray-50 border-b border-gray-200">
      <span className="text-sm text-gray-700">
        {userCount} active collaborator{userCount > 1 ? 's' : ''}:
      </span>
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