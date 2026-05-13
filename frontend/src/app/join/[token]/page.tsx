"use client";

import { useEffect, useState } from "react";
import { useUser, useClerk } from "@clerk/nextjs";
import { useRouter, useParams } from "next/navigation";
import { Loader2 } from "lucide-react";

export default function JoinRoom() {
  const { user, isLoaded } = useUser();
  const router = useRouter();
  const params = useParams();
  const [error, setError] = useState("");

  const clerk = useClerk();

  useEffect(() => {
    if (!isLoaded || !params?.token) return;

    const joinRoom = async () => {
      try {
        let activeUserId = user?.id;

        // If not logged in, create a guest identity
        if (!activeUserId) {
          let guestId = localStorage.getItem("puxy_guest_id");
          if (!guestId) {
            guestId = `guest_${Math.random().toString(36).substring(2, 11)}`;
            localStorage.setItem("puxy_guest_id", guestId);
          }
          activeUserId = guestId;
        }

        const res = await fetch(`http://localhost:3001/api/join/${params.token}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: activeUserId }),
        });
        const data = await res.json();
        
        if (data.roomId) {
          // If guest, we need to pass this guestId to the room page somehow.
          // Since the room page uses `useUser` which will return null for guests, 
          // we'll let the room page also read `puxy_guest_id` from localStorage.
          router.push(`/room/${data.roomId}`);
        } else {
          setError(data.error || "Failed to join room");
        }
      } catch (err) {
        setError("An error occurred while joining");
      }
    };

    joinRoom();
  }, [isLoaded, user, params?.token, router]);

  return (
    <div className="min-h-screen bg-black flex items-center justify-center text-white">
      {error ? (
        <div className="p-6 bg-red-900/20 border border-red-500/50 rounded-2xl text-center">
          <p className="text-red-400">{error}</p>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 text-white animate-spin" />
          <p className="text-neutral-400">Verifying secure invite...</p>
        </div>
      )}
    </div>
  );
}
