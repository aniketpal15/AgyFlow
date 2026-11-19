import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Layers } from 'lucide-react';

export default function SplashLoader({ isVisible }) {
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.5, ease: 'easeInOut' } }}
          className="fixed inset-0 z-50 bg-[#090A0F] flex flex-col items-center justify-center select-none"
        >
          {/* Ambient background glow */}
          <div className="absolute w-96 h-96 rounded-full bg-cyan/15 blur-[100px] pointer-events-none animate-pulse" />

          {/* Glowing Geometric Pulse Ring */}
          <div className="relative w-28 h-28 flex items-center justify-center mb-8">
            <motion.div 
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 8, ease: 'linear' }}
              className="absolute inset-0 rounded-3xl border border-cyan/30 shadow-cyan-glow"
            />
            <motion.div 
              animate={{ rotate: -360 }}
              transition={{ repeat: Infinity, duration: 6, ease: 'linear' }}
              className="absolute inset-2 rounded-2xl border border-amber/30 border-dashed"
            />
            <motion.div 
              animate={{ scale: [0.92, 1.08, 0.92] }}
              transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
              className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-[#121622] to-[#1a2030] border border-cyan/40 shadow-glass flex items-center justify-center relative z-10"
            >
              <Layers className="w-7 h-7 text-cyan drop-shadow-[0_0_8px_rgba(0,240,255,0.7)]" />
            </motion.div>
          </div>

          {/* Titles & Status */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-center"
          >
            <div className="flex items-center justify-center gap-2 mb-2">
              <h2 className="text-xl font-extrabold tracking-wider text-white">ANTIGRAVITY</h2>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-cyan/15 text-cyan border border-cyan/30">
                ID
              </span>
            </div>
            <p className="text-xs font-mono text-slate-400">
              Initializing Multi-Account Token Daemon...
            </p>

            {/* Glowing progress line */}
            <div className="w-48 h-1 rounded-full bg-white/[0.08] overflow-hidden mt-6 mx-auto">
              <motion.div 
                initial={{ x: '-100%' }}
                animate={{ x: '100%' }}
                transition={{ repeat: Infinity, duration: 1.2, ease: 'easeInOut' }}
                className="w-1/2 h-full bg-gradient-to-r from-transparent via-cyan to-transparent"
              />
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

