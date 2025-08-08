import React from 'react';
import { FiX, FiSearch, FiPlus, FiFolder, FiFile, FiUpload, FiTrash2, FiRefreshCw, FiCheckSquare, FiArrowLeft, FiArrowRight, FiArrowUp } from 'react-icons/fi';

const KeyboardShortcutsHelp = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const shortcuts = [
    {
      category: 'Navigation',
      items: [
        { key: 'Ctrl + F', description: 'Search files and folders', icon: FiSearch },
        { key: 'Ctrl + R', description: 'Refresh current view', icon: FiRefreshCw },
        { key: 'Escape', description: 'Cancel selection or close modal', icon: FiX },
        { key: 'Enter', description: 'Open selected item', icon: FiFile },
      ]
    },
    {
      category: 'File Operations',
      items: [
        { key: 'Ctrl + N', description: 'Create new document', icon: FiFile },
        { key: 'Ctrl + Shift + N', description: 'Create new folder', icon: FiFolder },
        { key: 'Ctrl + U', description: 'Upload files', icon: FiUpload },
        { key: 'Delete', description: 'Delete selected items', icon: FiTrash2 },
      ]
    },
    {
      category: 'Selection',
      items: [
        { key: 'Ctrl + A', description: 'Select all items', icon: FiCheckSquare },
        { key: 'Ctrl + D', description: 'Deselect all items', icon: FiCheckSquare },
        { key: '1-4', description: 'Switch between tabs (All, Recent, Shared, Favorites)', icon: FiFile },
      ]
    },
    {
      category: 'Quick Navigation',
      items: [
        { key: 'Alt + ←', description: 'Go back', icon: FiArrowLeft },
        { key: 'Alt + →', description: 'Go forward', icon: FiArrowRight },
        { key: 'Alt + ↑', description: 'Go to parent folder', icon: FiArrowUp },
      ]
    }
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] overflow-hidden transition-colors duration-200">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            Keyboard Shortcuts
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <FiX className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(80vh-120px)]">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {shortcuts.map((category, index) => (
              <div key={index} className="space-y-3">
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 border-b border-gray-200 dark:border-gray-700 pb-2">
                  {category.category}
                </h3>
                <div className="space-y-2">
                  {category.items.map((item, itemIndex) => {
                    const Icon = item.icon;
                    return (
                      <div key={itemIndex} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <Icon className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                          <span className="text-sm text-gray-700 dark:text-gray-300">
                            {item.description}
                          </span>
                        </div>
                        <kbd className="px-2 py-1 text-xs font-semibold text-gray-800 dark:text-gray-200 bg-gray-200 dark:bg-gray-600 border border-gray-300 dark:border-gray-500 rounded">
                          {item.key}
                        </kbd>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <h4 className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-2">
              💡 Tips
            </h4>
            <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
              <li>• Shortcuts work when you're not typing in input fields</li>
              <li>• Use Ctrl on Windows/Linux, Cmd on Mac</li>
              <li>• You can always access this help with Ctrl + ? (coming soon)</li>
            </ul>
          </div>
        </div>

        <div className="flex justify-end p-6 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default KeyboardShortcutsHelp; 