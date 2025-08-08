import React from 'react';
import { FaExclamationTriangle, FaInfoCircle, FaCheckCircle, FaTimes } from 'react-icons/fa';

const ErrorMessage = ({ 
  type = 'error', 
  title, 
  message, 
  onRetry, 
  onDismiss, 
  showIcon = true,
  className = '' 
}) => {
  const typeConfig = {
    error: {
      icon: FaExclamationTriangle,
      bgColor: 'bg-red-50 dark:bg-red-900/20',
      borderColor: 'border-red-200 dark:border-red-800',
      textColor: 'text-red-800 dark:text-red-200',
      iconColor: 'text-red-400'
    },
    warning: {
      icon: FaExclamationTriangle,
      bgColor: 'bg-yellow-50 dark:bg-yellow-900/20',
      borderColor: 'border-yellow-200 dark:border-yellow-800',
      textColor: 'text-yellow-800 dark:text-yellow-200',
      iconColor: 'text-yellow-400'
    },
    info: {
      icon: FaInfoCircle,
      bgColor: 'bg-blue-50 dark:bg-blue-900/20',
      borderColor: 'border-blue-200 dark:border-blue-800',
      textColor: 'text-blue-800 dark:text-blue-200',
      iconColor: 'text-blue-400'
    },
    success: {
      icon: FaCheckCircle,
      bgColor: 'bg-green-50 dark:bg-green-900/20',
      borderColor: 'border-green-200 dark:border-green-800',
      textColor: 'text-green-800 dark:text-green-200',
      iconColor: 'text-green-400'
    }
  };

  const config = typeConfig[type];
  const Icon = config.icon;

  return (
    <div className={`rounded-md p-4 border ${config.bgColor} ${config.borderColor} ${className}`}>
      <div className="flex">
        {showIcon && (
          <div className="flex-shrink-0">
            <Icon className={`h-5 w-5 ${config.iconColor}`} />
          </div>
        )}
        <div className="ml-3 flex-1">
          {title && (
            <h3 className={`text-sm font-medium ${config.textColor}`}>
              {title}
            </h3>
          )}
          {message && (
            <div className={`mt-2 text-sm ${config.textColor}`}>
              <p>{message}</p>
            </div>
          )}
          {(onRetry || onDismiss) && (
            <div className="mt-4 flex space-x-3">
              {onRetry && (
                <button
                  onClick={onRetry}
                  className={`text-sm font-medium ${config.textColor} hover:underline focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-${type === 'error' ? 'red' : type === 'warning' ? 'yellow' : type === 'info' ? 'blue' : 'green'}-500`}
                >
                  Try again
                </button>
              )}
              {onDismiss && (
                <button
                  onClick={onDismiss}
                  className={`text-sm font-medium ${config.textColor} hover:underline focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-${type === 'error' ? 'red' : type === 'warning' ? 'yellow' : type === 'info' ? 'blue' : 'green'}-500`}
                >
                  Dismiss
                </button>
              )}
            </div>
          )}
        </div>
        {onDismiss && (
          <div className="ml-auto pl-3">
            <div className="-mx-1.5 -my-1.5">
              <button
                onClick={onDismiss}
                className={`inline-flex rounded-md p-1.5 ${config.bgColor} ${config.textColor} hover:bg-${type === 'error' ? 'red' : type === 'warning' ? 'yellow' : type === 'info' ? 'blue' : 'green'}-100 focus:outline-none focus:ring-2 focus:ring-${type === 'error' ? 'red' : type === 'warning' ? 'yellow' : type === 'info' ? 'blue' : 'green'}-500`}
              >
                <FaTimes className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ErrorMessage; 