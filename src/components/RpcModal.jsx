import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Terminal, Check, Copy } from 'lucide-react';

export default function RpcModal({ isOpen, onClose, account }) {
  const [copied, setCopied] = React.useState(false);

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
    daemon_version: "2.4.0-antigravity",
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
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xl flex items-center justify-center p-4"
        >
          <motion.div
            initial={{ scale: 0.94, opacity: 0, y: 16 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.94, opacity: 0, y: 16 }}
            className="w-full max-w-xl rounded-3xl bg-[#0E1118] border border-white/[0.1] shadow-2xl p-6 relative specular-top flex flex-col max-h-[85vh]"
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-white/[0.06] mb-4">
              <div className="flex items-center gap-2.5">
                <Terminal className="w-4 h-4 text-cyan" />
                <h3 className="text-sm font-bold text-white font-mono">
                  RPC Daemon Telemetry • {account.seatBadge || 'Seat'}
                </h3>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopy}
                  className="px-2.5 py-1 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] text-xs font-mono text-slate-300 flex items-center gap-1.5 transition-colors"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copied' : 'Copy'}</span>
                </button>
                <button
                  onClick={onClose}
                  className="w-7 h-7 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] text-slate-400 hover:text-white flex items-center justify-center transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Code Body */}
            <div className="flex-1 overflow-y-auto rounded-xl bg-black/60 p-4 border border-white/[0.06] font-mono text-[12px] text-cyan/90 leading-relaxed">
              <pre>{jsonStr}</pre>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
