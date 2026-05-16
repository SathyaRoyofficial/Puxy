"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Send, Smile, MoreVertical, Shield, Lock, EyeOff,
  Paperclip, Mic, Sticker, X, Copy, Trash2, Timer, ArrowLeft
} from "lucide-react";
import EmojiPicker, { Theme } from "emoji-picker-react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useChat, ChatMessage } from "./useChat";
import { MessageBubble, TypingIndicator, MessageContextMenu } from "./MessageBubble";
import { StickerPicker } from "./StickerPicker";

interface Stickers { dudububu: string[]; adulty: string[]; }

export default function ChatRoom() {
  const params = useParams();
  const router = useRouter();
  const roomId = params?.id as string;

  const {
    messages, socket, activeUserId, participantCount,
    isPartnerTyping, isPartnerOnline, partnerLastSeen, roomExpiresAt,
    sendMessage, sendTyping, sendStopTyping, deleteMessage,
  } = useChat({ roomId });

  const [input, setInput] = useState("");
  const [showEmoji, setShowEmoji] = useState(false);
  const [showSticker, setShowSticker] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [stickers, setStickers] = useState<Stickers>({ dudububu: [], adulty: [] });
  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null);
  const [contextMsg, setContextMsg] = useState<ChatMessage | null>(null);
  const [disappearMode, setDisappearMode] = useState(false);
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load stickers
  useEffect(() => {
    fetch("/stickers.json")
      .then(r => r.json())
      .then(setStickers)
      .catch(() => {});
  }, []);

  // Fetch current invite link
  useEffect(() => {
    if (!roomId) return;
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001";
    fetch(`${backendUrl}/api/rooms/${activeUserId || "none"}`)
      .then(r => r.json())
      .then(data => {
        const room = data.rooms?.find((r: any) => r.id === roomId);
        if (room?.inviteLink) setInviteLink(room.inviteLink);
      })
      .catch(() => {});
  }, [roomId, activeUserId]);

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isPartnerTyping]);

  // Typing emit with debounce
  const handleInputChange = useCallback((val: string) => {
    setInput(val);
    sendTyping();
    if (typingDebounce.current) clearTimeout(typingDebounce.current);
    typingDebounce.current = setTimeout(() => sendStopTyping(), 1500);
  }, [sendTyping, sendStopTyping]);

  const handleSend = () => {
    if (!input.trim()) return;
    sendMessage(input.trim(), "TEXT", replyTo?.id, undefined);
    setInput("");
    setReplyTo(null);
    sendStopTyping();
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeUserId) return;
    const formData = new FormData();
    formData.append("file", file);
    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001";
      const res = await fetch(`${backendUrl}/api/media`, { method: "POST", body: formData });
      const data = await res.json();
      if (data.url) {
        sendMessage(data.url, "IMAGE", replyTo?.id, data.publicId);
        setReplyTo(null);
      }
    } catch (err) { console.error("Upload failed", err); }
  };

  const handleStickerSelect = (url: string) => {
    sendMessage(url, "STICKER", replyTo?.id);
    setShowSticker(false);
    setReplyTo(null);
  };

  const handleDeleteRoom = async () => {
    if (!confirm("Delete this room? All messages and media will be permanently removed.")) return;
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001";
    await fetch(`${backendUrl}/api/rooms/${roomId}`, { method: "DELETE" });
    router.push("/dashboard");
  };

  const copyInviteLink = () => {
    if (!inviteLink) return;
    navigator.clipboard.writeText(inviteLink);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const partnerStatusText = () => {
    if (participantCount < 2) return "Waiting for partner...";
    if (isPartnerOnline) return "🟢 Online";
    if (partnerLastSeen) {
      const mins = Math.round((Date.now() - partnerLastSeen.getTime()) / 60000);
      if (mins < 1) return "Last seen just now";
      if (mins < 60) return `Last seen ${mins}m ago`;
      return `Last seen ${Math.round(mins / 60)}h ago`;
    }
    return "🔒 End-to-End Encrypted";
  };

  const roomExpiry = roomExpiresAt ? (() => {
    const diff = new Date(roomExpiresAt).getTime() - Date.now();
    if (diff < 0) return "Expired";
    const h = Math.floor(diff / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    return `${h}h ${m}m remaining`;
  })() : null;

  return (
    <div className="flex h-screen bg-black text-white overflow-hidden">

      {/* Sidebar */}
      <aside className="hidden md:flex flex-col w-72 bg-neutral-950 border-r border-white/5">
        <div className="p-5 border-b border-white/5 flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-2 text-neutral-400 hover:text-white transition-colors text-sm">
            <ArrowLeft className="w-4 h-4" /> Dashboard
          </Link>
        </div>
        <div className="p-5 flex flex-col gap-5 flex-1 overflow-y-auto">
          {/* Status */}
          <div>
            <p className="text-[10px] text-neutral-500 uppercase tracking-widest mb-2 font-semibold">Status</p>
            <div className="flex items-center gap-2 text-xs text-green-400 bg-green-400/10 px-3 py-1.5 rounded-full w-fit">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" /> Secure Connection
            </div>
          </div>

          {/* Room expiry */}
          {roomExpiry && (
            <div>
              <p className="text-[10px] text-neutral-500 uppercase tracking-widest mb-2 font-semibold">Room Expires</p>
              <div className="flex items-center gap-2 text-xs text-amber-400 bg-amber-400/10 px-3 py-1.5 rounded-full w-fit">
                <Timer className="w-3 h-3" /> {roomExpiry}
              </div>
            </div>
          )}

          {/* Participants */}
          <div>
            <p className="text-[10px] text-neutral-500 uppercase tracking-widest mb-2 font-semibold">Participants</p>
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600" />
                <span className="text-sm">You</span>
                <span className="ml-auto text-[10px] text-green-400">Online</span>
              </div>
              {participantCount >= 2 ? (
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-pink-500 to-rose-500" />
                  <span className="text-sm">Partner</span>
                  <span className={`ml-auto text-[10px] ${isPartnerOnline ? "text-green-400" : "text-neutral-500"}`}>
                    {isPartnerOnline ? "Online" : "Away"}
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-full bg-neutral-800 animate-pulse" />
                  <span className="text-sm text-neutral-500">Waiting...</span>
                </div>
              )}
            </div>
          </div>

          {/* Invite link */}
          <div>
            <p className="text-[10px] text-neutral-500 uppercase tracking-widest mb-2 font-semibold">Invite Link</p>
            {inviteLink ? (
              <button
                onClick={copyInviteLink}
                className="flex items-center gap-2 px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-xs text-neutral-300 hover:bg-white/10 transition-colors w-full"
              >
                <Copy className="w-3.5 h-3.5 shrink-0" />
                {copiedLink ? "Copied!" : "Copy Link"}
              </button>
            ) : (
              <span className="text-xs text-neutral-600">No active invite</span>
            )}
          </div>

          {/* Disappearing messages */}
          <div>
            <p className="text-[10px] text-neutral-500 uppercase tracking-widest mb-2 font-semibold">Disappearing Messages</p>
            <button
              onClick={() => setDisappearMode(v => !v)}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs transition-colors w-fit ${
                disappearMode ? "bg-purple-500/20 text-purple-300 border border-purple-500/30" : "bg-white/5 text-neutral-400 border border-white/10"
              }`}
            >
              <Timer className="w-3.5 h-3.5" />
              {disappearMode ? "On — 5 min" : "Off"}
            </button>
          </div>

          {/* Danger zone */}
          <div className="mt-auto pt-5 border-t border-white/5">
            <button
              onClick={handleDeleteRoom}
              className="flex items-center gap-2 px-3 py-2 text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-xl transition-colors w-full"
            >
              <Trash2 className="w-3.5 h-3.5" /> Delete Room
            </button>
          </div>
        </div>
      </aside>

      {/* Main Chat */}
      <main className="flex-1 flex flex-col relative min-w-0">

        {/* Header */}
        <header className="h-16 px-4 md:px-6 flex items-center justify-between bg-black/60 backdrop-blur-xl border-b border-white/5 z-10 sticky top-0">
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="md:hidden p-1.5 text-neutral-400 hover:text-white">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div className="relative w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-[0_0_12px_rgba(99,102,241,0.4)]">
              <Shield className="w-4 h-4 text-white" />
              {isPartnerOnline && participantCount >= 2 && (
                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-400 rounded-full border-2 border-black" />
              )}
            </div>
            <div>
              <h1 className="font-semibold text-sm leading-tight">Private Session</h1>
              <p className="text-[11px] text-neutral-400 leading-tight">{partnerStatusText()}</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {inviteLink && (
              <button onClick={copyInviteLink} className="p-2 text-neutral-400 hover:text-white transition-colors" title="Copy invite link">
                {copiedLink ? <span className="text-[11px] text-green-400">Copied!</span> : <Copy className="w-4 h-4" />}
              </button>
            )}
            <button className="p-2 text-neutral-400 hover:text-white transition-colors">
              <EyeOff className="w-4 h-4" />
            </button>
            <button onClick={() => setShowMenu(v => !v)} className="p-2 text-neutral-400 hover:text-white transition-colors">
              <MoreVertical className="w-4 h-4" />
            </button>
          </div>

          {/* Dropdown menu */}
          {showMenu && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -4 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              className="absolute top-14 right-4 bg-neutral-900 border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden min-w-[180px]"
            >
              <button onClick={() => { setDisappearMode(v => !v); setShowMenu(false); }}
                className="w-full px-4 py-3 text-sm text-left hover:bg-white/5 flex items-center gap-3">
                <Timer className="w-4 h-4 text-purple-400" />
                {disappearMode ? "Disable" : "Enable"} Disappearing
              </button>
              <button onClick={() => { copyInviteLink(); setShowMenu(false); }}
                className="w-full px-4 py-3 text-sm text-left hover:bg-white/5 flex items-center gap-3">
                <Copy className="w-4 h-4 text-blue-400" /> Copy Invite Link
              </button>
              <button onClick={() => { handleDeleteRoom(); setShowMenu(false); }}
                className="w-full px-4 py-3 text-sm text-left text-red-400 hover:bg-red-500/10 flex items-center gap-3 border-t border-white/5">
                <Trash2 className="w-4 h-4" /> Delete Room
              </button>
            </motion.div>
          )}
        </header>

        {/* Messages */}
        <div
          className="flex-1 overflow-y-auto px-4 md:px-6 py-4 flex flex-col gap-3"
          onClick={() => { setShowEmoji(false); setShowSticker(false); setShowMenu(false); }}
        >
          <div className="flex items-center justify-center my-2">
            <span className="text-[11px] text-neutral-500 bg-neutral-900/60 px-3 py-1 rounded-full backdrop-blur-md flex items-center gap-1.5">
              <Lock className="w-3 h-3" /> End-to-End Encrypted
            </span>
          </div>

          <AnimatePresence initial={false}>
            {messages.map(msg => (
              <MessageBubble
                key={msg.id}
                msg={msg}
                isMe={msg.senderId === activeUserId}
                onLongPress={setContextMsg}
                onSwipeReply={setReplyTo}
              />
            ))}
          </AnimatePresence>

          {/* Typing indicator */}
          <AnimatePresence>
            {isPartnerTyping && <TypingIndicator />}
          </AnimatePresence>

          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="px-3 py-3 bg-black/60 backdrop-blur-xl border-t border-white/5 relative">

          {/* Emoji Picker */}
          {showEmoji && (
            <div className="absolute bottom-20 left-4 z-50 shadow-2xl rounded-2xl overflow-hidden border border-white/10">
              <EmojiPicker
                theme={Theme.DARK}
                onEmojiClick={e => { setInput(p => p + e.emoji); setShowEmoji(false); }}
                height={360}
              />
            </div>
          )}

          {/* Sticker Picker */}
          {showSticker && (
            <StickerPicker stickers={stickers} onSelect={handleStickerSelect} />
          )}

          {/* Reply preview */}
          {replyTo && (
            <motion.div
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-2 mx-1 flex items-center gap-2 px-3 py-2 bg-white/5 border-l-2 border-indigo-500 rounded-xl"
            >
              <span className="text-xs text-neutral-400 flex-1 truncate">
                ↩ Replying: {replyTo.content.slice(0, 60)}{replyTo.content.length > 60 ? "…" : ""}
              </span>
              <button onClick={() => setReplyTo(null)} className="text-neutral-500 hover:text-white">
                <X className="w-3.5 h-3.5" />
              </button>
            </motion.div>
          )}

          {/* Disappearing mode badge */}
          {disappearMode && (
            <div className="mb-2 flex items-center gap-1.5 px-3 text-[11px] text-purple-400">
              <Timer className="w-3 h-3" /> Messages disappear in 5 minutes
            </div>
          )}

          <div className="flex items-end gap-2 bg-neutral-900/60 border border-white/10 rounded-3xl px-2 py-1.5 transition-colors focus-within:border-white/25 focus-within:bg-neutral-900/80">
            <input type="file" className="hidden" ref={fileInputRef} onChange={handleFileUpload} accept="image/*,video/*,audio/*" />

            <button onClick={() => fileInputRef.current?.click()}
              className="p-2.5 text-neutral-400 hover:text-white transition-colors rounded-full hover:bg-white/5 shrink-0">
              <Paperclip className="w-4 h-4" />
            </button>

            <button onClick={() => { setShowEmoji(v => !v); setShowSticker(false); }}
              className="p-2.5 text-neutral-400 hover:text-white transition-colors rounded-full hover:bg-white/5 shrink-0">
              <Smile className="w-4 h-4" />
            </button>

            <button onClick={() => { setShowSticker(v => !v); setShowEmoji(false); }}
              className="p-2.5 text-neutral-400 hover:text-white transition-colors rounded-full hover:bg-white/5 shrink-0">
              <Sticker className="w-4 h-4" />
            </button>

            <textarea
              value={input}
              onChange={e => handleInputChange(e.target.value)}
              onKeyDown={e => {
                if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
              }}
              placeholder="Type a secure message..."
              className="flex-1 bg-transparent resize-none max-h-28 outline-none text-sm py-2.5 placeholder:text-neutral-600 leading-relaxed"
              rows={1}
            />

            {input.trim() ? (
              <motion.button
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                onClick={handleSend}
                className="p-2.5 bg-white text-black rounded-full hover:scale-105 transition-transform shrink-0"
              >
                <Send className="w-4 h-4" />
              </motion.button>
            ) : (
              <button className="p-2.5 text-neutral-400 hover:text-white transition-colors rounded-full hover:bg-white/5 shrink-0">
                <Mic className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </main>

      {/* Context Menu */}
      {contextMsg && (
        <MessageContextMenu
          msg={contextMsg}
          isMe={contextMsg.senderId === activeUserId}
          onReply={() => setReplyTo(contextMsg)}
          onDelete={(forEveryone) => deleteMessage(contextMsg.id, forEveryone)}
          onClose={() => setContextMsg(null)}
        />
      )}
    </div>
  );
}
