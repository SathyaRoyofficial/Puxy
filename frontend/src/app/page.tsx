"use client";

import { motion } from "framer-motion";
import { Lock, MessageCircle, Shield, ArrowRight } from "lucide-react";
import Link from "next/link";
import { useAuth, useClerk } from "@clerk/nextjs";

export default function Home() {
  const { isLoaded, userId } = useAuth();
  const clerk = useClerk();

  return (
    <div className="relative min-h-screen bg-black overflow-hidden selection:bg-white/20">
      {/* Background Gradients */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-[25%] -left-[10%] w-[50%] h-[50%] rounded-full bg-indigo-900/20 blur-[120px] mix-blend-screen" />
        <div className="absolute top-[20%] -right-[10%] w-[40%] h-[40%] rounded-full bg-purple-900/20 blur-[120px] mix-blend-screen" />
        <div className="absolute -bottom-[20%] left-[20%] w-[60%] h-[60%] rounded-full bg-black blur-[120px]" />
      </div>

      {/* Floating Particles Simulation */}
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-100 contrast-150 mix-blend-overlay pointer-events-none"></div>

      {/* Navigation */}
      <nav className="relative z-10 flex items-center justify-between px-6 py-6 max-w-7xl mx-auto">
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2"
        >
          <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center">
            <Lock className="w-4 h-4 text-black" />
          </div>
          <span className="text-xl font-bold tracking-tight text-white">Puxy</span>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="flex items-center gap-4"
        >
          {isLoaded && !userId && (
            <>
              <button onClick={() => clerk.openSignIn()} className="px-5 py-2.5 text-sm font-medium text-white/80 hover:text-white transition-colors">
                Sign In
              </button>
              <button onClick={() => clerk.openSignUp()} className="px-5 py-2.5 text-sm font-medium bg-white text-black rounded-full hover:bg-neutral-200 transition-colors">
                Get Started
              </button>
            </>
          )}
          {isLoaded && userId && (
            <Link href="/dashboard" className="px-5 py-2.5 text-sm font-medium bg-white text-black rounded-full hover:bg-neutral-200 transition-colors">
              Go to Rooms
            </Link>
          )}
        </motion.div>
      </nav>

      {/* Hero Section */}
      <main className="relative z-10 flex flex-col items-center justify-center min-h-[80vh] px-6 max-w-5xl mx-auto text-center mt-10">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, filter: "blur(10px)" }}
          animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-medium text-white/80 mb-8 backdrop-blur-md"
        >
          <Shield className="w-3.5 h-3.5" />
          <span>End-to-End Encrypted</span>
        </motion.div>

        <motion.h1 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="text-5xl md:text-7xl font-bold tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-white to-white/50 mb-6 leading-tight"
        >
          Your Private Space.<br />Only For Two.
        </motion.h1>

        <motion.p 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="text-lg md:text-xl text-neutral-400 max-w-2xl mb-12"
        >
          A luxury communication space designed for ultimate privacy. 
          Invite, connect, and let it disappear. No traces. No third parties.
        </motion.p>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.6 }}
          className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto"
        >
          {isLoaded && userId && (
            <Link 
              href="/dashboard"
              className="flex items-center justify-center gap-2 w-full sm:w-auto px-8 py-4 bg-white text-black rounded-full font-medium hover:scale-105 transition-transform"
            >
              <MessageCircle className="w-5 h-5" />
              Create Private Room
            </Link>
          )}
          {isLoaded && !userId && (
            <button onClick={() => clerk.openSignIn()} className="flex items-center justify-center gap-2 w-full sm:w-auto px-8 py-4 bg-white text-black rounded-full font-medium hover:scale-105 transition-transform">
              <MessageCircle className="w-5 h-5" />
              Start Chatting
            </button>
          )}
          <button className="flex items-center justify-center gap-2 w-full sm:w-auto px-8 py-4 bg-white/5 border border-white/10 text-white rounded-full font-medium hover:bg-white/10 backdrop-blur-md transition-all">
            Join With Invite
            <ArrowRight className="w-4 h-4" />
          </button>
        </motion.div>
      </main>

      {/* Decorative Chat Preview */}
      <motion.div 
        initial={{ opacity: 0, y: 100 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1, delay: 0.8, type: "spring", stiffness: 50 }}
        className="absolute bottom-0 left-1/2 -translate-x-1/2 w-full max-w-3xl px-6"
      >
        <div className="h-[30vh] md:h-[40vh] bg-neutral-900/50 border border-white/10 rounded-t-3xl backdrop-blur-xl relative overflow-hidden shadow-[0_-20px_50px_-20px_rgba(255,255,255,0.05)]">
          <div className="absolute top-4 left-1/2 -translate-x-1/2 w-12 h-1.5 bg-white/20 rounded-full" />
          <div className="p-8 pt-12 flex flex-col gap-4">
            <div className="self-end px-5 py-3 bg-white text-black rounded-2xl rounded-tr-sm max-w-[80%] text-sm font-medium shadow-lg">
              Are you sure no one else can see this?
            </div>
            <div className="self-start px-5 py-3 bg-white/10 text-white rounded-2xl rounded-tl-sm max-w-[80%] text-sm border border-white/5 shadow-lg backdrop-blur-md">
              Positive. The room is locked to just us two. 🔒
            </div>
          </div>
          {/* Gradient fade at bottom */}
          <div className="absolute bottom-0 left-0 w-full h-32 bg-gradient-to-t from-black to-transparent pointer-events-none" />
        </div>
      </motion.div>
    </div>
  );
}
