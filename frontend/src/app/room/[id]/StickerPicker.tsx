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
      className="absolute bottom-20 left-4 z-50 w-80 bg-neutral-900/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden"
    >
      {/* Tabs */}
      <div className="flex border-b border-white/10">
        <button
          onClick={() => setTab("dudububu")}
          className={`flex-1 py-3 text-sm font-medium transition-colors ${
            tab === "dudububu"
              ? "text-white bg-white/10 border-b-2 border-indigo-500"
              : "text-neutral-400 hover:text-white"
          }`}
        >
          🐻 Dudu Bubu
        </button>
        <button
          onClick={() => setTab("adulty")}
          className={`flex-1 py-3 text-sm font-medium transition-colors ${
            tab === "adulty"
              ? "text-white bg-white/10 border-b-2 border-pink-500"
              : "text-neutral-400 hover:text-white"
          }`}
        >
          🔥 Adulty
        </button>
      </div>

      {/* Grid */}
      <div className="h-64 overflow-y-auto p-2 grid grid-cols-3 gap-2">
        {list.length === 0 ? (
          <div className="col-span-3 flex flex-col items-center justify-center text-center text-sm text-neutral-500 h-full gap-2">
            <span className="text-2xl">📭</span>
            No stickers yet. Run the upload script!
          </div>
        ) : (
          list.map((url, i) => (
            <button
              key={i}
              onClick={() => onSelect(url)}
              className="aspect-square rounded-xl overflow-hidden hover:scale-105 transition-transform bg-white/5 border border-white/5"
            >
              <img
                src={url}
                alt="sticker"
                className="w-full h-full object-cover"
                loading="lazy"
              />
            </button>
          ))
        )}
      </div>
    </motion.div>
  );
}
