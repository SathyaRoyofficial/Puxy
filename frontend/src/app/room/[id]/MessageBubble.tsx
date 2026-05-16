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
  if (msg.readAt) return <CheckCheck className="w-3.5 h-3.5 text-blue-400 shrink-0" />;
  if (msg.deliveredAt) return <CheckCheck className="w-3.5 h-3.5 text-neutral-400 shrink-0" />;
  return <Check className="w-3.5 h-3.5 text-neutral-500 shrink-0" />;
}

export function MessageBubble({ msg, isMe, onLongPress, onSwipeReply }: MessageBubbleProps) {
  const isDeleted = !!msg.deletedForEveryone;
  const isMedia = !isDeleted && (
    msg.type === "STICKER" || msg.type === "GIF" || msg.type === "IMAGE" ||
    (msg.content.startsWith("http") && msg.content.includes("cloudinary.com"))
  );

  let pressTimer: ReturnType<typeof setTimeout>;

  const handlePointerDown = () => {
    pressTimer = setTimeout(() => onLongPress(msg), 550);
  };
  const handlePointerUp = () => clearTimeout(pressTimer);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ type: "spring", stiffness: 380, damping: 28 }}
      // isMe = RIGHT side, partner = LEFT side
      className={`flex flex-col gap-0.5 group ${isMe ? "items-end" : "items-start"}`}
    >
      {/* Reply quote above bubble */}
      {msg.replyTo && !isDeleted && (
        <div
          className={`max-w-[68%] px-3 py-1.5 rounded-xl text-xs border-l-2 border-indigo-400 bg-white/5 text-neutral-400 truncate ${isMe ? "mr-1" : "ml-1"}`}
        >
          ↩ {msg.replyTo.content.length > 55 ? msg.replyTo.content.slice(0, 55) + "…" : msg.replyTo.content}
        </div>
      )}

      <div className={`flex items-end gap-1.5 ${isMe ? "flex-row-reverse" : "flex-row"}`}>
        {/* Swipe-to-reply button */}
        <button
          onClick={() => !isDeleted && onSwipeReply(msg)}
          className="opacity-0 group-hover:opacity-100 p-1 text-neutral-500 hover:text-white transition-all text-base leading-none"
          title="Reply"
        >
          ↩
        </button>

        {/* Bubble */}
        <div
          className={`
            max-w-[72%] relative cursor-pointer select-none
            ${isDeleted
              ? (isMe
                ? "px-4 py-2.5 bg-white/5 text-neutral-500 rounded-2xl rounded-tr-sm italic text-sm border border-white/5"
                : "px-4 py-2.5 bg-white/5 text-neutral-500 rounded-2xl rounded-tl-sm italic text-sm border border-white/5")
              : isMedia
                ? ""
                : isMe
                  ? "px-4 py-2.5 bg-white text-black rounded-2xl rounded-tr-sm shadow-md"
                  : "px-4 py-2.5 bg-white/12 text-white rounded-2xl rounded-tl-sm border border-white/8 shadow-md backdrop-blur-sm"
            }
          `}
          onPointerDown={handlePointerDown}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
        >
          {isDeleted ? (
            <span>🚫 Message deleted</span>
          ) : isMedia ? (
            <img
              src={msg.content}
              alt="media"
              className="rounded-2xl max-w-[220px] max-h-56 object-contain"
              draggable={false}
            />
          ) : (
            <p className="text-[15px] leading-relaxed whitespace-pre-wrap break-words">{msg.content}</p>
          )}
        </div>
      </div>

      {/* Timestamp + read receipt */}
      <div className={`flex items-center gap-1 text-[10px] text-neutral-500 px-1 ${isMe ? "flex-row-reverse" : "flex-row"}`}>
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
      <div className="px-4 py-3 bg-white/10 border border-white/8 rounded-2xl rounded-tl-sm backdrop-blur-md flex items-center gap-1.5">
        {[0, 1, 2].map(i => (
          <motion.span
            key={i}
            className="w-1.5 h-1.5 rounded-full bg-neutral-400"
            animate={{ y: [0, -5, 0] }}
            transition={{ duration: 0.55, repeat: Infinity, delay: i * 0.14, ease: "easeInOut" }}
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
  onDelete: () => void;
  onClose: () => void;
}

export function MessageContextMenu({ msg, onReply, onDelete, onClose }: ContextMenuProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.93, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.93 }}
        className="bg-neutral-900 border border-white/10 rounded-2xl overflow-hidden shadow-2xl min-w-[230px]"
        onClick={e => e.stopPropagation()}
      >
        {/* Message preview */}
        <div className="px-4 py-3 border-b border-white/5 text-[11px] text-neutral-500 truncate">
          {msg.content.slice(0, 60)}{msg.content.length > 60 ? "…" : ""}
        </div>

        {/* Reply */}
        <button
          className="w-full px-4 py-3.5 text-sm text-white hover:bg-white/5 text-left flex items-center gap-3 transition-colors"
          onClick={() => { onReply(); onClose(); }}
        >
          <span className="text-base">↩</span> Reply
        </button>

        {/* Delete for Everyone — available to anyone */}
        <button
          className="w-full px-4 py-3.5 text-sm text-red-400 hover:bg-red-500/10 text-left flex items-center gap-3 transition-colors border-t border-white/5"
          onClick={() => { onDelete(); onClose(); }}
        >
          <span className="text-base">🗑</span> Delete for Everyone
        </button>
      </motion.div>
    </motion.div>
  );
}
