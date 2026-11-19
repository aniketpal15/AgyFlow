import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RefreshCw, ShieldCheck, Zap } from 'lucide-react';

export default function SyncOverlay({ isSyncing }) {
  return (
    <AnimatePresence>
      {isSyncing && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 bg-[#090A0F]/75 backdrop-blur-md flex flex-col items-center justify-center select-none"
        >
          {/* Card Modal with Neon Glow */}
          <motion.div
            initial={{ scale: 0.92, opacity: 0, y: 10 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.92, opacity: 0, y: 10 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="w-full max-w-sm rounded-3xl bg-[#10141F]/90 border border-white/10 shadow-2xl p-6 relative flex flex-col items-center text-center specular-top"
          >
            {/* Spinning Dual Glowing Rings */}
            <div className="relative w-20 h-20 flex items-center justify-center mb-4">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 1.5, ease: 'linear' }}
                className="w-18 h-18 rounded-full border-2 border-transparent border-t-cyan border-r-cyan/60 shadow-cyan-glow"
              />
              <motion.div
                animate={{ rotate: -360 }}
                transition={{ repeat: Infinity, duration: 2, ease: 'linear' }}
                className="absolute w-12 h-12 rounded-full border border-amber/40 border-b-amber shadow-amber/30"
              />
              <div className="absolute w-7 h-7 rounded-full bg-[#121622] border border-cyan/40 flex items-center justify-center">
                <Zap className="w-3.5 h-3.5 text-cyan animate-pulse" />
              </div>
            </div>

            {/* Status Badges */}
            <h3 className="text-sm font-bold text-white tracking-tight mb-1 flex items-center gap-1.5 justify-center">
              <span>Refreshing Token Pools</span>
              <span className="w-1.5 h-1.5 rounded-full bg-cyan animate-ping" />
            </h3>
            <p className="text-xs text-slate-400 mb-4 max-w-[260px]">
              Querying live Google Cloud Code quota limits and syncing Windows Keystore...
            </p>

            <div className="w-full py-2 px-3 rounded-xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-between text-[11px] font-mono text-slate-400">
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                Windows Keystore
              </span>
              <span className="text-cyan animate-pulse">Syncing...</span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

