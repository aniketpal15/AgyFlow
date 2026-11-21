import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import loaderDark from '../assets/loader-dark.webp';
import loaderLight from '../assets/loader-light.webp';

// Fluid SVG metaball fallback (guaranteed zero broken images)
function FluidOrbFallback({ isLight }) {
  const c1 = isLight ? '#7C3AED' : '#00f0ff';
  const c2 = isLight ? '#A855F7' : '#6366f1';

  return (
    <div className="relative w-64 h-40 flex items-center justify-center">
      <motion.div
        animate={{
          x: [-45, 45, -45],
          scale: [1, 1.25, 0.85, 1],
        }}
        transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
        className="w-16 h-16 rounded-full absolute"
        style={{
          background: `radial-gradient(circle at 35% 35%, #ffffff 0%, ${c1} 65%, transparent 100%)`,
          boxShadow: `0 0 35px ${c1}`,
        }}
      />
      <motion.div
        animate={{
          x: [45, -45, 45],
          scale: [1, 0.85, 1.25, 1],
        }}
        transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
        className="w-14 h-14 rounded-full absolute"
        style={{
          background: `radial-gradient(circle at 35% 35%, #ffffff 0%, ${c2} 65%, transparent 100%)`,
          boxShadow: `0 0 28px ${c2}`,
        }}
      />
    </div>
  );
}

export default function SyncOverlay({ isSyncing, theme = 'dark' }) {
  const [imgError, setImgError] = useState(false);
  const isLight = theme === 'snow' || theme === 'latte';

  const loaderSrc = isLight ? loaderLight : loaderDark;

  return (
    <AnimatePresence>
      {isSyncing && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="fixed inset-0 z-50 modal-backdrop flex flex-col items-center justify-center select-none p-4"
        >
          {/* Centered Ambient Glow */}
          <div
            className="absolute rounded-full blur-[110px] pointer-events-none transition-all duration-700"
            style={{
              width: 360,
              height: 360,
              background: isLight
                ? 'radial-gradient(circle, rgba(124,58,237,0.22), transparent 70%)'
                : 'radial-gradient(circle, rgba(0,240,255,0.20), transparent 70%)',
            }}
          />

          {/* Loader Container — No Card Box, Clean Transparent Presentation */}
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 8 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 8 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="relative flex flex-col items-center justify-center text-center z-10"
          >
            {/* Big Loader with background completely removed */}
            <div className="relative flex items-center justify-center">
              {!imgError ? (
                <img
                  src={loaderSrc}
                  alt="Loading..."
                  onError={() => setImgError(true)}
                  className={`w-64 sm:w-72 md:w-80 h-auto object-contain select-none pointer-events-none drop-shadow-2xl ${
                    isLight ? '' : 'mix-blend-screen'
                  }`}
                />
              ) : (
                <FluidOrbFallback isLight={isLight} />
              )}
            </div>

            {/* Only the loading writing — dark text in light theme, light text in dark theme */}
            <motion.p
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className={`mt-4 font-sans text-sm sm:text-base font-semibold tracking-wider uppercase flex items-center gap-2 transition-colors ${
                isLight
                  ? 'text-slate-900'
                  : 'text-slate-100 drop-shadow-[0_0_12px_rgba(255,255,255,0.5)]'
              }`}
            >
              <span className="animate-pulse">Loading...</span>
            </motion.p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
