import React, { useEffect, useRef, useState } from "react";
import { MdGroup } from "react-icons/md";
import io from "socket.io-client";

const SOCKET_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";

const TeamChat = ({ teams = [], user }) => {
  const [selectedTeam, setSelectedTeam] = useState(teams[0] || null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const socketRef = useRef(null);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (!selectedTeam || !user) {
      setConnectionStatus('disconnected');
      return;
    }
    
    setConnectionStatus('connecting');
    const token = localStorage.getItem('token');
    
    // Create socket connection
    socketRef.current = io(SOCKET_URL, { 
      transports: ["websocket", "polling"],
      forceNew: true,
      auth: { token }
    });
    
    socketRef.current.on('connect', () => {
      setConnectionStatus('connected');
      socketRef.current.emit("join-team-chat", { 
        teamId: selectedTeam.id, 
        userId: user.id 
      });
    });
    
    socketRef.current.on('connect_error', (error) => {
      setConnectionStatus('error');
      console.error('Team chat connection error:', error);
    });
    
    socketRef.current.on('disconnect', () => {
      setConnectionStatus('disconnected');
    });
    
    socketRef.current.on("team-message-history", (msgs) => {
      setMessages(Array.isArray(msgs) ? msgs : []);
      scrollToBottom();
    });
    
    socketRef.current.on("team-message", (msg) => {
      setMessages((prev) => [...prev, msg]);
      scrollToBottom();
    });
    
    socketRef.current.on('team-chat-error', (error) => {
      console.error('Team chat error:', error?.message || error);
      setConnectionStatus('error');
    });
    
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
      setConnectionStatus('disconnected');
    };
  }, [selectedTeam, user?.id]);

  // Update selectedTeam when teams are loaded for the first time
  useEffect(() => {
    if (!selectedTeam && teams.length > 0) {
      setSelectedTeam(teams[0]);
    }
  }, [teams, selectedTeam]);

  // Clean up selectedTeam if it's no longer in teams
  useEffect(() => {
    if (selectedTeam && !teams.find(t => t.id === selectedTeam.id)) {
      setMessages([{ message: 'This team has been deleted or you are no longer a member.', system: true }]);
      setSelectedTeam(null);
    }
  }, [teams, selectedTeam]);

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  };

  const sendMessage = (e) => {
    e.preventDefault();
    if (!input.trim() || !selectedTeam || connectionStatus !== 'connected') return;
    
    if (socketRef.current && socketRef.current.connected) {
      socketRef.current.emit("send-team-message", {
        teamId: selectedTeam.id,
        userId: user.id,
        message: input.trim(),
      });
      setInput("");
    } else {
      alert('Chat connection lost. Please refresh the page.');
    }
  };

  return (
    <div className="flex h-[80vh] md:h-[90vh] bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden max-w-5xl mx-auto mt-8 border border-gray-200 dark:border-gray-700">
      {/* Connection Status */}
      {selectedTeam && (
        <div className="absolute top-2 right-2 text-xs z-10">
          <span className={`px-2 py-1 rounded-full text-white ${
            connectionStatus === 'connected' ? 'bg-green-500' : 
            connectionStatus === 'connecting' ? 'bg-yellow-500' : 
            connectionStatus === 'error' ? 'bg-red-500' : 'bg-gray-500'
          }`}>
            {connectionStatus === 'connected' ? '● Online' : 
             connectionStatus === 'connecting' ? '● Connecting...' : 
             connectionStatus === 'error' ? '● Error' : '● Offline'}
          </span>
        </div>
      )}
      {/* Sidebar: Team List */}
      <aside className="w-64 bg-gray-50 dark:bg-gray-700 border-r border-gray-200 dark:border-gray-600 flex flex-col">
        <div className="p-4 border-b border-gray-200 dark:border-gray-600">
          <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-200 mb-2">Teams</h2>
        </div>
        <ul className="flex-1 overflow-y-auto">
          {teams.length === 0 && (
            <li className="text-gray-400 dark:text-gray-300 p-4 text-center">
              <div className="mb-2">
                <MdGroup className="mx-auto text-3xl text-gray-300" />
              </div>
              <div>Loading teams...</div>
              <div className="text-xs mt-1">If teams don't load, try creating or joining one first</div>
            </li>
          )}
          {teams.map(team => (
            <li
              key={team.id}
              className={`flex items-center px-4 py-3 cursor-pointer hover:bg-gray-100 dark:hover:bg-blue-900/20 transition-colors ${selectedTeam?.id === team.id ? 'bg-gray-100 dark:bg-blue-900/20 border-l-4 border-blue-600' : ''}`}
              onClick={() => setSelectedTeam(team)}
            >
              <div className="relative mr-3">
                <MdGroup className="text-xl text-gray-400 dark:text-gray-300" />
                {team.members && (
                  <span className="absolute -top-1 -right-1 bg-blue-600 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                    {team.members.length}
                  </span>
                )}
              </div>
              <span className="font-medium text-gray-800 dark:text-gray-200 truncate">{team.name}</span>
            </li>
          ))}
        </ul>
      </aside>

      {/* Main Chat Area */}
      <section className="flex-1 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800">
          <div>
            <h3 className="text-xl font-semibold text-blue-700 dark:text-blue-400">{selectedTeam ? selectedTeam.name : 'Select a team'}</h3>
            {selectedTeam && selectedTeam.members && (
              <div className="text-xs text-gray-500 dark:text-gray-300 mt-1">
                {selectedTeam.members.map(m => m.username).join(', ')}
              </div>
            )}
          </div>
        </div>
        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-6 py-4 bg-gray-50 dark:bg-gray-700">
          {!selectedTeam ? (
            <div className="text-gray-400 dark:text-gray-300 text-center mt-20">Select a team to start chatting.</div>
          ) : (
            <div className="flex flex-col gap-2">
              {messages.map((msg, idx) => {
                if (msg.system) {
                  return (
                    <div key={idx} className="text-center text-gray-400 text-sm my-2">{msg.content || msg.message}</div>
                  );
                }
                const isMe = msg.userId === user.id;
                return (
                  <div key={msg.id || idx} className={`flex items-start gap-3 ${isMe ? 'justify-end' : 'justify-start'}`}>
                    {!isMe && (
                      <div className="flex-shrink-0">
                        <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-bold">
                          {(msg.username || 'U').charAt(0).toUpperCase()}
                        </div>
                      </div>
                    )}
                    <div className={`max-w-[70%] px-4 py-2 rounded-lg shadow-sm ${isMe ? 'bg-blue-600 text-white' : 'bg-white dark:bg-gray-600 border border-gray-200 dark:border-gray-500 text-gray-800 dark:text-gray-100'}`}>
                      <div className="text-xs font-semibold mb-1">
                        {isMe ? 'You' : msg.username || 'Unknown User'}
                        <span className="ml-2 text-[10px] opacity-70">{msg.createdAt ? new Date(msg.createdAt).toLocaleTimeString() : ""}</span>
                      </div>
                      <div className="break-words whitespace-pre-wrap">{msg.content || msg.message}</div>
                    </div>
                    {isMe && (
                      <div className="flex-shrink-0">
                        <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white text-sm font-bold">
                          {(user.username || user.email || 'Y').charAt(0).toUpperCase()}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>
        {/* Input */}
        {selectedTeam && (
                  <form onSubmit={sendMessage} className="flex items-center px-6 py-4 border-t border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800">
          <input
            className="flex-1 border border-gray-300 dark:border-gray-600 rounded-l-full px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type a message..."
            disabled={!selectedTeam}
          />
            <button
              className="bg-blue-600 text-white px-6 py-2 rounded-r-full font-semibold hover:bg-blue-700 transition ml-2"
              type="submit"
              disabled={!selectedTeam || !input.trim()}
            >
              Send
            </button>
          </form>
        )}
      </section>
    </div>
  );
};

export default TeamChat;