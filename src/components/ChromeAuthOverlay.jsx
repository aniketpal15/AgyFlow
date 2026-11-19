import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ExternalLink, CheckCircle2, Clock } from 'lucide-react';

export default function ChromeAuthOverlay({ isOpen, onCancel, onReopen }) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-2xl flex items-center justify-center p-4 select-none"
        >
          <motion.div
            initial={{ scale: 0.94, opacity: 0, y: 16 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.94, opacity: 0, y: 16 }}
            transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
            className="w-full max-w-md rounded-3xl bg-[#111520] border border-white/[0.1] shadow-2xl p-7 relative specular-top text-center"
          >
            {/* Close / Cancel Button */}
            <button
              onClick={onCancel}
              className="absolute right-5 top-5 w-8 h-8 rounded-full bg-white/[0.04] hover:bg-white/[0.08] text-slate-400 hover:text-white flex items-center justify-center transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Glowing Google Icon with pulse */}
            <div className="relative w-16 h-16 mx-auto mb-5 flex items-center justify-center">
              <div className="absolute inset-0 rounded-2xl bg-cyan/20 blur-xl animate-pulse" />
              <div className="w-14 h-14 rounded-2xl bg-[#161B26] border border-white/10 flex items-center justify-center shadow-inner relative z-10">
                <svg className="w-7 h-7 animate-pulse" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"/>
                  <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"/>
                  <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.98 0 12s.45 3.82 1.25 5.42l4.03-3.15z"/>
                  <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"/>
                </svg>
              </div>
            </div>

            <h3 className="text-lg font-bold text-white tracking-tight mb-2">
              Authenticating in Google Chrome
            </h3>
            <p className="text-xs text-slate-400 max-w-xs mx-auto mb-6 leading-relaxed">
              Google Chrome has been opened. Please complete your Google sign-in in your browser window.
            </p>

            {/* Stepper Status Box */}
            <div className="rounded-2xl bg-black/40 border border-white/[0.06] p-4 text-left space-y-3 mb-6 font-mono text-xs">
              <div className="flex items-center gap-2.5 text-emerald-400">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                <span>Chrome browser redirected</span>
              </div>
              <div className="flex items-center gap-2.5 text-cyan animate-pulse">
                <Clock className="w-4 h-4 flex-shrink-0" />
                <span>Waiting for Google authorization...</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={onCancel}
                className="flex-1 py-2.5 rounded-xl text-xs font-semibold text-slate-300 bg-white/[0.05] hover:bg-white/[0.08] border border-white/[0.08] transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={onReopen}
                className="flex-1 py-2.5 rounded-xl text-xs font-semibold text-white bg-white/[0.08] hover:bg-white/[0.12] border border-cyan/30 flex items-center justify-center gap-1.5 transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5 text-cyan" />
                <span>Re-open Chrome</span>
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

