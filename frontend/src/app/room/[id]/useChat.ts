"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useUser } from "@clerk/nextjs";
import { io, Socket } from "socket.io-client";

export interface ReplyTo {
  id: string;
  content: string;
  senderId: string;
}

export interface ChatMessage {
  id: string;
  content: string;
  type: string;
  senderId: string;
  senderName?: string;
  createdAt: string;
  deliveredAt?: string | null;
  readAt?: string | null;
  deletedAt?: string | null;
  deletedForEveryone?: boolean;
  expiresAt?: string | null;
  replyTo?: ReplyTo | null;
  // client-only
  pending?: boolean;
}

interface UseChatOptions {
  roomId: string;
  disappearSeconds?: number;
}

export function useChat({ roomId, disappearSeconds }: UseChatOptions) {
  const { user, isLoaded } = useUser();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [activeUserId, setActiveUserId] = useState<string | null>(null);
  const [participantCount, setParticipantCount] = useState(1);
  const [isPartnerTyping, setIsPartnerTyping] = useState(false);
  const [isPartnerOnline, setIsPartnerOnline] = useState(false);
  const [partnerLastSeen, setPartnerLastSeen] = useState<Date | null>(null);
  const [roomExpiresAt, setRoomExpiresAt] = useState<string | null>(null);
  const typingTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Resolve user id (Clerk or guest)
  useEffect(() => {
    if (!isLoaded) return;
    if (user?.id) {
      setActiveUserId(user.id);
    } else {
      let guestId = localStorage.getItem("puxy_guest_id");
      if (!guestId) {
        guestId = `guest_${Math.random().toString(36).substring(2, 11)}`;
        localStorage.setItem("puxy_guest_id", guestId);
      }
      setActiveUserId(guestId);
    }
  }, [user, isLoaded]);

  // Socket connection
  useEffect(() => {
    if (!activeUserId || !roomId) return;
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001";
    const newSocket = io(backendUrl);
    setSocket(newSocket);

    newSocket.on("connect", () => {
      newSocket.emit("joinRoom", { roomId, userId: activeUserId });
    });

    newSocket.on("roomData", (data: { participantCount: number; expiresAt?: string }) => {
      setParticipantCount(data.participantCount);
      if (data.expiresAt) setRoomExpiresAt(data.expiresAt);
    });

    newSocket.on("previousMessages", (msgs: ChatMessage[]) => {
      setMessages(msgs);
    });

    newSocket.on("newMessage", (msg: ChatMessage) => {
      setMessages(prev => {
        const exists = prev.find(m => m.id === msg.id);
        if (exists) return prev;
        return [...prev, msg];
      });
      // Mark as read immediately if we're in the chat
      newSocket.emit("markRead", { roomId, userId: activeUserId });
    });

    newSocket.on("messageDeleted", ({ messageId, forEveryone }: { messageId: string; forEveryone: boolean }) => {
      setMessages(prev => prev.map(m => {
        if (m.id !== messageId) return m;
        if (forEveryone) return { ...m, deletedAt: new Date().toISOString(), deletedForEveryone: true, content: "[deleted]" };
        return m;
      }));
    });

    newSocket.on("messagesRead", () => {
      setMessages(prev => prev.map(m =>
        m.senderId === activeUserId && !m.readAt
          ? { ...m, readAt: new Date().toISOString() }
          : m
      ));
    });

    newSocket.on("messagesDelivered", () => {
      setMessages(prev => prev.map(m =>
        m.senderId === activeUserId && !m.deliveredAt
          ? { ...m, deliveredAt: new Date().toISOString() }
          : m
      ));
    });

    newSocket.on("typing", () => {
      setIsPartnerTyping(true);
      if (typingTimeout.current) clearTimeout(typingTimeout.current);
      typingTimeout.current = setTimeout(() => setIsPartnerTyping(false), 3000);
    });

    newSocket.on("stopTyping", () => {
      setIsPartnerTyping(false);
      if (typingTimeout.current) clearTimeout(typingTimeout.current);
    });

    newSocket.on("userOnline", () => {
      setIsPartnerOnline(true);
      setPartnerLastSeen(null);
    });

    newSocket.on("userOffline", ({ lastSeen }: { lastSeen: string }) => {
      setIsPartnerOnline(false);
      setPartnerLastSeen(new Date(lastSeen));
    });

    newSocket.on("roomDeleted", () => {
      window.location.href = "/dashboard";
    });

    // Mark read on join
    newSocket.emit("markRead", { roomId, userId: activeUserId });

    return () => { newSocket.close(); };
  }, [activeUserId, roomId]);

  const sendTyping = useCallback(() => {
    if (!socket || !activeUserId) return;
    socket.emit("typing", { roomId, userId: activeUserId });
  }, [socket, activeUserId, roomId]);

  const sendStopTyping = useCallback(() => {
    if (!socket || !activeUserId) return;
    socket.emit("stopTyping", { roomId, userId: activeUserId });
  }, [socket, activeUserId, roomId]);

  const sendMessage = useCallback((text: string, type = "TEXT", replyToId?: string, mediaPublicId?: string) => {
    if (!text.trim() || !activeUserId) return;
    socket?.emit("sendMessage", {
      roomId,
      userId: activeUserId,
      text,
      type,
      replyToId,
      mediaPublicId,
      expiresInSeconds: disappearSeconds,
    });
  }, [socket, activeUserId, roomId, disappearSeconds]);

  const deleteMessage = useCallback((messageId: string, forEveryone: boolean) => {
    socket?.emit("deleteMessage", { messageId, roomId, forEveryone });
  }, [socket, roomId]);

  return {
    messages,
    socket,
    activeUserId,
    participantCount,
    isPartnerTyping,
    isPartnerOnline,
    partnerLastSeen,
    roomExpiresAt,
    sendMessage,
    sendTyping,
    sendStopTyping,
    deleteMessage,
  };
}
