import React, { useState } from 'react';
import { Clock, Trash2, AlertCircle, ArrowLeftRight, Sparkles, Cpu } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

function refreshedAt(value) {
  return value ? new Date(value).toLocaleTimeString() : 'Not synced';
}

export default function AccountCard({ account, index, onDelete, onInspectRpc, onSwitchAccount, isHero = false }) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const isActive = account.isActiveInIde || account.status === 'Primary Active';

  // Use the real Google photo; strip out any dicebear robot fallbacks
  const realAvatar = account.avatarUrl && !account.avatarUrl.includes('dicebear')
    ? account.avatarUrl
    : null;

  // First letter of email for letter-avatar fallback
  const emailInitial = (account.email?.[0] || 'G').toUpperCase();

  // Guaranteed two quotas: Gemini and Claude & GPT
  const geminiQuota = account.quotas?.find(q => q.key === 'gemini' || q.model === 'Gemini') || {
    model: 'Gemini',
    remainingPercent: 100,
    resetCountdown: 'Ready'
  };

  const claudeGptQuota = account.quotas?.find(q => q.key === 'claude-gpt' || /claude/i.test(q.model)) || {
    model: 'Claude & GPT',
    remainingPercent: 100,
    resetCountdown: 'Ready'
  };

  // Avatar styling based on index/seat
  const avatarColors = [
    'bg-rose-950/40 text-rose-400 border-rose-500/30',
    'bg-purple-900/50 text-purple-300 border-purple-500/30',
    'bg-cyan-950/40 text-cyan-400 border-cyan-500/30',
    'bg-amber-950/40 text-amber-400 border-amber-500/30'
  ];
  const avatarColorClass = avatarColors[index % avatarColors.length];

  return (
    <motion.article
      data-hero={isHero ? "true" : undefined}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: Math.min(index * 0.05, 0.25) }}
      className={`glass-panel rounded-2xl p-4 sm:p-5 relative overflow-hidden flex flex-col transition-all duration-300 ${
        isHero
          ? 'border-purple-500/30 bg-gradient-to-b from-[#111428]/95 to-[#090b16]/95 shadow-xl shadow-purple-950/30'
          : isActive
          ? 'border-cyan/40 shadow-cyan-glow/20'
          : 'border-white/[0.08] hover:border-purple-500/30'
      }`}
    >
      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* 1. HERO ACTIVE CARD                                                 */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {isHero ? (
        <>
          <header className="mb-4 flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-3 sm:p-3.5 backdrop-blur-sm">
            <div className="flex min-w-0 items-center gap-3">
              {realAvatar ? (
                <img
                  src={realAvatar}
                  alt=""
                  onError={(e) => { e.currentTarget.style.display = 'none'; }}
                  className="h-10 w-10 sm:h-11 sm:w-11 rounded-2xl border border-cyan/40 object-cover shadow-sm shadow-cyan/20 shrink-0"
                />
              ) : (
                <div className="grid h-10 w-10 sm:h-11 sm:w-11 place-items-center rounded-2xl bg-cyan-950/40 border border-cyan/40 shadow-sm shadow-cyan/20 shrink-0">
                  <span className="text-base font-bold text-cyan uppercase select-none">
                    {emailInitial}
                  </span>
                </div>
              )}
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="truncate text-sm sm:text-base font-bold text-white tracking-tight" title={account.email}>
                    {account.email}
                  </h3>
                </div>
                <p className="mt-0.5 flex items-center gap-1.5 text-xs text-slate-400">
                  <span className="capitalize">{account.status}</span>
                  <span className="text-slate-600">·</span>
                  <span className="truncate">{account.plan || 'Antigravity Starter Quota'}</span>
                </p>
              </div>
            </div>

            <span className="flex items-center gap-1.5 rounded-full border border-emerald-400/30 bg-emerald-500/10 px-3 py-1 text-xs font-mono font-bold text-emerald-400 shrink-0">
              ACTIVE
            </span>
          </header>

          {/* Error Banner */}
          {account.error && (
            <div className="text-[11px] text-amber-300 bg-amber-400/[0.08] rounded-xl px-3 py-1.5 mb-3 flex items-center justify-between gap-2 border border-amber-400/20">
              <span className="flex items-center gap-1.5 min-w-0">
                <AlertCircle className="w-3.5 h-3.5 shrink-0 text-amber-400" />
                <span className="truncate">{account.error}</span>
              </span>
              <button onClick={() => onDelete(account.id)} className="text-[10px] font-bold text-red-400 hover:underline shrink-0">
                Remove
              </button>
            </div>
          )}

          {/* Hero Dual Quota Boxes */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-2">
            {/* Gemini Box */}
            <div className="quota-box p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] hover:border-cyan/30 transition-colors">
              <div className="flex justify-between items-center text-xs mb-2.5">
                <span className="font-bold text-white flex items-center gap-2">
                  <Sparkles className="w-3.5 h-3.5 text-cyan" />
                  <span>Gemini</span>
                </span>
                <span
                  className={`font-mono font-bold text-xs ${
                    geminiQuota.remainingPercent <= 20
                      ? 'text-rose-400'
                      : geminiQuota.remainingPercent <= 50
                      ? 'text-amber-300'
                      : 'text-cyan'
                  }`}
                >
                  {geminiQuota.remainingPercent}% left
                </span>
              </div>

              <div className="h-2 rounded-full bg-black/40 overflow-hidden mb-2.5">
                <div
                  style={{ width: `${Math.max(0, Math.min(100, geminiQuota.remainingPercent))}%` }}
                  className={`h-full rounded-full transition-all duration-700 ease-out ${
                    geminiQuota.remainingPercent <= 20
                      ? 'bg-gradient-to-r from-rose-500 to-red-400'
                      : 'bg-gradient-to-r from-cyan/80 to-cyan shadow-sm shadow-cyan'
                  }`}
                />
              </div>

              <div className="text-[11px] text-slate-400 flex items-center justify-between font-mono">
                <span className="flex items-center gap-1 text-slate-500">
                  <Clock className="w-3 h-3" />
                  Reset Window:
                </span>
                <span className="text-slate-300 font-semibold">{geminiQuota.resetCountdown}</span>
              </div>
            </div>

            {/* Claude & GPT Box */}
            <div className="quota-box p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] hover:border-amber-400/30 transition-colors">
              <div className="flex justify-between items-center text-xs mb-2.5">
                <span className="font-bold text-white flex items-center gap-2">
                  <Cpu className="w-3.5 h-3.5 text-amber-400" />
                  <span>Claude & GPT</span>
                </span>
                <span
                  className={`font-mono font-bold text-xs ${
                    claudeGptQuota.remainingPercent <= 20
                      ? 'text-rose-400'
                      : claudeGptQuota.remainingPercent <= 50
                      ? 'text-amber-300'
                      : 'text-amber-400'
                  }`}
                >
                  {claudeGptQuota.remainingPercent}% left
                </span>
              </div>

              <div className="h-2 rounded-full bg-black/40 overflow-hidden mb-2.5">
                <div
                  style={{ width: `${Math.max(0, Math.min(100, claudeGptQuota.remainingPercent))}%` }}
                  className={`h-full rounded-full transition-all duration-700 ease-out ${
                    claudeGptQuota.remainingPercent <= 20
                      ? 'bg-gradient-to-r from-rose-500 to-red-400'
                      : 'bg-gradient-to-r from-amber-500 to-amber-400 shadow-sm shadow-amber-400'
                  }`}
                />
              </div>

              <div className="text-[11px] text-slate-400 flex items-center justify-between font-mono">
                <span className="flex items-center gap-1 text-slate-500">
                  <Clock className="w-3 h-3" />
                  Reset Window:
                </span>
                <span className="text-slate-300 font-semibold">{claudeGptQuota.resetCountdown}</span>
              </div>
            </div>
          </div>

          {/* Hero Footer */}
          <footer className="pt-2.5 mt-2 border-t border-white/[0.06] text-[11px] text-slate-500 flex justify-between items-center">
            <span>Synced: {refreshedAt(account.lastRefreshedAt)}</span>
            <button
              onClick={() => onInspectRpc(account)}
              className="text-cyan hover:underline font-mono text-xs flex items-center gap-1"
            >
              <span>RPC Specs</span>
              <span>↗</span>
            </button>
          </footer>
        </>
      ) : (
        /* ─────────────────────────────────────────────────────────────────── */
        /* 2. STANDBY CARD (Directly matching user screenshot)                 */
        /* ─────────────────────────────────────────────────────────────────── */
        <>
          {/* Delete Confirmation Modal */}
          <AnimatePresence>
            {showDeleteConfirm && (
              <motion.div
                key="delete-confirm"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="modal-backdrop fixed inset-0 z-50 flex items-center justify-center p-4"
                onClick={() => setShowDeleteConfirm(false)}
              >
                <motion.div
                  initial={{ opacity: 0, scale: 0.92, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.92, y: 10 }}
                  transition={{ duration: 0.2, ease: 'easeOut' }}
                  className="modal-surface rounded-2xl p-6 w-full max-w-sm shadow-2xl"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex flex-col items-center text-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center justify-center">
                      <Trash2 className="w-5 h-5 text-red-400" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-white mb-1">Remove Account?</h3>
                      <p className="text-xs text-slate-400 leading-relaxed">
                        Are you sure you want to remove{' '}
                        <span className="text-slate-200 font-medium break-all">{account.email}</span>{' '}
                        from the fleet?
                      </p>
                    </div>
                    <div className="flex gap-3 w-full">
                      <button
                        onClick={() => setShowDeleteConfirm(false)}
                        className="flex-1 py-2 rounded-xl text-sm font-semibold bg-white/[0.06] hover:bg-white/[0.10] text-slate-300 border border-white/10 transition-colors active:scale-95"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => { onDelete(account.id); setShowDeleteConfirm(false); }}
                        className="flex-1 py-2 rounded-xl text-sm font-semibold bg-red-500/15 hover:bg-red-500/25 text-red-400 border border-red-500/30 transition-colors active:scale-95"
                      >
                        Yes, Remove
                      </button>
                    </div>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Header row: [Avatar] [Email+Status] [flex-1] [Switch btn] [Delete btn] */}
          <header className="flex items-center gap-2 mb-2">
            {/* Avatar */}
            {realAvatar ? (
              <img
                src={realAvatar}
                alt=""
                onError={(e) => { e.currentTarget.style.display = 'none'; }}
                className="w-9 h-9 rounded-xl object-cover border border-white/10 shrink-0"
              />
            ) : (
              <div className={`w-9 h-9 rounded-xl border flex items-center justify-center text-sm font-bold shrink-0 ${avatarColorClass}`}>
                {emailInitial}
              </div>
            )}

            {/* Email + Status — takes remaining space */}
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-bold text-white truncate tracking-tight" title={account.email}>
                {account.email}
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1.5 truncate">
                <span className="capitalize">{account.status}</span>
                <span className="text-slate-600">·</span>
                <span className="truncate">{account.plan || 'Antigravity Starter'}</span>
              </p>
            </div>

            {/* Small "Switch" inline button — only for standby accounts */}
            {!isActive && onSwitchAccount && (
              <button
                onClick={() => onSwitchAccount(account.id)}
                title="Switch in IDE"
                className="shrink-0 flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-semibold text-cyan border border-cyan/30 bg-cyan/[0.06] hover:bg-cyan/[0.14] transition-all active:scale-95"
              >
                <ArrowLeftRight className="w-3 h-3" />
                <span>Switch</span>
              </button>
            )}

            {/* Red delete button */}
            <button
              onClick={() => setShowDeleteConfirm(true)}
              title="Remove account"
              aria-label="Remove account"
              className="shrink-0 p-1.5 rounded-lg text-red-500 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 transition-all active:scale-95"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </header>

          {/* Error Banner */}
          {account.error && (
            <div className="text-[10px] text-amber-300 bg-amber-400/[0.07] rounded-lg px-2.5 py-1 mb-2 flex items-center justify-between gap-1.5 border border-amber-400/15">
              <span className="truncate">{account.error}</span>
              <button onClick={() => onDelete(account.id)} className="text-[10px] font-bold text-red-400 hover:underline shrink-0">
                Remove
              </button>
            </div>
          )}

          {/* Standby Quotas: Gemini */}
          <div className="mt-1 space-y-3">
            <div>
              <div className="flex justify-between items-center text-xs mb-1">
                <span className="font-semibold text-white flex items-center gap-1.5 text-[11px]">
                  <Sparkles className="w-3 h-3 text-cyan" />
                  <span>Gemini</span>
                </span>
                <span
                  className={`font-mono font-bold text-[11px] ${
                    geminiQuota.remainingPercent <= 20
                      ? 'text-rose-400'
                      : geminiQuota.remainingPercent <= 50
                      ? 'text-amber-300'
                      : 'text-cyan'
                  }`}
                >
                  {geminiQuota.remainingPercent}% left
                </span>
              </div>
              <div className="h-1 rounded-full bg-white/[0.06] overflow-hidden mb-1.5">
                <div
                  style={{ width: `${Math.max(0, Math.min(100, geminiQuota.remainingPercent))}%` }}
                  className={`h-full rounded-full transition-all duration-700 ease-out gemini-bar ${
                    geminiQuota.remainingPercent <= 20
                      ? 'bg-gradient-to-r from-rose-500 to-red-400'
                      : 'bg-cyan'
                  }`}
                />
              </div>
              <div className="text-[10px] text-slate-400 flex items-center justify-between font-mono">
                <span className="flex items-center gap-1 text-slate-500">
                  <Clock className="w-2.5 h-2.5" />
                  Reset Window:
                </span>
                <span className="text-slate-300">{geminiQuota.resetCountdown}</span>
              </div>
            </div>

            {/* Standby Quotas: Claude & GPT */}
            <div>
              <div className="flex justify-between items-center text-xs mb-1">
                <span className="font-semibold text-white flex items-center gap-1.5 text-[11px]">
                  <Cpu className="w-3 h-3 text-amber-400" />
                  <span>Claude & GPT</span>
                </span>
                <span
                  className={`font-mono font-bold text-[11px] ${
                    claudeGptQuota.remainingPercent <= 20
                      ? 'text-rose-400'
                      : claudeGptQuota.remainingPercent <= 50
                      ? 'text-amber-300'
                      : 'text-amber-400'
                  }`}
                >
                  {claudeGptQuota.remainingPercent}% left
                </span>
              </div>
              <div className="h-1 rounded-full bg-white/[0.06] overflow-hidden mb-1.5">
                <div
                  style={{ width: `${Math.max(0, Math.min(100, claudeGptQuota.remainingPercent))}%` }}
                  className={`h-full rounded-full transition-all duration-700 ease-out ${
                    claudeGptQuota.remainingPercent <= 20
                      ? 'bg-gradient-to-r from-rose-500 to-red-400'
                      : 'bg-gradient-to-r from-amber-400 to-amber-500'
                  }`}
                />
              </div>
              <div className="text-[10px] text-slate-400 flex items-center justify-between font-mono">
                <span className="flex items-center gap-1 text-slate-500">
                  <Clock className="w-2.5 h-2.5" />
                  Reset Window:
                </span>
                <span className="text-slate-300">{claudeGptQuota.resetCountdown}</span>
              </div>
            </div>
          </div>

          {/* Footer */}
          <footer className="pt-2.5 mt-3 border-t border-white/[0.06] text-[10px] text-slate-500 flex justify-between items-center">
            <span>Synced: {refreshedAt(account.lastRefreshedAt)}</span>
            <button
              onClick={() => onInspectRpc(account)}
              className="text-cyan hover:underline font-mono text-[11px]"
            >
              RPC Specs
            </button>
          </footer>
        </>
      )}
    </motion.article>
  );
}
