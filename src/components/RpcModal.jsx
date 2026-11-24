import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Terminal, Check, Copy } from 'lucide-react';

export default function RpcModal({ isOpen, onClose, account }) {
  const [copied, setCopied] = React.useState(false);

  // Escape key listener for accessibility
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!account) return null;

  const runtimeQuotas = account.quotas && account.quotas.length > 0
    ? account.quotas.reduce((acc, q) => {
        acc[q.model] = {
          remaining_percentage: `${q.remainingPercent}%`,
          reset_countdown: q.resetCountdown,
          reset_timestamp: q.resetTime
        };
        return acc;
      }, {})
    : {
        gemini_pro: {
          remaining: account.gemini?.limit ? `${Math.round(((account.gemini.limit - (account.gemini.used || 0)) / account.gemini.limit) * 100)}%` : "100%",
          window_reset: account.gemini?.resetCountdown || "Active"
        }
      };

  const payload = {
    daemon_version: "1.1.2-antigravity",
    pool_id: account.id || "antigravity-local-node",
    seat_badge: account.seatBadge || "G1",
    authenticated_identity: account.email,
    plan_tier: account.plan || "Antigravity Starter",
    active_in_ide: !!account.isActiveInIde,
    status: account.status,
    runtime_quotas: runtimeQuotas,
    keystore_provider: "Windows Credential Manager (DPAPI)",
    telemetry_latency_ms: 0.28
  };

  const jsonStr = JSON.stringify(payload, null, 2);

  const handleCopy = () => {
    navigator.clipboard.writeText(jsonStr);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

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
            className="w-full max-w-xl rounded-3xl modal-surface p-6 relative specular-top flex flex-col max-h-[85vh] shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-black/5 dark:border-white/[0.06] mb-4">
              <div className="flex items-center gap-2.5">
                <Terminal className="w-4 h-4 text-purple-600 dark:text-cyan" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white font-mono">
                  RPC Daemon Telemetry • {account.seatBadge || 'Seat'}
                </h3>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopy}
                  className="px-2.5 py-1 rounded-lg bg-black/5 dark:bg-white/[0.05] hover:bg-black/10 dark:hover:bg-white/[0.1] text-xs font-mono text-slate-700 dark:text-slate-300 flex items-center gap-1.5 transition-colors active:scale-95"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copied' : 'Copy'}</span>
                </button>
                <button
                  onClick={onClose}
                  aria-label="Close modal"
                  className="w-7 h-7 rounded-lg bg-black/5 dark:bg-white/[0.04] hover:bg-black/10 dark:hover:bg-white/[0.08] text-slate-400 hover:text-slate-900 dark:hover:text-white flex items-center justify-center transition-colors active:scale-95"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Terminal Body */}
            <div className="flex-1 overflow-auto rounded-2xl bg-[#080A12] border border-black/10 dark:border-white/[0.06] p-4 text-[11px] font-mono text-cyan-300 leading-relaxed shadow-inner">
              <pre className="whitespace-pre-wrap">{jsonStr}</pre>
            </div>

            {/* Footer */}
            <div className="mt-4 pt-3 border-t border-black/5 dark:border-white/[0.06] flex items-center justify-between text-[11px] text-slate-500 font-mono">
              <span>Protocol: JSON-RPC 2.0</span>
              <span className="text-emerald-600 dark:text-emerald-400">Stream Connected (0.28ms)</span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
