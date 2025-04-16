import React from "react";

const ActionCard = ({ title, color = "violet", icon = "📄" }) => {
  // Color mapping for background colors
  const colorMap = {
    violet: "bg-violet-500",
    red: "bg-red-400",
    blue: "bg-blue-400",
    green: "bg-emerald-400"
  };
  
  // Icon mapping based on title if not provided
  const getIcon = () => {
    if (icon) return icon;
    
    switch (title.toLowerCase()) {
      case "new document":
        return "📄";
      case "new project":
        return "📁";
      case "new team":
        return "👥";
      case "new organization":
        return "🏢";
      default:
        return "➕";
    }
  };
  
  return (
    <div 
      className={`${colorMap[color]} rounded-lg p-4 w-40 h-28 flex flex-col items-center justify-center text-white cursor-pointer hover:shadow-md transition-all`}
    >
      <span className="text-2xl mb-2">{getIcon()}</span>
      <span className="font-medium text-center">{title}</span>
    </div>
  );
};

export default ActionCard;