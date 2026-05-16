"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, MessageSquare, Copy, ArrowRight, LogOut, Settings, Lock, Trash2, Timer, Shield } from "lucide-react";
import { useUser, useClerk } from "@clerk/nextjs";
import Link from "next/link";

interface ActiveRoom {
  id: string;
  locked: boolean;
  participantCount: number;
  createdAt: string;
  expiresAt?: string | null;
  inviteLink: string | null;
}

function timeUntil(iso: string) {
  const diff = new Date(iso).getTime() - Date.now();
  if (diff <= 0) return "Expired";
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

export default function Dashboard() {
  const { user } = useUser();
  const clerk = useClerk();
  const [isCreating, setIsCreating] = useState(false);
  const [inviteLink, setInviteLink] = useState("");
  const [createdRoomId, setCreatedRoomId] = useState("");
  const [activeRooms, setActiveRooms] = useState<ActiveRoom[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001";

  const fetchRooms = () => {
    if (!user) return;
    fetch(`${backendUrl}/api/rooms/${user.id}`)
      .then(r => r.json())
      .then(d => { if (d.rooms) setActiveRooms(d.rooms); })
      .catch(console.error);
  };

  useEffect(() => { fetchRooms(); }, [user]);

  const handleCreateRoom = async () => {
    if (!user) return;
    setIsCreating(true);
    try {
      const res = await fetch(`${backendUrl}/api/rooms`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id }),
      });
      const data = await res.json();
      if (data.inviteLink && data.room) {
        setInviteLink(data.inviteLink);
        setCreatedRoomId(data.room.id);
        setActiveRooms(prev => [{
          id: data.room.id,
          locked: false,
          participantCount: 1,
          createdAt: new Date().toISOString(),
          expiresAt: data.room.expiresAt,
          inviteLink: data.inviteLink,
        }, ...prev]);
      }
    } catch (e) { console.error(e); }
    finally { setIsCreating(false); }
  };

  const copyLink = (link: string, id: string) => {
    navigator.clipboard.writeText(link);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDeleteRoom = async (roomId: string) => {
    if (!confirm("Delete this room? All messages and media will be permanently deleted.")) return;
    setDeletingId(roomId);
    try {
      await fetch(`${backendUrl}/api/rooms/${roomId}`, { method: "DELETE" });
      setActiveRooms(prev => prev.filter(r => r.id !== roomId));
    } catch (e) { console.error(e); }
    finally { setDeletingId(null); }
  };

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute -top-1/4 -left-1/4 w-1/2 h-1/2 rounded-full bg-indigo-900/15 blur-[120px]" />
        <div className="absolute top-1/4 -right-1/4 w-1/2 h-1/2 rounded-full bg-purple-900/15 blur-[120px]" />
      </div>

      <div className="relative z-10 max-w-5xl mx-auto px-6 py-8">
        {/* Header */}
        <header className="flex items-center justify-between mb-12">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-semibold">Welcome back, {user?.firstName || "User"}</h1>
              <p className="text-xs text-neutral-400">Your encrypted private space</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button className="p-2 bg-white/5 rounded-full hover:bg-white/10 transition-colors">
              <Settings className="w-4 h-4 text-neutral-400" />
            </button>
            <button onClick={() => clerk.signOut()} className="p-2 bg-white/5 rounded-full hover:bg-white/10 transition-colors text-red-400">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

          {/* Create Room */}
          <div className="md:col-span-1 flex flex-col gap-4">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleCreateRoom}
              disabled={isCreating}
              className="p-6 bg-gradient-to-br from-indigo-900/50 to-purple-900/30 border border-white/10 rounded-3xl cursor-pointer shadow-lg backdrop-blur-md text-left disabled:opacity-50"
            >
              <div className="w-11 h-11 bg-white text-black rounded-full flex items-center justify-center mb-4">
                {isCreating ? <span className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" /> : <Plus className="w-5 h-5" />}
              </div>
              <h2 className="text-lg font-semibold mb-1">New Private Room</h2>
              <p className="text-xs text-neutral-400">Encrypted • 4-hour invite • 24h expiry</p>
            </motion.button>

            <AnimatePresence>
              {inviteLink && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 8 }}
                  className="p-5 bg-white/5 border border-white/10 rounded-3xl backdrop-blur-md"
                >
                  <h3 className="text-xs font-semibold text-neutral-300 mb-3">Your Invite Link</h3>
                  <div className="flex items-center gap-2 bg-black/50 p-2.5 rounded-xl border border-white/5">
                    <input readOnly value={inviteLink} className="bg-transparent outline-none flex-1 text-[11px] text-neutral-400 min-w-0" />
                    <button onClick={() => copyLink(inviteLink, "new")} className="p-1.5 bg-white/10 rounded-lg hover:bg-white/20 transition-colors shrink-0">
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <p className="text-[10px] text-amber-400 mt-2 flex items-center gap-1">
                    <Timer className="w-3 h-3" /> Expires in 4 hours
                  </p>
                  <Link href={`/room/${createdRoomId}`} className="mt-3 w-full flex justify-center items-center gap-2 py-2.5 bg-white text-black rounded-xl text-sm font-medium hover:bg-neutral-200 transition-colors">
                    Enter Room <ArrowRight className="w-4 h-4" />
                  </Link>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Active Rooms */}
          <div className="md:col-span-2">
            <h2 className="text-xl font-semibold mb-5 flex items-center gap-2">
              <MessageSquare className="w-5 h-5" /> Active Rooms
            </h2>

            <div className="flex flex-col gap-3">
              {activeRooms.length === 0 ? (
                <div className="p-12 border border-dashed border-white/10 rounded-3xl flex flex-col items-center justify-center text-center bg-white/[0.02]">
                  <div className="w-14 h-14 bg-white/5 rounded-full flex items-center justify-center mb-3">
                    <MessageSquare className="w-6 h-6 text-neutral-600" />
                  </div>
                  <h3 className="text-base font-medium text-neutral-300 mb-1">No Active Rooms</h3>
                  <p className="text-sm text-neutral-600 max-w-xs">Create a private room and invite someone to start chatting securely.</p>
                </div>
              ) : (
                <AnimatePresence>
                  {activeRooms.map(room => (
                    <motion.div
                      key={room.id}
                      layout
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.96 }}
                      className="p-5 bg-neutral-900/50 border border-white/5 rounded-2xl backdrop-blur-md"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-medium text-sm">Room {room.id.slice(0, 8)}</h3>
                            {room.locked && <Lock className="w-3 h-3 text-red-400 shrink-0" />}
                            <span className={`text-[10px] px-2 py-0.5 rounded-full ${room.participantCount >= 2 ? "bg-green-500/15 text-green-400" : "bg-amber-500/15 text-amber-400"}`}>
                              {room.participantCount}/2
                            </span>
                          </div>
                          <div className="flex items-center gap-3 text-[11px] text-neutral-500">
                            <span>{new Date(room.createdAt).toLocaleDateString()}</span>
                            {room.expiresAt && (
                              <span className="flex items-center gap-1 text-amber-500">
                                <Timer className="w-3 h-3" /> {timeUntil(room.expiresAt)}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {/* Always show copy link if available */}
                          {room.inviteLink && (
                            <button
                              onClick={() => copyLink(room.inviteLink!, room.id)}
                              className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-xs font-medium hover:bg-white/10 transition-colors flex items-center gap-1.5"
                            >
                              <Copy className="w-3.5 h-3.5" />
                              {copiedId === room.id ? "Copied!" : "Copy Link"}
                            </button>
                          )}
                          <button
                            onClick={() => handleDeleteRoom(room.id)}
                            disabled={deletingId === room.id}
                            className="p-1.5 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors disabled:opacity-50"
                            title="Delete Room"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                          <Link
                            href={`/room/${room.id}`}
                            className="px-3 py-1.5 bg-white text-black rounded-lg text-xs font-medium hover:bg-neutral-200 transition-colors flex items-center gap-1.5"
                          >
                            Enter <ArrowRight className="w-3.5 h-3.5" />
                          </Link>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
