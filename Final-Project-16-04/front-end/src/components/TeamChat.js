import React, { useEffect, useRef, useState } from "react";
import { MdGroup } from "react-icons/md";
import io from "socket.io-client";

const SOCKET_URL = "http://localhost:5000"; // Adjust if needed

const TeamChat = ({ teams = [], user }) => {
  const [selectedTeam, setSelectedTeam] = useState(teams[0] || null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const socketRef = useRef(null);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (!selectedTeam || !user) return;
    socketRef.current = io(SOCKET_URL, { transports: ["websocket"] });
    socketRef.current.emit("join-team-chat", { teamId: selectedTeam.id, userId: user.id });
    socketRef.current.on("team-message-history", (msgs) => {
      setMessages(msgs);
      scrollToBottom();
    });
    socketRef.current.on("team-message", (msg) => {
      setMessages((prev) => [...prev, msg]);
      scrollToBottom();
    });
    return () => {
      socketRef.current.disconnect();
    };
    // eslint-disable-next-line
  }, [selectedTeam, user?.id]);

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
    if (!input.trim() || !selectedTeam) return;
    socketRef.current.emit("send-team-message", {
      teamId: selectedTeam.id,
      userId: user.id,
      message: input.trim(),
    });
    setInput("");
  };

  return (
    <div className="flex h-[80vh] md:h-[90vh] bg-white rounded-lg shadow-lg overflow-hidden max-w-5xl mx-auto mt-8 border border-gray-200">
      {/* Sidebar: Team List */}
      <aside className="w-64 bg-gray-50 border-r border-gray-200 flex flex-col">
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-700 mb-2">Teams</h2>
        </div>
        <ul className="flex-1 overflow-y-auto">
          {teams.length === 0 && (
            <li className="text-gray-400 p-4">No teams</li>
          )}
          {teams.map(team => (
            <li
              key={team.id}
              className={`flex items-center px-4 py-3 cursor-pointer hover:bg-blue-50 transition-colors ${selectedTeam?.id === team.id ? 'bg-blue-50 border-l-4 border-blue-600' : ''}`}
              onClick={() => setSelectedTeam(team)}
            >
              <span className="bg-blue-100 text-blue-700 rounded-full p-2 mr-3">
                <MdGroup className="text-xl" />
              </span>
              <span className="font-medium text-gray-800 truncate">{team.name}</span>
            </li>
          ))}
        </ul>
      </aside>

      {/* Main Chat Area */}
      <section className="flex-1 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-white">
          <div>
            <h3 className="text-xl font-semibold text-blue-700">{selectedTeam ? selectedTeam.name : 'Select a team'}</h3>
            {selectedTeam && selectedTeam.members && (
              <div className="text-xs text-gray-500 mt-1">
                {selectedTeam.members.map(m => m.name).join(', ')}
              </div>
            )}
          </div>
        </div>
        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-6 py-4 bg-gray-50">
          {!selectedTeam ? (
            <div className="text-gray-400 text-center mt-20">Select a team to start chatting.</div>
          ) : (
            <div className="flex flex-col gap-2">
              {messages.map((msg, idx) => {
                if (msg.system) {
                  return (
                    <div key={idx} className="text-center text-gray-400 text-sm my-2">{msg.message}</div>
                  );
                }
                const isMe = msg.userId === user.id;
                return (
                  <div key={msg.id || idx} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[70%] px-4 py-2 rounded-lg shadow-sm ${isMe ? 'bg-blue-600 text-white' : 'bg-white border border-gray-200 text-gray-800'}`}>
                      <div className="text-xs font-semibold mb-1">
                        {isMe ? 'You' : msg.username || msg.name || msg.email}
                        <span className="ml-2 text-[10px] text-gray-400">{msg.createdAt ? new Date(msg.createdAt).toLocaleTimeString() : ""}</span>
                      </div>
                      <div className="break-words whitespace-pre-wrap">{msg.message}</div>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>
        {/* Input */}
        {selectedTeam && (
          <form onSubmit={sendMessage} className="flex items-center px-6 py-4 border-t border-gray-200 bg-white">
            <input
              className="flex-1 border rounded-l-full px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
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