import React from 'react';

const ActionCard = ({ title }) => {
  return (
    <div className="flex-1 bg-white shadow-md p-4 rounded-lg">
      <h2 className="text-lg font-semibold">{title}</h2>
    </div>
  );
};

export default ActionCard;
