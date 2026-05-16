"use client";

import { useState } from "react";
import { motion } from "framer-motion";

interface Stickers {
  dudububu: string[];
  adulty: string[];
}

interface StickerPickerProps {
  stickers: Stickers;
  onSelect: (url: string) => void;
}

export function StickerPicker({ stickers, onSelect }: StickerPickerProps) {
  const [tab, setTab] = useState<"dudububu" | "adulty">("dudububu");
  const list = stickers[tab] || [];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      className="absolute bottom-20 left-4 z-50 w-80 bg-neutral-900/98 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden"
    >
      {/* Tabs */}
      <div className="flex border-b border-white/10">
        <button
          onClick={() => setTab("dudububu")}
          className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
            tab === "dudububu"
              ? "text-white bg-white/10 border-b-2 border-indigo-500"
              : "text-neutral-400 hover:text-white"
          }`}
        >
          🐻 Dudu Bubu
        </button>
        <button
          onClick={() => setTab("adulty")}
          className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
            tab === "adulty"
              ? "text-white bg-white/10 border-b-2 border-pink-500"
              : "text-neutral-400 hover:text-white"
          }`}
        >
          🔥 Adulty
        </button>
      </div>

      {/* Grid — 4 columns, fixed height per cell so each sticker is clearly visible */}
      <div className="h-60 overflow-y-auto p-2">
        {list.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center text-sm text-neutral-500 gap-2">
            <span className="text-2xl">📭</span>
            No stickers yet. Run the upload script!
          </div>
        ) : (
          <div className="grid grid-cols-4 gap-1.5">
            {list.map((url, i) => (
              <button
                key={i}
                onClick={() => onSelect(url)}
                className="relative w-full rounded-xl overflow-hidden bg-white/5 border border-white/5 hover:border-white/20 hover:scale-105 transition-all group"
                style={{ height: "68px" }}
              >
                <img
                  src={url}
                  alt="sticker"
                  className="absolute inset-0 w-full h-full object-contain p-1"
                  loading="lazy"
                />
              </button>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}
