import React, { useState, useEffect, useRef, useCallback } from 'react';
import { MdSearch, MdClose, MdPersonAdd } from 'react-icons/md';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const UserSearch = ({ selectedUsers = [], onUsersChange, excludeTeamId = null, placeholder = "Search users..." }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const searchRef = useRef(null);
  const dropdownRef = useRef(null);

  // Debounced search function
  const debouncedSearch = useCallback(
    debounce(async (query) => {
      if (query.length < 1) {
        setSearchResults([]);
        return;
      }

      setLoading(true);
      try {
        const token = localStorage.getItem('token');
        const excludeParam = excludeTeamId ? `&exclude_team=${excludeTeamId}` : '';
        const response = await fetch(`${API_BASE_URL}/users/search?query=${encodeURIComponent(query)}${excludeParam}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            // Filter out already selected users
            const filteredResults = data.data.filter(user => 
              !selectedUsers.some(selected => selected.id === user.id)
            );
            setSearchResults(filteredResults);
          }
        }
      } catch (error) {
        console.error('Error searching users:', error);
        setSearchResults([]);
      } finally {
        setLoading(false);
      }
    }, 300),
    [selectedUsers, excludeTeamId]
  );

  // Fetch user suggestions on component mount
  useEffect(() => {
    const fetchSuggestions = async () => {
      try {
        console.log('🔍 Fetching user suggestions...');
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE_URL}/users/suggestions?limit=5`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            // Filter out already selected users
            const filteredSuggestions = data.data.filter(user => 
              !selectedUsers.some(selected => selected.id === user.id)
            );
            console.log('✅ Fetched suggestions:', filteredSuggestions.length);
            setSuggestions(filteredSuggestions);
          } else {
            console.error('❌ Suggestions response not successful:', data);
          }
        } else {
          console.error('❌ Failed to fetch suggestions:', response.status);
        }
      } catch (error) {
        console.error('Error fetching suggestions:', error);
      }
    };

    fetchSuggestions();
  }, [selectedUsers]);

  // Handle search input changes
  useEffect(() => {
    if (searchTerm.trim()) {
      debouncedSearch(searchTerm.trim());
      // Open dropdown when user starts typing (will show loading or existing results)
      setIsDropdownOpen(true);
    } else {
      setSearchResults([]);
      // Keep dropdown open if there are suggestions, otherwise close it
      if (suggestions.length > 0) {
        setIsDropdownOpen(true);
      } else {
        setIsDropdownOpen(false);
      }
    }
  }, [searchTerm, debouncedSearch, suggestions.length]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target) &&
          searchRef.current && !searchRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleUserSelect = (user) => {
    const newSelectedUsers = [...selectedUsers, user];
    onUsersChange(newSelectedUsers);
    setSearchTerm('');
    setSearchResults([]);
    setIsDropdownOpen(false);
    
    // Update suggestions to exclude newly selected user
    setSuggestions(suggestions.filter(suggestion => suggestion.id !== user.id));
  };

  const handleUserRemove = (userId) => {
    const newSelectedUsers = selectedUsers.filter(user => user.id !== userId);
    onUsersChange(newSelectedUsers);
  };

  const handleSuggestionSelect = (user) => {
    handleUserSelect(user);
  };

  // User avatar component
  const UserAvatar = ({ user, size = 'sm' }) => {
    const sizeClasses = {
      xs: 'w-6 h-6 text-xs',
      sm: 'w-8 h-8 text-sm',
      md: 'w-10 h-10 text-base'
    };

    return (
      <div className={`${sizeClasses[size]} bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold flex-shrink-0`}>
        {user.avatar_url ? (
          <img 
            src={user.avatar_url} 
            alt={user.username}
            className={`${sizeClasses[size]} rounded-full object-cover`}
          />
        ) : (
          user.username.charAt(0).toUpperCase()
        )}
      </div>
    );
  };

  // User result item component
  const UserResultItem = ({ user, onClick }) => (
    <div 
      onClick={() => onClick(user)}
      className="flex items-center p-3 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors border-b border-gray-100 dark:border-gray-600 last:border-b-0"
    >
      <UserAvatar user={user} size="sm" />
      <div className="ml-3 flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
          {user.username}
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
          {user.email}
        </p>
        {user.mutual_teams && (
          <p className="text-xs text-blue-600 dark:text-blue-400">
            {user.mutual_teams} mutual team{user.mutual_teams !== 1 ? 's' : ''}
          </p>
        )}
      </div>
      <MdPersonAdd className="text-gray-400 dark:text-gray-500" />
    </div>
  );

  // Selected user chip component
  const UserChip = ({ user, onRemove }) => (
    <div className="inline-flex items-center bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-3 py-1 rounded-full text-sm font-medium mr-2 mb-2 animate-fade-in">
      <UserAvatar user={user} size="xs" />
      <span className="ml-2 max-w-32 truncate">{user.username}</span>
      <button
        onClick={() => onRemove(user.id)}
        className="ml-2 text-blue-600 dark:text-blue-300 hover:text-blue-800 dark:hover:text-blue-100 transition-colors"
      >
        <MdClose size={14} />
      </button>
    </div>
  );

  return (
    <div className="relative">
      {/* Selected Users Display */}
      {selectedUsers.length > 0 && (
        <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Selected Users ({selectedUsers.length})
          </p>
          <div className="flex flex-wrap">
            {selectedUsers.map(user => (
              <UserChip key={user.id} user={user} onRemove={handleUserRemove} />
            ))}
          </div>
        </div>
      )}

      {/* Search Input */}
      <div className="relative" ref={searchRef}>
        <div className="relative">
          <MdSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onFocus={() => {
              // Always open dropdown when focusing on the input
              setIsDropdownOpen(true);
            }}
            placeholder={placeholder}
            className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
          />
          {loading && (
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
              <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
          )}
        </div>

        {/* Dropdown */}
        {isDropdownOpen && (
          <div 
            ref={dropdownRef}
            className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-xl max-h-80 overflow-y-auto custom-scrollbar"
          >
            {/* Loading State */}
            {loading && (
              <div className="px-3 py-8 text-center text-gray-500 dark:text-gray-400">
                <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                <p className="text-sm">Searching for users...</p>
              </div>
            )}

            {/* Search Results */}
            {searchResults.length > 0 && (
              <div>
                <div className="px-3 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide bg-gray-50 dark:bg-gray-700">
                  Search Results
                </div>
                {searchResults.map(user => (
                  <UserResultItem key={user.id} user={user} onClick={handleUserSelect} />
                ))}
              </div>
            )}

            {/* Suggestions */}
            {!searchTerm && suggestions.length > 0 && (
              <div>
                <div className="px-3 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide bg-gray-50 dark:bg-gray-700">
                  Suggested Users
                </div>
                {suggestions.map(user => (
                  <UserResultItem key={user.id} user={user} onClick={handleSuggestionSelect} />
                ))}
              </div>
            )}

            {/* No Results */}
            {searchTerm && searchResults.length === 0 && !loading && (
              <div className="px-3 py-8 text-center text-gray-500 dark:text-gray-400">
                <MdSearch size={32} className="mx-auto mb-2 opacity-50" />
                <p className="text-sm">No users found for "{searchTerm}"</p>
                <p className="text-xs mt-1">Try searching by username or email</p>
              </div>
            )}

            {/* Empty State */}
            {!searchTerm && suggestions.length === 0 && !loading && (
              <div className="px-3 py-8 text-center text-gray-500 dark:text-gray-400">
                <MdPersonAdd size={32} className="mx-auto mb-2 opacity-50" />
                <p className="text-sm">Start typing to search for users</p>
                <p className="text-xs mt-1">Search by username or email address</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// Debounce utility function
const debounce = (func, delay) => {
  let timeoutId;
  return function(...args) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      func.apply(this, args);
    }, delay);
  };
};

export default UserSearch; 