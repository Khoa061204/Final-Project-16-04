import React, { useState, useContext, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { AuthContext } from '../App';
import { FiSun, FiMoon, FiMonitor } from 'react-icons/fi';
import { MdNotifications, MdSecurity, MdPerson, MdColorLens } from 'react-icons/md';
import { getApiUrl } from '../config/api';
import { getAuthHeaders } from '../utils/auth';

const Settings = () => {
  const { isDarkMode, theme, setThemeMode } = useTheme();
  const { user } = useContext(AuthContext);
  const [activeTab, setActiveTab] = useState('appearance');
  const [settings, setSettings] = useState({
    theme: 'system',
    emailNotifications: true,
    pushNotifications: true,
    twoFactorEnabled: false
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  const tabs = [
    { id: 'appearance', label: 'Appearance', icon: MdColorLens },
    { id: 'notifications', label: 'Notifications', icon: MdNotifications },
    { id: 'security', label: 'Security', icon: MdSecurity },
    { id: 'profile', label: 'Profile', icon: MdPerson },
  ];

  const themeOptions = [
    {
      id: 'light',
      name: 'Light',
      description: 'Clean white theme for daytime use',
      icon: FiSun,
      isActive: settings.theme === 'light'
    },
    {
      id: 'dark',
      name: 'Dark',
      description: 'Easy on the eyes for low-light environments',
      icon: FiMoon,
      isActive: settings.theme === 'dark'
    },
    {
      id: 'system',
      name: 'System',
      description: 'Follows your device settings',
      icon: FiMonitor,
      isActive: settings.theme === 'system'
    }
  ];

  // Load settings on component mount
  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      const response = await fetch(getApiUrl(`/users/${user.id}/settings`), {
        headers: getAuthHeaders()
      });
      
      if (response.ok) {
        const data = await response.json();
        setSettings(data);
        // Update theme context if different
        if (data.theme !== theme) {
          setThemeMode(data.theme);
        }
      }
    } catch (error) {
      console.error('Error loading settings:', error);
      setMessage({ type: 'error', text: 'Failed to load settings' });
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async (newSettings) => {
    if (!user) return;
    
    try {
      setSaving(true);
      const response = await fetch(getApiUrl(`/users/${user.id}/settings`), {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(newSettings)
      });
      
      if (response.ok) {
        setSettings(newSettings);
        setMessage({ type: 'success', text: 'Settings saved successfully' });
        setTimeout(() => setMessage({ type: '', text: '' }), 3000);
      } else {
        setMessage({ type: 'error', text: 'Failed to save settings' });
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      setMessage({ type: 'error', text: 'Failed to save settings' });
    } finally {
      setSaving(false);
    }
  };

  const handleThemeChange = (themeId) => {
    const newSettings = { ...settings, theme: themeId };
    setThemeMode(themeId);
    saveSettings(newSettings);
  };

  const handleNotificationChange = (type, value) => {
    const newSettings = { ...settings, [type]: value };
    saveSettings(newSettings);
  };

  const handle2FAChange = async (enable) => {
    if (!user) return;
    
    try {
      setSaving(true);
      const endpoint = enable ? 'enable' : 'disable';
      const response = await fetch(getApiUrl(`/users/${user.id}/2fa/${endpoint}`), {
        method: 'POST',
        headers: getAuthHeaders()
      });
      
      if (response.ok) {
        const newSettings = { ...settings, twoFactorEnabled: enable };
        setSettings(newSettings);
        setMessage({ 
          type: 'success', 
          text: `Two-factor authentication ${enable ? 'enabled' : 'disabled'} successfully` 
        });
        setTimeout(() => setMessage({ type: '', text: '' }), 3000);
      } else {
        setMessage({ type: 'error', text: `Failed to ${enable ? 'enable' : 'disable'} 2FA` });
      }
    } catch (error) {
      console.error('Error changing 2FA:', error);
      setMessage({ type: 'error', text: `Failed to ${enable ? 'enable' : 'disable'} 2FA` });
    } finally {
      setSaving(false);
    }
  };

  const handleDataExport = async () => {
    if (!user) return;
    
    try {
      setSaving(true);
      const response = await fetch(getApiUrl(`/users/${user.id}/export`), {
        headers: getAuthHeaders()
      });
      
      if (response.ok) {
        const data = await response.json();
        
        // Create and download JSON file
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `giggle-drive-export-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        setMessage({ type: 'success', text: 'Data exported successfully' });
        setTimeout(() => setMessage({ type: '', text: '' }), 3000);
      } else {
        setMessage({ type: 'error', text: 'Failed to export data' });
      }
    } catch (error) {
      console.error('Error exporting data:', error);
      setMessage({ type: 'error', text: 'Failed to export data' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
            <p className="mt-4 text-gray-600 dark:text-gray-400">Loading settings...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
          Settings
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Customize your Giggle Drive experience
        </p>
      </div>

      {/* Message Display */}
      {message.text && (
        <div className={`mb-6 p-4 rounded-lg ${
          message.type === 'success' 
            ? 'bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-200 border border-green-200 dark:border-green-800'
            : 'bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200 border border-red-200 dark:border-red-800'
        }`}>
          {message.text}
        </div>
      )}

      <div className="flex gap-6">
        {/* Sidebar Navigation */}
        <div className="w-64 flex-shrink-0">
          <nav className="space-y-1">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center px-4 py-3 text-left rounded-lg transition-colors duration-200 ${
                    activeTab === tab.id
                      ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
                  }`}
                >
                  <Icon className="w-5 h-5 mr-3" />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Main Content */}
        <div className="flex-1">
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            {/* Appearance Tab */}
            {activeTab === 'appearance' && (
              <div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-6">
                  Appearance
                </h2>
                
                <div className="space-y-6">
                  {/* Theme Selection */}
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
                      Theme
                    </h3>
                    <div className="grid gap-4">
                      {themeOptions.map((option) => {
                        const Icon = option.icon;
                        return (
                          <button
                            key={option.id}
                            onClick={() => handleThemeChange(option.id)}
                            className={`p-4 rounded-lg border-2 transition-all duration-200 text-left ${
                              option.isActive
                                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                                : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                            }`}
                          >
                            <div className="flex items-center">
                              <div className={`p-2 rounded-lg mr-4 ${
                                option.isActive
                                  ? 'bg-blue-500 text-white'
                                  : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                              }`}>
                                <Icon className="w-5 h-5" />
                              </div>
                              <div>
                                <div className="font-medium text-gray-900 dark:text-gray-100">
                                  {option.name}
                                </div>
                                <div className="text-sm text-gray-600 dark:text-gray-400">
                                  {option.description}
                                </div>
                              </div>
                              {option.isActive && (
                                <div className="ml-auto">
                                  <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                                    <div className="w-2 h-2 bg-white rounded-full"></div>
                                  </div>
                                </div>
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Preview */}
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
                      Preview
                    </h3>
                    <div className="p-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
                      <div className="flex items-center space-x-3 mb-3">
                        <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                          <span className="text-white text-sm font-medium">U</span>
                        </div>
                        <div>
                          <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                            {user?.name || user?.username || 'User'}
                          </div>
                          <div className="text-xs text-gray-600 dark:text-gray-400">
                            {user?.email || 'user@example.com'}
                          </div>
                        </div>
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        This is how your interface will look with the selected theme.
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Notifications Tab */}
            {activeTab === 'notifications' && (
              <div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-6">
                  Notifications
                </h2>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                    <div>
                      <div className="font-medium text-gray-900 dark:text-gray-100">
                        Email Notifications
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        Receive notifications via email
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        className="sr-only peer" 
                        checked={settings.emailNotifications}
                        onChange={(e) => handleNotificationChange('emailNotifications', e.target.checked)}
                        disabled={saving}
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                    </label>
                  </div>
                  
                  <div className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                    <div>
                      <div className="font-medium text-gray-900 dark:text-gray-100">
                        Push Notifications
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        Receive browser notifications
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        className="sr-only peer" 
                        checked={settings.pushNotifications}
                        onChange={(e) => handleNotificationChange('pushNotifications', e.target.checked)}
                        disabled={saving}
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                    </label>
                  </div>
                </div>
              </div>
            )}

            {/* Security Tab */}
            {activeTab === 'security' && (
              <div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-6">
                  Security
                </h2>
                <div className="space-y-4">
                  <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <div className="font-medium text-gray-900 dark:text-gray-100">
                          Two-Factor Authentication
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          Add an extra layer of security to your account
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        <span className={`text-sm ${settings.twoFactorEnabled ? 'text-green-600 dark:text-green-400' : 'text-gray-500 dark:text-gray-400'}`}>
                          {settings.twoFactorEnabled ? 'Enabled' : 'Disabled'}
                        </span>
                        <button 
                          onClick={() => handle2FAChange(!settings.twoFactorEnabled)}
                          disabled={saving}
                          className={`px-4 py-2 rounded-lg transition-colors ${
                            settings.twoFactorEnabled
                              ? 'bg-red-500 hover:bg-red-600 text-white'
                              : 'bg-blue-500 hover:bg-blue-600 text-white'
                          } ${saving ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                          {saving ? 'Updating...' : (settings.twoFactorEnabled ? 'Disable 2FA' : 'Enable 2FA')}
                        </button>
                      </div>
                    </div>
                  </div>
                  
                  <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                    <div className="font-medium text-gray-900 dark:text-gray-100 mb-2">
                      Change Password
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                      Update your account password
                    </div>
                    <button className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors">
                      Change Password
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Profile Tab */}
            {activeTab === 'profile' && (
              <div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-6">
                  Profile
                </h2>
                <div className="space-y-4">
                  <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                    <div className="font-medium text-gray-900 dark:text-gray-100 mb-2">
                      Account Information
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                      Manage your account details and preferences
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">Username:</span>
                        <span className="ml-2 text-gray-900 dark:text-gray-100">{user?.username}</span>
                      </div>
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">Email:</span>
                        <span className="ml-2 text-gray-900 dark:text-gray-100">{user?.email}</span>
                      </div>
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">Member since:</span>
                        <span className="ml-2 text-gray-900 dark:text-gray-100">
                          {user?.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">Last login:</span>
                        <span className="ml-2 text-gray-900 dark:text-gray-100">
                          {user?.last_login ? new Date(user.last_login).toLocaleString() : 'Never'}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                    <div className="font-medium text-gray-900 dark:text-gray-100 mb-2">
                      Data Export
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                      Download a copy of your data including files, documents, and account information
                    </div>
                    <button 
                      onClick={handleDataExport}
                      disabled={saving}
                      className={`px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors ${saving ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      {saving ? 'Exporting...' : 'Export Data'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings; 