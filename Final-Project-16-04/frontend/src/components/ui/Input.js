import React from 'react';
import { commonClasses } from '../../utils/colors';

const Input = ({ 
  label,
  error,
  helpText,
  className = '',
  ...props 
}) => {
  const baseClasses = 'w-full px-3 py-2 border rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-opacity-50';
  
  const stateClasses = error 
    ? 'border-red-300 focus:border-red-500 focus:ring-red-500 bg-white text-gray-700' 
    : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500 bg-white text-gray-700';
  
  const classes = `${baseClasses} ${stateClasses} ${className}`;
  
  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-gray-900 mb-1">
          {label}
        </label>
      )}
      <input 
        className={classes}
        {...props}
      />
      {error && (
        <p className="mt-1 text-sm text-red-600">
          {error}
        </p>
      )}
      {helpText && !error && (
        <p className="mt-1 text-sm text-gray-500">
          {helpText}
        </p>
      )}
    </div>
  );
};

export default Input; 