"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Image as ImageIcon, Smile, MoreVertical, Shield, Lock, EyeOff, Paperclip, Mic } from "lucide-react";
import { useUser } from "@clerk/nextjs";
import { io, Socket } from "socket.io-client";

interface Message {
  id: string;
  text: string;
  senderId: string;
  isSecret?: boolean;
}

import { useParams } from "next/navigation";

export default function ChatRoom() {
  const { user, isLoaded } = useUser();
  const params = useParams();
  const roomId = params?.id as string;
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [socket, setSocket] = useState<Socket | null>(null);
  const [activeUserId, setActiveUserId] = useState<string | null>(null);
  const [participantCount, setParticipantCount] = useState(1);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Set active user ID on mount (supports guest login)
  useEffect(() => {
    if (!isLoaded) return;
    if (user?.id) {
      setActiveUserId(user.id);
    } else {
      const guestId = localStorage.getItem("puxy_guest_id");
      if (guestId) {
        setActiveUserId(guestId);
      }
    }
  }, [user, isLoaded]);

  useEffect(() => {
    if (!activeUserId) return;
    const newSocket = io("http://localhost:3001");
    setSocket(newSocket);

    newSocket.on("connect", () => {
      newSocket.emit("joinRoom", { roomId, userId: activeUserId });
    });

    newSocket.on("roomData", (data: { participantCount: number }) => {
      setParticipantCount(data.participantCount);
    });

    newSocket.on("previousMessages", (prevMessages: any[]) => {
      setMessages(prevMessages.map(m => ({
        id: m.id,
        text: m.content || "",
        senderId: m.sender?.clerkId || m.senderId,
      })));
    });

    newSocket.on("newMessage", (message: any) => {
      setMessages((prev) => [...prev, {
        id: message.id,
        text: message.content,
        senderId: message.sender?.clerkId || message.senderId,
      }]);
    });

    return () => { newSocket.close(); };
  }, [activeUserId, roomId]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeUserId) return;

    const formData = new FormData();
    formData.append("file", file);

    try {
      // 1. Upload to backend/Cloudinary
      const res = await fetch("http://localhost:3001/api/media", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      
      if (data.url) {
        // 2. Send message with media URL
        socket?.emit("sendMessage", { 
          roomId, 
          userId: activeUserId, 
          text: data.url,
          type: "IMAGE" // Simplified, can detect based on mime type
        });
      }
    } catch (err) {
      console.error("Upload failed", err);
    }
  };

  const handleSend = () => {
    if (!input.trim() || !activeUserId) return;
    socket?.emit("sendMessage", { roomId, userId: activeUserId, text: input });
    setInput("");
  };

  return (
    <div className="flex h-screen bg-black text-white overflow-hidden selection:bg-white/20">
      
      {/* Sidebar (Hidden on mobile by default) */}
      <aside className="hidden md:flex flex-col w-80 bg-neutral-950 border-r border-white/5">
        <div className="p-6 border-b border-white/5 flex items-center justify-between">
          <h2 className="font-semibold text-lg flex items-center gap-2">
            <Lock className="w-4 h-4 text-neutral-400" /> Room Details
          </h2>
        </div>
        <div className="p-6 flex flex-col gap-6 flex-1">
          <div>
            <p className="text-xs text-neutral-500 uppercase tracking-wider mb-2 font-semibold">Status</p>
            <div className="flex items-center gap-2 text-sm text-green-400 bg-green-400/10 px-3 py-1.5 rounded-full w-fit">
              <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" /> Secure Connection
            </div>
          </div>
          <div>
            <p className="text-xs text-neutral-500 uppercase tracking-wider mb-2 font-semibold">Participants</p>
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600" />
                <span className="text-sm">You</span>
              </div>
              
              {participantCount >= 2 ? (
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-pink-500 to-rose-500" />
                  <span className="text-sm">Partner</span>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-neutral-800 animate-pulse" />
                  <span className="text-sm text-neutral-400">Waiting for partner...</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </aside>

      {/* Main Chat Area */}
      <main className="flex-1 flex flex-col relative bg-[url('https://grainy-gradients.vercel.app/noise.svg')] bg-blend-overlay">
        
        {/* Chat Header */}
        <header className="h-20 px-6 flex items-center justify-between bg-black/50 backdrop-blur-xl border-b border-white/5 z-10 sticky top-0">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-[0_0_15px_rgba(99,102,241,0.3)]">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-semibold text-lg">Private Session</h1>
              <p className="text-xs text-neutral-400">End-to-End Encrypted</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button className="p-2 text-neutral-400 hover:text-white transition-colors">
              <EyeOff className="w-5 h-5" />
            </button>
            <button className="p-2 text-neutral-400 hover:text-white transition-colors">
              <MoreVertical className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">
          
          <div className="flex items-center justify-center my-4">
            <span className="text-xs text-neutral-500 bg-neutral-900/50 px-4 py-1 rounded-full backdrop-blur-md">
              Room Created. Waiting for the second person to join.
            </span>
          </div>

          <AnimatePresence>
            {messages.map((msg) => {
              const isMe = msg.senderId === activeUserId;
              const isImage = msg.text.startsWith("http") && msg.text.includes("cloudinary.com");
              
              return (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className={`flex ${isMe ? "justify-end" : "justify-start"}`}
                >
                  <div 
                    className={`max-w-[70%] px-5 py-3 text-[15px] leading-relaxed shadow-lg backdrop-blur-md overflow-hidden ${
                      isMe 
                        ? "bg-white text-black rounded-3xl rounded-tr-sm" 
                        : "bg-white/10 text-white rounded-3xl rounded-tl-sm border border-white/5"
                    } ${isImage ? "!p-1 !bg-transparent !border-0" : ""}`}
                  >
                    {isImage ? (
                      <img src={msg.text} alt="Shared Media" className="rounded-3xl max-w-sm max-h-80 object-cover" />
                    ) : (
                      msg.text
                    )}
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-4 bg-black/50 backdrop-blur-xl border-t border-white/5">
          <div className="max-w-4xl mx-auto flex items-end gap-2 bg-neutral-900/50 border border-white/10 rounded-3xl p-2 transition-colors focus-within:border-white/30 focus-within:bg-neutral-900">
            <input 
              type="file" 
              className="hidden" 
              ref={fileInputRef} 
              onChange={handleFileUpload} 
              accept="image/*,video/*"
            />
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="p-3 text-neutral-400 hover:text-white transition-colors rounded-full hover:bg-white/5"
            >
              <Paperclip className="w-5 h-5" />
            </button>
            
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder="Type a secure message..."
              className="flex-1 bg-transparent resize-none max-h-32 outline-none text-[15px] py-3 placeholder:text-neutral-500"
              rows={1}
            />
            
            {input.trim() ? (
              <motion.button 
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                onClick={handleSend}
                className="p-3 bg-white text-black rounded-full hover:scale-105 transition-transform"
              >
                <Send className="w-5 h-5" />
              </motion.button>
            ) : (
              <button className="p-3 text-neutral-400 hover:text-white transition-colors rounded-full hover:bg-white/5">
                <Mic className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
