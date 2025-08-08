import React from "react";
import PropTypes from "prop-types";

// Constants moved outside component
const COLOR_MAP = {
  violet: "bg-violet-500",
  red: "bg-red-400",
  blue: "bg-blue-400",
  green: "bg-emerald-400",
  orange: "bg-orange-400"
};

const ICON_MAP = {
  "new document": "📄",
  "new project": "📁",
  "new team": "👥",
  "new organization": "🏢"
};

const ActionCard = ({ 
  title, 
  color = "violet", 
  icon, 
  onClick 
}) => {
  const getIcon = () => {
    if (icon) return icon;
    return ICON_MAP[title.toLowerCase()] || "➕";
  };

  return (
    <button 
      type="button"
      className={`
        ${COLOR_MAP[color]} 
        rounded-lg 
        p-4 
        w-40 
        h-28 
        flex 
        flex-col 
        items-center 
        justify-center 
        text-white 
        cursor-pointer 
        hover:shadow-md 
        hover:opacity-90
        transition-all
        duration-200
      `}
      onClick={onClick}
      aria-label={title}
    >
      <span className="text-2xl mb-2" role="img" aria-label={title}>
        {getIcon()}
      </span>
      <span className="font-medium text-center">
        {title}
      </span>
    </button>
  );
};

ActionCard.propTypes = {
  title: PropTypes.string.isRequired,
  color: PropTypes.oneOf(Object.keys(COLOR_MAP)),
  icon: PropTypes.string,
  onClick: PropTypes.func
};

export default ActionCard;