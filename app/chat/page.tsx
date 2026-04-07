"use client";

import { useEffect, useState, useRef } from "react";

type Message = {
  type: string;
  room?: string;
  to?: string;
  username: string;
  content: string;
  timestamp: string;
};

type ActiveChat =
  | { type: "room"; id: string }
  | { type: "private"; id: string }
  | null;

function conversationKey(a: string, b: string) {
  return a < b ? `${a}:${b}` : `${b}:${a}`;
}

export default function ChatPage() {
  const wsRef = useRef<WebSocket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const prevChatRef = useRef<ActiveChat>(null);

  const [currentUser, setCurrentUser] = useState("");
  const [joinedRooms, setJoinedRooms] = useState<string[]>([]);
  const [directConvos, setDirectConvos] = useState<string[]>([]);
  const [activeChat, setActiveChat] = useState<ActiveChat>(null);

  const [roomMessages, setRoomMessages] = useState<Record<string, Message[]>>(
    {},
  );
  const [privateMessages, setPrivateMessages] = useState<
    Record<string, Message[]>
  >({});

  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false); // ✅ ADDED

  const [roomsModalOpen, setRoomsModalOpen] = useState(false);
  const [usersModalOpen, setUsersModalOpen] = useState(false);

  const [availableRooms, setAvailableRooms] = useState<string[]>([]);
  const [availableUsers, setAvailableUsers] = useState<string[]>([]);

  const [typingUsers, setTypingUsers] = useState<Record<string, string[]>>({});

  useEffect(() => {
    fetch("http://localhost:8080/me", { credentials: "include" })
      .then((res) => res.json())
      .then((data) => {
        console.log("Current user:", data.username);
        setCurrentUser(data.username);
      });
  }, []);

  useEffect(() => {
    if (!currentUser) return;

    const ws = new WebSocket("ws://localhost:8080/ws");
    wsRef.current = ws;

    ws.onopen = () => console.log("WS connected as", currentUser);

    ws.onmessage = (event) => {
      const msg: Message = JSON.parse(event.data);
      console.log("WS message:", msg);

      if (msg.type === "stop_typing") {
        if (msg.room) {
          const room = msg.room;

          setTypingUsers((prev) => ({
            ...prev,
            [room]: (prev[room] ?? []).filter((u) => u !== msg.username),
          }));
        }

        if (msg.to && msg.username) {
          const otherUser =
            msg.username === currentUser ? msg.to : msg.username;

          if (!otherUser || otherUser === currentUser) return;

          const key = conversationKey(currentUser, otherUser);

          setTypingUsers((prev) => ({
            ...prev,
            [key]: (prev[key] ?? []).filter((u) => u !== msg.username),
          }));
        }
      }

      if (msg.type === "typing") {
        if (msg.username === currentUser) return;

        if (msg.room) {
          const room = msg.room; // narrow to string

          setTypingUsers((prev) => {
            const existing = prev[room] ?? [];
            if (existing.includes(msg.username)) return prev;

            return {
              ...prev,
              [room]: [...existing, msg.username],
            };
          });
        }

        if (msg.to && msg.username) {
          const otherUser =
            msg.username === currentUser ? msg.to : msg.username;

          if (!otherUser || otherUser === currentUser) return;

          const key = conversationKey(currentUser, otherUser);

          setTypingUsers((prev) => {
            const existing = prev[key] ?? [];
            if (existing.includes(msg.username)) return prev;

            return {
              ...prev,
              [key]: [...existing, msg.username],
            };
          });
        }
      }

      if (msg.type === "private" && msg.username) {
        const otherUser = msg.username === currentUser ? msg.to : msg.username;

        if (!otherUser || otherUser === currentUser) return;

        const key = conversationKey(currentUser, otherUser);

        setPrivateMessages((prev) => ({
          ...prev,
          [key]: [...(prev[key] ?? []), msg],
        }));

        setDirectConvos((prev) =>
          prev.includes(otherUser) ? prev : [...prev, otherUser],
        );
      }

      if (msg.type === "chat" && msg.room) {
        const room = msg.room;

        setRoomMessages((prev) => ({
          ...prev,
          [room]: [...(prev[room] ?? []), msg],
        }));
      }

      if ((msg.type === "join" || msg.type === "leave") && msg.room) {
        const room = msg.room;

        setRoomMessages((prev) => ({
          ...prev,
          [room]: [...(prev[room] ?? []), msg],
        }));
      }
    };

    ws.onclose = () => console.log("WS closed");

    return () => ws.close();
  }, [currentUser]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [roomMessages, privateMessages, activeChat]);

  useEffect(() => {
    const ws = wsRef.current;
    const prevChat = prevChatRef.current;

    // If we were typing in previous chat, stop it
    if (ws && prevChat && isTyping) {
      if (prevChat.type === "room") {
        ws.send(JSON.stringify({ type: "stop_typing", room: prevChat.id }));
      }

      if (prevChat.type === "private") {
        ws.send(JSON.stringify({ type: "stop_typing", to: prevChat.id }));
      }
    }

    setIsTyping(false);
    setInput("");

    prevChatRef.current = activeChat;
  }, [activeChat]);

  const sendMessage = () => {
    if (!wsRef.current || !input.trim() || !activeChat) return;

    const text = input;

    if (isTyping) {
      if (activeChat.type === "room") {
        wsRef.current.send(
          JSON.stringify({ type: "stop_typing", room: activeChat.id }),
        );
      }

      if (activeChat.type === "private") {
        wsRef.current.send(
          JSON.stringify({ type: "stop_typing", to: activeChat.id }),
        );
      }

      setIsTyping(false);
    }

    if (activeChat.type === "room") {
      wsRef.current.send(
        JSON.stringify({
          type: "chat",
          room: activeChat.id,
          content: text,
        }),
      );

      setRoomMessages((prev) => ({
        ...prev,
        [activeChat.id]: [
          ...(prev[activeChat.id] ?? []),
          {
            type: "chat",
            room: activeChat.id,
            username: currentUser,
            content: text,
            timestamp: new Date().toISOString(),
          },
        ],
      }));

      setTypingUsers((prev) => ({
        ...prev,
        [activeChat.id]: [],
      }));
    }

    if (activeChat.type === "private") {
      wsRef.current.send(
        JSON.stringify({
          type: "private",
          to: activeChat.id,
          content: text,
        }),
      );

      const key = conversationKey(currentUser, activeChat.id);

      setPrivateMessages((prev) => ({
        ...prev,
        [key]: [
          ...(prev[key] ?? []),
          {
            type: "private",
            to: activeChat.id,
            username: currentUser,
            content: text,
            timestamp: new Date().toISOString(),
          },
        ],
      }));

      setTypingUsers((prev) => ({
        ...prev,
        [key]: [],
      }));
    }

    setInput("");
  };

  const joinRoom = (room: string) => {
    wsRef.current?.send(JSON.stringify({ type: "join", room }));
    setJoinedRooms((prev) => (prev.includes(room) ? prev : [...prev, room]));
    setActiveChat({ type: "room", id: room });
    setRoomsModalOpen(false);
  };

  const leaveRoom = (room: string) => {
    wsRef.current?.send(JSON.stringify({ type: "leave", room }));
    setJoinedRooms((prev) => prev.filter((r) => r !== room));
    if (activeChat?.type === "room" && activeChat.id === room) {
      setActiveChat(null);
    }
  };

  const startConversation = (user: string) => {
    setDirectConvos((prev) => (prev.includes(user) ? prev : [...prev, user]));
    setActiveChat({ type: "private", id: user });
    setUsersModalOpen(false);
  };

  const openRoomsModal = async () => {
    console.log("Fetching rooms...");

    const res = await fetch("http://localhost:8080/rooms", {
      credentials: "include",
    });

    console.log("Rooms status:", res.status);

    const text = await res.text();
    console.log("Raw response text:", text);

    try {
      const parsed = JSON.parse(text);
      console.log("Parsed response:", parsed);
      setAvailableRooms(parsed.rooms ?? parsed ?? []);
    } catch (e) {
      console.log("JSON parse error:", e);
      setAvailableRooms([]);
    }

    setRoomsModalOpen(true);
  };

  const openUsersModal = async () => {
    console.log("Fetching users...");

    try {
      const res = await fetch("http://localhost:8080/users", {
        credentials: "include",
      });

      console.log("Users status:", res.status);

      const text = await res.text();
      console.log("Raw users response:", text);

      let parsed: any = null;

      try {
        parsed = JSON.parse(text);
        console.log("Parsed users response:", parsed);
      } catch (err) {
        console.log("Users JSON parse error:", err);
      }

      const users = Array.isArray(parsed)
        ? parsed
        : Array.isArray(parsed?.users)
          ? parsed.users
          : [];

      setAvailableUsers(users.filter((u: string) => u !== currentUser));

      setUsersModalOpen(true);
    } catch (err) {
      console.log("Users fetch failed:", err);
      setAvailableUsers([]);
      setUsersModalOpen(true);
    }
  };

  const currentMessages: Message[] = (() => {
    if (!activeChat) return [];
    if (activeChat.type === "room") {
      return roomMessages[activeChat.id] ?? [];
    }
    const key = conversationKey(currentUser, activeChat.id);
    return privateMessages[key] ?? [];
  })();

  return (
    <div className="h-screen flex bg-black text-white">
      <div className="w-80 border-r border-white/10 p-6 flex flex-col bg-[#0f0f14]">
        <div className="text-3xl font-bold mb-10 bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
          WhatsApp Lite
        </div>

        {/* Rooms Section */}
        <div className="mb-10">
          <div className="flex justify-between items-center mb-4">
            <span className="text-gray-400 uppercase text-xs tracking-wider">
              Rooms
            </span>
            <button
              onClick={openRoomsModal}
              className="text-sm px-3 py-1 rounded-md bg-white/5 hover:bg-white/10 transition cursor-pointer"
            >
              + Join
            </button>
          </div>

          <div className="space-y-2">
            {joinedRooms.map((room) => {
              const isActive =
                activeChat?.type === "room" && activeChat.id === room;

              return (
                <div
                  key={room}
                  className={`group flex justify-between items-center px-3 py-2 rounded-lg transition cursor-pointer ${
                    isActive
                      ? "bg-purple-600/30 border border-purple-500/40"
                      : "hover:bg-white/5"
                  }`}
                >
                  <div
                    onClick={() => setActiveChat({ type: "room", id: room })}
                    className="flex-1"
                  >
                    # {room}
                  </div>

                  <button
                    onClick={() => leaveRoom(room)}
                    className="text-xs px-2 py-1 rounded bg-red-500/10 hover:bg-red-500/20 text-red-400 transition cursor-pointer"
                  >
                    Leave
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Direct Messages */}
        <div>
          <div className="flex justify-between items-center mb-4">
            <span className="text-gray-400 uppercase text-xs tracking-wider">
              Direct Messages
            </span>
            <button
              onClick={openUsersModal}
              className="text-sm px-3 py-1 rounded-md bg-white/5 hover:bg-white/10 transition cursor-pointer"
            >
              + New
            </button>
          </div>

          <div className="space-y-2">
            {directConvos.map((user) => {
              const isActive =
                activeChat?.type === "private" && activeChat.id === user;

              return (
                <div
                  key={user}
                  onClick={() => setActiveChat({ type: "private", id: user })}
                  className={`px-3 py-2 rounded-lg transition cursor-pointer ${
                    isActive
                      ? "bg-purple-600/30 border border-purple-500/40"
                      : "hover:bg-white/5"
                  }`}
                >
                  {user}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col">
        <div className="p-6 border-b border-white/10 flex justify-between items-center bg-[#12121a]">
          <div className="text-xl font-semibold tracking-wide">
            {activeChat
              ? activeChat.type === "room"
                ? `# ${activeChat.id}`
                : activeChat.id
              : "Select chat"}
          </div>

          {activeChat?.type === "room" && (
            <button
              onClick={() => leaveRoom(activeChat.id)}
              className="px-4 py-2 text-sm rounded-md bg-red-500/10 hover:bg-red-500/20 text-red-400 transition cursor-pointer"
            >
              Leave Room
            </button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-8 space-y-4">
          {currentMessages.map((msg, i) => {
            const isMine = msg.username === currentUser;

            if (msg.type === "join") {
              return (
                <div key={i} className="text-center text-gray-500 text-sm">
                  {msg.username} joined
                </div>
              );
            }

            if (msg.type === "leave") {
              return (
                <div key={i} className="text-center text-gray-500 text-sm">
                  {msg.username} left
                </div>
              );
            }

            return (
              <div
                key={i}
                className={`flex ${isMine ? "justify-end" : "justify-start"} animate-fadeIn`}
              >
                <div className="max-w-md space-y-1">
                  {!isMine && activeChat?.type === "room" && (
                    <div className="text-xs text-purple-400">
                      {msg.username}
                    </div>
                  )}

                  <div
                    className={`px-4 py-2 rounded-2xl shadow-sm ${
                      isMine
                        ? "bg-gradient-to-r from-purple-600 to-blue-600 text-white"
                        : "bg-white/5 border border-white/10 text-white"
                    }`}
                  >
                    {msg.content}
                  </div>

                  <div className="text-xs text-gray-500">
                    {msg.timestamp
                      ? new Date(msg.timestamp).toLocaleTimeString()
                      : ""}
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        {activeChat && (
          <div className="text-sm text-purple-400 px-8 h-6">
            {(() => {
              if (activeChat.type === "room") {
                const users = typingUsers[activeChat.id] ?? [];
                if (users.length === 0) return null;
                return `${users.join(", ")} typing...`;
              }

              const key = conversationKey(currentUser, activeChat.id);
              const users = typingUsers[key] ?? [];
              if (users.length === 0) return null;
              return `${users[0]} typing...`;
            })()}
          </div>
        )}

        {activeChat && (
          <div className="p-6 border-t border-white/10 flex gap-4 bg-[#12121a]">
            <input
              value={input}
              onChange={(e) => {
                const value = e.target.value;
                setInput(value);

                if (!wsRef.current || !activeChat) return;

                const hasText = value.trim().length > 0;

                // START typing once
                if (hasText && !isTyping) {
                  setIsTyping(true);

                  if (activeChat.type === "room") {
                    wsRef.current.send(
                      JSON.stringify({ type: "typing", room: activeChat.id }),
                    );
                  }

                  if (activeChat.type === "private") {
                    wsRef.current.send(
                      JSON.stringify({ type: "typing", to: activeChat.id }),
                    );
                  }
                }

                // STOP typing once
                if (!hasText && isTyping) {
                  setIsTyping(false);

                  if (activeChat.type === "room") {
                    wsRef.current.send(
                      JSON.stringify({
                        type: "stop_typing",
                        room: activeChat.id,
                      }),
                    );
                  }

                  if (activeChat.type === "private") {
                    wsRef.current.send(
                      JSON.stringify({
                        type: "stop_typing",
                        to: activeChat.id,
                      }),
                    );
                  }
                }
              }}
              className="flex-1 bg-black border border-white/20 rounded-full px-5 py-3 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition"
              onKeyDown={(e) => e.key === "Enter" && sendMessage()}
            />
            <button
              onClick={sendMessage}
              className="px-6 py-3 rounded-full bg-gradient-to-r from-purple-600 to-blue-600 hover:opacity-90 transition cursor-pointer shadow-md"
            >
              Send
            </button>
          </div>
        )}
      </div>

      {roomsModalOpen && (
        <RoomModal
          availableRooms={availableRooms}
          onJoin={joinRoom}
          onClose={() => setRoomsModalOpen(false)}
        />
      )}

      {usersModalOpen && (
        <Modal
          title="Start Conversation"
          items={availableUsers}
          onSelect={startConversation}
          onClose={() => setUsersModalOpen(false)}
        />
      )}
    </div>
  );
}

function Modal({
  title,
  items,
  onSelect,
  onClose,
}: {
  title: string;
  items: string[];
  onSelect: (value: string) => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-md flex items-center justify-center z-50">
      <div className="bg-[#14141c] border border-white/10 p-6 rounded-2xl w-96 shadow-xl">
        <div className="flex justify-between mb-4">
          <h2>{title}</h2>
          <button
            className="text-gray-400 px-1 hover:text-gray-200 cursor-pointer transition hover:bg-white/10 rounded-full"
            onClick={onClose}
          >
            ✕
          </button>
        </div>
        <div className="space-y-2">
          {items && items.length === 0 && <div>No items</div>}
          {items?.map((item) => (
            <div
              key={item}
              onClick={() => onSelect(item)}
              className="cursor-pointer px-3 py-2 rounded hover:bg-white/10"
            >
              {item}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function RoomModal({
  availableRooms,
  onJoin,
  onClose,
}: {
  availableRooms: string[];
  onJoin: (room: string) => void;
  onClose: () => void;
}) {
  const [newRoom, setNewRoom] = useState("");

  const handleCreate = () => {
    if (!newRoom.trim()) return;
    onJoin(newRoom.trim());
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-[#14141c] border border-white/10 p-6 rounded-2xl w-96 shadow-xl">
        <div className="flex justify-between mb-4">
          <h2 className="text-lg font-semibold">Join or Create Room</h2>
          <button onClick={onClose}>✕</button>
        </div>

        <div className="mb-5 space-y-3">
          <input
            value={newRoom}
            onChange={(e) => setNewRoom(e.target.value)}
            placeholder="Enter new room name"
            className="w-full bg-black border border-white/20 rounded-lg px-3 py-2 focus:outline-none focus:border-purple-500"
          />

          <button
            onClick={handleCreate}
            className="w-full bg-gradient-to-r from-purple-600 to-blue-600 py-2 rounded-lg hover:opacity-90 cursor-pointer"
          >
            Create & Join
          </button>
        </div>

        <div className="border-t border-white/10 my-4" />

        <div className="space-y-2 max-h-56 overflow-y-auto">
          {availableRooms.length > 0 ? (
            availableRooms.map((room) => (
              <div
                key={room}
                onClick={() => onJoin(room)}
                className="cursor-pointer px-3 py-2 rounded hover:bg-white/10"
              >
                # {room}
              </div>
            ))
          ) : (
            <div className="text-gray-400 text-sm">
              No rooms yet. Create one above.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
