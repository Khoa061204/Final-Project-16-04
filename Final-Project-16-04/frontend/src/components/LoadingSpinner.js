import React from 'react';

const LoadingSpinner = ({ size = 'md', type = 'spinner', text = 'Loading...', className = '' }) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
    xl: 'w-16 h-16'
  };

  const spinnerClasses = {
    spinner: 'animate-spin rounded-full border-2 border-gray-300 dark:border-gray-600 border-t-blue-600',
    dots: 'flex space-x-1',
    pulse: 'animate-pulse bg-blue-600 rounded-full'
  };

  if (type === 'dots') {
    return (
      <div className={`flex items-center justify-center ${className}`}>
        <div className="flex space-x-1">
          <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce"></div>
          <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
          <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
        </div>
        {text && <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">{text}</span>}
      </div>
    );
  }

  if (type === 'pulse') {
    return (
      <div className={`flex items-center justify-center ${className}`}>
        <div className={`${sizeClasses[size]} ${spinnerClasses[type]}`}></div>
        {text && <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">{text}</span>}
      </div>
    );
  }

  return (
    <div className={`flex items-center justify-center ${className}`}>
      <div className={`${sizeClasses[size]} ${spinnerClasses[type]}`}></div>
      {text && <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">{text}</span>}
    </div>
  );
};

export default LoadingSpinner; 