"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Plus, MessageSquare, Copy, ArrowRight, LogOut, Settings, Lock } from "lucide-react";
import { useUser, useClerk } from "@clerk/nextjs";
import Link from "next/link";

interface ActiveRoom {
  id: string;
  locked: boolean;
  participantCount: number;
  createdAt: string;
  inviteLink: string | null;
}

export default function Dashboard() {
  const { user } = useUser();
  const clerk = useClerk();
  const [isCreatingRoom, setIsCreatingRoom] = useState(false);
  const [inviteLink, setInviteLink] = useState("");
  const [createdRoomId, setCreatedRoomId] = useState("");
  const [activeRooms, setActiveRooms] = useState<ActiveRoom[]>([]);

  useEffect(() => {
    if (!user) return;
    fetch(`http://localhost:3001/api/rooms/${user.id}`)
      .then(res => res.json())
      .then(data => {
        if (data.rooms) {
          setActiveRooms(data.rooms);
        }
      })
      .catch(err => console.error("Failed to fetch rooms", err));
  }, [user]);

  const handleCreateRoom = async () => {
    if (!user) return;
    setIsCreatingRoom(true);
    try {
      const res = await fetch("http://localhost:3001/api/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id }),
      });
      const data = await res.json();
      if (data.inviteLink && data.room) {
        setInviteLink(data.inviteLink);
        setCreatedRoomId(data.room.id);
        
        // Optimistically add the new room
        setActiveRooms(prev => [{
          id: data.room.id,
          locked: false,
          participantCount: 1,
          createdAt: new Date().toISOString(),
          inviteLink: data.inviteLink
        }, ...prev]);
      }
    } catch (error) {
      console.error("Failed to create room", error);
    } finally {
      setIsCreatingRoom(false);
    }
  };

  const copyInviteLink = (linkToCopy: string) => {
    navigator.clipboard.writeText(linkToCopy);
    alert("Invite link copied! Share it securely.");
  };

  return (
    <div className="min-h-screen bg-black text-white p-6 md:p-12">
      {/* Header */}
      <header className="flex items-center justify-between max-w-5xl mx-auto mb-16">
        <div className="flex items-center gap-4">
          {user?.imageUrl && (
            <img src={user.imageUrl} alt="Profile" className="w-12 h-12 rounded-full border border-white/10" />
          )}
          <div>
            <h1 className="text-xl font-semibold">Welcome back, {user?.firstName || 'User'}</h1>
            <p className="text-sm text-neutral-400">Your secure private space</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <button className="p-2 bg-white/5 rounded-full hover:bg-white/10 transition-colors">
            <Settings className="w-5 h-5 text-neutral-400" />
          </button>
          <button onClick={() => clerk.signOut()} className="p-2 bg-white/5 rounded-full hover:bg-white/10 transition-colors text-red-400">
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
        
        {/* Actions Column */}
        <div className="md:col-span-1 flex flex-col gap-4">
          <motion.div 
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="p-6 bg-gradient-to-br from-indigo-900/40 to-purple-900/20 border border-white/10 rounded-3xl cursor-pointer shadow-lg backdrop-blur-md"
            onClick={handleCreateRoom}
          >
            <div className="w-12 h-12 bg-white text-black rounded-full flex items-center justify-center mb-4">
              <Plus className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-semibold mb-2">New Private Room</h2>
            <p className="text-sm text-neutral-400">Generate an encrypted invite link for one person.</p>
          </motion.div>

          {inviteLink && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-6 bg-white/5 border border-white/10 rounded-3xl backdrop-blur-md"
            >
              <h3 className="text-sm font-medium mb-3">Your Invite Link</h3>
              <div className="flex items-center gap-2 bg-black p-3 rounded-xl border border-white/5">
                <input 
                  type="text" 
                  readOnly 
                  value={inviteLink} 
                  className="bg-transparent outline-none flex-1 text-xs text-neutral-300"
                />
                <button onClick={() => copyInviteLink(inviteLink)} className="p-1.5 bg-white/10 rounded-md hover:bg-white/20 transition-colors">
                  <Copy className="w-4 h-4" />
                </button>
              </div>
              <p className="text-xs text-neutral-500 mt-3 flex items-center gap-1">
                Expires in 30 minutes
              </p>
              <Link href={`/room/${createdRoomId}`} className="mt-4 w-full flex justify-center items-center gap-2 py-3 bg-white text-black rounded-xl text-sm font-medium hover:bg-neutral-200 transition-colors">
                Enter Waiting Lobby
                <ArrowRight className="w-4 h-4" />
              </Link>
            </motion.div>
          )}
        </div>

        {/* Active Rooms Column */}
        <div className="md:col-span-2">
          <h2 className="text-2xl font-semibold mb-6 flex items-center gap-2">
            <MessageSquare className="w-6 h-6" />
            Active Rooms
          </h2>

          <div className="flex flex-col gap-4">
            {activeRooms.length === 0 ? (
              /* Empty State */
              <div className="p-12 border border-dashed border-white/10 rounded-3xl flex flex-col items-center justify-center text-center bg-white/[0.02]">
                <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mb-4">
                  <MessageSquare className="w-6 h-6 text-neutral-500" />
                </div>
                <h3 className="text-lg font-medium text-neutral-300 mb-2">No Active Rooms</h3>
                <p className="text-sm text-neutral-500 max-w-sm">
                  Create a new private room and invite someone to start securely chatting.
                </p>
              </div>
            ) : (
              activeRooms.map(room => (
                <motion.div 
                  key={room.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-6 bg-neutral-900/40 border border-white/5 rounded-3xl backdrop-blur-md flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div>
                    <h3 className="font-medium text-white flex items-center gap-2">
                      Room {room.id.slice(0, 6)}...
                      {room.locked && <Lock className="w-3.5 h-3.5 text-red-400" />}
                    </h3>
                    <p className="text-xs text-neutral-400 mt-1">
                      {room.participantCount} / 2 Participants • {new Date(room.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {room.inviteLink && !room.locked && (
                      <button 
                        onClick={() => copyInviteLink(room.inviteLink!)} 
                        className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-sm font-medium hover:bg-white/10 transition-colors flex items-center gap-2"
                      >
                        <Copy className="w-4 h-4" /> Copy Link
                      </button>
                    )}
                    <Link 
                      href={`/room/${room.id}`}
                      className="px-4 py-2 bg-white text-black rounded-xl text-sm font-medium hover:bg-neutral-200 transition-colors flex items-center gap-2"
                    >
                      Enter <ArrowRight className="w-4 h-4" />
                    </Link>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </div>

      </main>
    </div>
  );
}
