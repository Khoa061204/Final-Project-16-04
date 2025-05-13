import React from 'react';
import PropTypes from 'prop-types';

const FolderCard = ({ 
  title, 
  size, 
  items,
  onClick,
  className = ''
}) => {
  return (
    <button
      type="button"
      className={`
        bg-white 
        rounded-lg 
        p-4 
        shadow-sm 
        hover:shadow-md 
        transition-shadow 
        duration-200 
        w-full
        text-left
        ${className}
      `}
      onClick={onClick}
    >
      <div className="flex items-center mb-3">
        <span className="text-2xl mr-3" role="img" aria-label="folder">
          📁
        </span>
        <h3 className="font-medium text-gray-900 truncate">
          {title}
        </h3>
      </div>
      <div className="text-sm text-gray-500">
        <p className="mb-1">{size}</p>
        <p>{items}</p>
      </div>
    </button>
  );
};

FolderCard.propTypes = {
  title: PropTypes.string.isRequired,
  size: PropTypes.string.isRequired,
  items: PropTypes.string.isRequired,
  onClick: PropTypes.func,
  className: PropTypes.string
};

export default FolderCard;