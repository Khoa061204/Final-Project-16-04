import React, { useState } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { FiSun, FiMoon, FiMonitor, FiChevronDown } from 'react-icons/fi';
import { Menu, Transition } from '@headlessui/react';

const ThemeToggle = ({ className = '' }) => {
  const { isDarkMode, theme, setThemeMode } = useTheme();

  const themeOptions = [
    { id: 'light', name: 'Light', icon: FiSun },
    { id: 'dark', name: 'Dark', icon: FiMoon },
    { id: 'system', name: 'System', icon: FiMonitor },
  ];

  const currentTheme = themeOptions.find(option => option.id === theme);
  const CurrentIcon = currentTheme?.icon || FiMonitor;

  return (
    <Menu as="div" className="relative inline-block text-left">
      <Menu.Button
        className={`flex items-center p-2 rounded-lg transition-all duration-200 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 ${className}`}
        title={`Current theme: ${currentTheme?.name || 'System'}`}
      >
        <CurrentIcon className={`w-5 h-5 transition-colors ${
          isDarkMode 
            ? 'text-yellow-400 hover:text-yellow-300' 
            : 'text-gray-600 hover:text-gray-800 dark:text-gray-300 dark:hover:text-gray-100'
        }`} />
        <FiChevronDown className="w-3 h-3 ml-1 text-gray-500 dark:text-gray-400" />
      </Menu.Button>

      <Transition
        enter="transition ease-out duration-100"
        enterFrom="transform opacity-0 scale-95"
        enterTo="transform opacity-100 scale-100"
        leave="transition ease-in duration-75"
        leaveFrom="transform opacity-100 scale-100"
        leaveTo="transform opacity-0 scale-95"
      >
        <Menu.Items className="absolute right-0 mt-2 w-36 origin-top-right bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50 py-1">
          {themeOptions.map((option) => {
            const Icon = option.icon;
            return (
              <Menu.Item key={option.id}>
                {({ active }) => (
                  <button
                    onClick={() => setThemeMode(option.id)}
                    className={`${
                      active ? 'bg-gray-100 dark:bg-gray-700' : ''
                    } ${
                      theme === option.id ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400' : 'text-gray-700 dark:text-gray-300'
                    } group flex items-center w-full px-3 py-2 text-sm transition-colors`}
                  >
                    <Icon className="w-4 h-4 mr-3" />
                    {option.name}
                    {theme === option.id && (
                      <div className="ml-auto w-2 h-2 bg-blue-500 rounded-full"></div>
                    )}
                  </button>
                )}
              </Menu.Item>
            );
          })}
        </Menu.Items>
      </Transition>
    </Menu>
  );
};

export default ThemeToggle; 