import React from 'react';

const Logo = ({ size = 32, className = "", showText = true, variant = "default" }) => {
  const colors = {
    default: {
      primary: "#3B82F6",
      secondary: "#1E40AF",
      accent: "#60A5FA"
    },
    white: {
      primary: "#FFFFFF",
      secondary: "#F3F4F6",
      accent: "#E5E7EB"
    },
    dark: {
      primary: "#1F2937",
      secondary: "#374151",
      accent: "#6B7280"
    }
  };

  const currentColors = colors[variant] || colors.default;

  return (
    <div className={`flex items-center ${className}`}>
      {/* Document Editor Icon */}
      <svg
        width={size}
        height={size}
        viewBox="0 0 64 64"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="flex-shrink-0"
      >
        {/* Background Circle */}
        <circle cx="32" cy="32" r="30" fill={currentColors.primary} />
        
        {/* Document */}
        <rect
          x="20"
          y="16"
          width="24"
          height="32"
          rx="2"
          fill={currentColors.accent}
        />
        
        {/* Document Lines */}
        <line x1="24" y1="24" x2="40" y2="24" stroke={currentColors.primary} strokeWidth="2" strokeLinecap="round" />
        <line x1="24" y1="28" x2="36" y2="28" stroke={currentColors.primary} strokeWidth="2" strokeLinecap="round" />
        <line x1="24" y1="32" x2="40" y2="32" stroke={currentColors.primary} strokeWidth="2" strokeLinecap="round" />
        <line x1="24" y1="36" x2="34" y2="36" stroke={currentColors.primary} strokeWidth="2" strokeLinecap="round" />
        
        {/* Edit Pencil */}
        <path
          d="M38 20L42 16L46 20L42 24L38 20Z"
          fill={currentColors.secondary}
        />
        <line x1="38" y1="20" x2="34" y2="24" stroke={currentColors.secondary} strokeWidth="2" strokeLinecap="round" />
      </svg>
      
      {/* Text Logo */}
      {showText && (
        <div className="ml-3">
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">
            DocEditor
          </h1>
          <p className="text-xs text-gray-500 dark:text-gray-400 -mt-1">
            Collaborate • Edit • Share
          </p>
        </div>
      )}
    </div>
  );
};

export default Logo; 