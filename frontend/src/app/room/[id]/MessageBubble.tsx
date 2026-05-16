"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Check, CheckCheck, Clock } from "lucide-react";
import { ChatMessage } from "./useChat";

interface MessageBubbleProps {
  msg: ChatMessage;
  isMe: boolean;
  onLongPress: (msg: ChatMessage) => void;
  onSwipeReply: (msg: ChatMessage) => void;
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function ReadReceipt({ msg, isMe }: { msg: ChatMessage; isMe: boolean }) {
  if (!isMe) return null;
  if (msg.readAt) return <CheckCheck className="w-3.5 h-3.5 text-blue-400" />;
  if (msg.deliveredAt) return <CheckCheck className="w-3.5 h-3.5 text-neutral-400" />;
  return <Check className="w-3.5 h-3.5 text-neutral-500" />;
}

export function MessageBubble({ msg, isMe, onLongPress, onSwipeReply }: MessageBubbleProps) {
  const isDeleted = !!msg.deletedForEveryone || (!!msg.deletedAt && msg.deletedForEveryone);
  const isImage = !isDeleted && msg.content.startsWith("http") && (msg.content.includes("cloudinary.com") || msg.content.includes("res.cloudinary"));
  const isSticker = msg.type === "STICKER" || msg.type === "GIF";

  let pressTimer: ReturnType<typeof setTimeout>;

  const handleMouseDown = () => {
    pressTimer = setTimeout(() => onLongPress(msg), 500);
  };
  const handleMouseUp = () => clearTimeout(pressTimer);
  const handleTouchStart = () => {
    pressTimer = setTimeout(() => onLongPress(msg), 500);
  };
  const handleTouchEnd = () => clearTimeout(pressTimer);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ type: "spring", stiffness: 400, damping: 30 }}
      className={`flex flex-col gap-1 ${isMe ? "items-end" : "items-start"}`}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Reply quote */}
      {msg.replyTo && !isDeleted && (
        <div
          className={`max-w-[70%] px-3 py-1.5 rounded-xl text-xs border-l-2 border-indigo-500 bg-white/5 text-neutral-400 truncate ${isMe ? "mr-1" : "ml-1"}`}
          title={msg.replyTo.content}
        >
          ↩ {msg.replyTo.content.length > 60 ? msg.replyTo.content.slice(0, 60) + "…" : msg.replyTo.content}
        </div>
      )}

      <div className="flex items-end gap-2">
        {/* Swipe reply button (left side for partner messages) */}
        {!isMe && (
          <button
            onClick={() => onSwipeReply(msg)}
            className="opacity-0 group-hover:opacity-100 p-1 text-neutral-600 hover:text-white transition-all"
            title="Reply"
          >
            ↩
          </button>
        )}

        <div
          className={`
            max-w-[72%] relative group cursor-pointer select-none
            ${isDeleted ? "opacity-50 italic" : ""}
            ${isSticker ? "bg-transparent border-0 p-0" : isMe
              ? "px-4 py-2.5 bg-white text-black rounded-2xl rounded-tr-sm shadow-lg"
              : "px-4 py-2.5 bg-white/10 text-white rounded-2xl rounded-tl-sm border border-white/5 shadow-lg backdrop-blur-md"
            }
          `}
        >
          {isDeleted ? (
            <span className="text-sm text-neutral-500">🚫 Message deleted</span>
          ) : isImage || isSticker ? (
            <img
              src={msg.content}
              alt="media"
              className="rounded-2xl max-w-[240px] max-h-64 object-contain"
              draggable={false}
            />
          ) : (
            <p className="text-[15px] leading-relaxed whitespace-pre-wrap break-words">{msg.content}</p>
          )}
        </div>

        {/* Swipe reply button (right side for own messages) */}
        {isMe && (
          <button
            onClick={() => onSwipeReply(msg)}
            className="opacity-0 group-hover:opacity-100 p-1 text-neutral-600 hover:text-white transition-all"
            title="Reply"
          >
            ↩
          </button>
        )}
      </div>

      {/* Timestamp + read receipt */}
      <div className={`flex items-center gap-1 text-[10px] text-neutral-500 px-1 ${isMe ? "flex-row-reverse" : ""}`}>
        <Clock className="w-2.5 h-2.5" />
        <span>{formatTime(msg.createdAt)}</span>
        <ReadReceipt msg={msg} isMe={isMe} />
      </div>
    </motion.div>
  );
}

// ── Typing Indicator ──────────────────────────────────────────────────────────
export function TypingIndicator() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 6 }}
      className="flex items-start"
    >
      <div className="px-4 py-3 bg-white/10 border border-white/5 rounded-2xl rounded-tl-sm backdrop-blur-md flex items-center gap-1.5">
        {[0, 1, 2].map(i => (
          <motion.span
            key={i}
            className="w-1.5 h-1.5 rounded-full bg-neutral-400"
            animate={{ y: [0, -4, 0] }}
            transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15, ease: "easeInOut" }}
          />
        ))}
      </div>
    </motion.div>
  );
}

// ── Context Menu ──────────────────────────────────────────────────────────────
interface ContextMenuProps {
  msg: ChatMessage;
  isMe: boolean;
  onReply: () => void;
  onDelete: (forEveryone: boolean) => void;
  onClose: () => void;
}

export function MessageContextMenu({ msg, isMe, onReply, onDelete, onClose }: ContextMenuProps) {
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          className="bg-neutral-900 border border-white/10 rounded-2xl overflow-hidden shadow-2xl min-w-[220px]"
          onClick={e => e.stopPropagation()}
        >
          <div className="px-4 py-3 border-b border-white/5 text-xs text-neutral-500 truncate max-w-[220px]">
            {msg.content.slice(0, 50)}{msg.content.length > 50 ? "…" : ""}
          </div>
          <button
            className="w-full px-4 py-3.5 text-sm text-white hover:bg-white/5 text-left flex items-center gap-3 transition-colors"
            onClick={() => { onReply(); onClose(); }}
          >
            ↩ Reply
          </button>
          {isMe && (
            <button
              className="w-full px-4 py-3.5 text-sm text-red-400 hover:bg-red-500/10 text-left flex items-center gap-3 transition-colors"
              onClick={() => { onDelete(true); onClose(); }}
            >
              🗑 Unsend for Everyone
            </button>
          )}
          <button
            className="w-full px-4 py-3.5 text-sm text-red-300 hover:bg-red-500/10 text-left flex items-center gap-3 transition-colors border-t border-white/5"
            onClick={() => { onDelete(false); onClose(); }}
          >
            🗑 Delete for Me
          </button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
