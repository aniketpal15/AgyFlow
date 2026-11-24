import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import loaderDark from '../assets/loader-dark.webp';

// Fluid SVG metaball loader fallback
function FluidOrbSplash({ isLight }) {
  const c1 = isLight ? '#7C3AED' : '#00f0ff';
  const c2 = isLight ? '#A855F7' : '#6366f1';

  return (
    <div className="relative w-64 h-40 flex items-center justify-center">
      <motion.div
        animate={{
          x: [-45, 45, -45],
          scale: [1, 1.25, 0.85, 1],
        }}
        transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
        className="w-16 h-16 rounded-full absolute"
        style={{
          background: `radial-gradient(circle at 35% 35%, #ffffff 0%, ${c1} 65%, transparent 100%)`,
          boxShadow: `0 0 32px ${c1}`,
        }}
      />
      <motion.div
        animate={{
          x: [45, -45, 45],
          scale: [1, 0.85, 1.25, 1],
        }}
        transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
        className="w-14 h-14 rounded-full absolute"
        style={{
          background: `radial-gradient(circle at 35% 35%, #ffffff 0%, ${c2} 65%, transparent 100%)`,
          boxShadow: `0 0 25px ${c2}`,
        }}
      />
    </div>
  );
}

export default function SplashLoader({ isVisible, theme = 'dark' }) {
  const [imgError, setImgError] = useState(false);
  const isLight = theme === 'snow' || theme === 'latte';

  const bg =
    theme === 'oled'
      ? 'bg-black'
      : theme === 'latte'
      ? 'bg-[#FBF8F3]'
      : theme === 'snow'
      ? 'bg-[#F4F5FB]'
      : 'bg-[#090A0F]';

  const titleColor = isLight ? 'text-slate-900' : 'text-white';
  const subtitleColor = isLight ? 'text-slate-500' : 'text-slate-400';
  const badgeBg = isLight
    ? 'bg-purple-500/10 text-purple-700 border-purple-400/30'
    : 'bg-cyan/10 text-cyan border-cyan/25';
  const shimmerFrom = isLight
    ? 'from-transparent via-purple-500 to-transparent'
    : 'from-transparent via-cyan to-transparent';
  const shimmerTrack = isLight ? 'bg-slate-200' : 'bg-white/[0.07]';

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.5, ease: 'easeInOut' } }}
          className={`fixed inset-0 z-50 flex flex-col items-center justify-center select-none ${bg}`}
        >
          {/* Ambient Glow */}
          <div
            className="absolute rounded-full blur-[110px] pointer-events-none transition-all duration-700"
            style={{
              width: 380,
              height: 380,
              background: 'radial-gradient(circle, rgba(0,240,255,0.18), transparent 70%)',
            }}
          />

          {/* Dribbble Fluid Loader Animation */}
          <motion.div
            initial={{ opacity: 0, scale: 0.88 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
            className="relative mb-6 flex items-center justify-center"
          >
            {!imgError ? (
              <img
                src={loaderDark}
                alt="Loading..."
                onError={() => setImgError(true)}
                className={`w-64 sm:w-72 md:w-80 h-auto object-contain select-none pointer-events-none drop-shadow-2xl ${
                  isLight ? '' : 'mix-blend-screen'
                }`}
              />
            ) : (
              <FluidOrbSplash isLight={isLight} />
            )}
          </motion.div>

          {/* App Branding & Status */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.4 }}
            className="flex flex-col items-center gap-2 text-center"
          >
            <div className="flex items-center gap-2">
              <h2 className={`text-2xl font-extrabold tracking-tight ${titleColor}`}>
                AgyFlow
              </h2>
              <span className={`px-2 py-0.5 rounded-md text-[10px] font-mono font-bold border ${badgeBg}`}>
                v1.1.2
              </span>
            </div>

            <p className={`text-[11px] font-sans font-medium ${subtitleColor}`}>
              Multi Antigravity Account Handling
            </p>

            {/* Shimmer progress bar */}
            <div className={`w-52 h-[3px] rounded-full overflow-hidden mt-4 ${shimmerTrack}`}>
              <motion.div
                initial={{ x: '-100%' }}
                animate={{ x: '100%' }}
                transition={{ repeat: Infinity, duration: 1.4, ease: 'easeInOut' }}
                className={`w-1/2 h-full bg-gradient-to-r ${shimmerFrom}`}
              />
            </div>

            <p className={`mt-2 text-[11px] font-sans font-semibold tracking-wider uppercase ${subtitleColor}`}>
              Initializing...
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
