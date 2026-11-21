import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ShieldCheck, DownloadCloud, Sparkles } from 'lucide-react';

export default function AddAccountModal({ isOpen, onClose, onImportAccount, accounts = [] }) {
  // Escape key listener for accessibility
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={(e) => {
            if (e.target === e.currentTarget) onClose();
          }}
          className="fixed inset-0 z-50 modal-backdrop flex items-center justify-center p-4 select-none"
          role="dialog"
          aria-modal="true"
        >
          <motion.div
            initial={{ scale: 0.94, opacity: 0, y: 16 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.94, opacity: 0, y: 16 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="w-full max-w-lg rounded-3xl modal-surface p-6 sm:p-7 relative specular-top shadow-2xl"
          >
            {/* Close Button */}
            <button
              onClick={onClose}
              aria-label="Close modal"
              className="absolute right-5 top-5 w-8 h-8 rounded-full bg-black/5 dark:bg-white/[0.04] hover:bg-black/10 dark:hover:bg-white/[0.08] text-slate-400 hover:text-slate-900 dark:hover:text-white flex items-center justify-center transition-colors active:scale-95"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Header */}
            <div className="flex items-center gap-3.5 mb-6">
              <div className="w-12 h-12 rounded-2xl bg-purple-500/10 dark:bg-white/[0.05] border border-purple-500/30 dark:border-cyan/30 flex items-center justify-center shadow-inner relative overflow-hidden shrink-0">
                <Sparkles className="w-6 h-6 text-purple-600 dark:text-cyan" />
              </div>
              <div className="min-w-0 pr-8">
                <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white tracking-tight">
                  Add Google Account to Fleet
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                  Track quotas across all your Google accounts simultaneously
                </p>
              </div>
            </div>

            {/* Quick 1-Click Sync Section */}
            <div className="modal-inner-card p-4 rounded-2xl mb-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <DownloadCloud className="w-4 h-4 text-purple-600 dark:text-cyan" />
                  <span className="text-xs font-bold text-slate-900 dark:text-white">Sync from Antigravity IDE</span>
                </div>
                <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20 font-semibold">
                  Zero Login Needed
                </span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed mb-4">
                Your computer's Windows Credential Manager stores the active Antigravity session. Click below to automatically detect and import it.
              </p>
              <button
                type="button"
                onClick={() => {
                  onImportAccount();
                  onClose();
                }}
                className="w-full py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 dark:from-cyan dark:to-cyan dark:text-black transition-all shadow-md shadow-purple-600/25 dark:shadow-cyan-glow flex items-center justify-center gap-2 active:scale-95"
              >
                <DownloadCloud className="w-4 h-4" />
                <span>Import Current Active IDE Account</span>
              </button>
            </div>

            {/* Multi-Account Guide */}
            <div className="modal-guide-card p-4 rounded-2xl mb-5 space-y-2.5 text-xs text-slate-600 dark:text-slate-300">
              <h4 className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5 text-xs">
                <span>How to Link Multiple Accounts:</span>
              </h4>
              <div className="flex items-start gap-2.5 text-slate-600 dark:text-slate-400">
                <span className="w-5 h-5 rounded-full bg-slate-200 dark:bg-white/[0.08] text-slate-800 dark:text-white grid place-items-center text-[10px] font-bold shrink-0 mt-0.5">1</span>
                <span>Open your <strong>Antigravity IDE</strong> and switch to your second/third Google Account.</span>
              </div>
              <div className="flex items-start gap-2.5 text-slate-600 dark:text-slate-400">
                <span className="w-5 h-5 rounded-full bg-slate-200 dark:bg-white/[0.08] text-slate-800 dark:text-white grid place-items-center text-[10px] font-bold shrink-0 mt-0.5">2</span>
                <span>Come back to this app and click <strong>"Import Current Active IDE Account"</strong> above.</span>
              </div>
              <div className="flex items-start gap-2.5 text-slate-600 dark:text-slate-400">
                <span className="w-5 h-5 rounded-full bg-slate-200 dark:bg-white/[0.08] text-slate-800 dark:text-white grid place-items-center text-[10px] font-bold shrink-0 mt-0.5">3</span>
                <span>Both accounts stay securely saved in your local vault and will be tracked side-by-side!</span>
              </div>
            </div>

            {/* Security note */}
            <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono">
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400" />
                Hardware-encrypted via Windows DPAPI
              </span>
              <span>{accounts.length} account{accounts.length === 1 ? '' : 's'} linked</span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
