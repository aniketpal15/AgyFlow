import React, { useState } from 'react';
import { Clock, MoreVertical, Trash2, AlertCircle, ArrowLeftRight, CheckCircle2, Sparkles, Cpu } from 'lucide-react';
import { motion } from 'framer-motion';

function refreshedAt(value) {
  return value ? new Date(value).toLocaleTimeString() : 'Not synced';
}

export default function AccountCard({ account, index, onDelete, onInspectRpc, onSwitchAccount, isHero = false }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const isActive = account.isActiveInIde || account.status === 'Primary Active';

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

  return (
    <motion.article
      data-hero={isHero ? "true" : undefined}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: Math.min(index * 0.05, 0.25) }}
      className={`glass-panel specular-top rounded-2xl p-4 sm:p-6 shadow-card-elevated relative overflow-hidden flex flex-col transition-all duration-300 ${
        isHero
          ? 'border-cyan/50 shadow-cyan-glow/25 bg-gradient-to-b from-[#111728]/95 to-[#0b0e17]/95'
          : isActive
          ? 'border-cyan/40 shadow-cyan-glow/20'
          : 'border-white/10'
      }`}
    >
      {isHero ? (
        <header className="mb-5 flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.08] px-3 py-2.5 backdrop-blur-sm">
          <div className="flex min-w-0 items-center gap-3">
            {account.avatarUrl ? (
              <img
                src={account.avatarUrl}
                alt=""
                className="h-9 w-9 rounded-full border border-white/20 object-cover shadow-sm shadow-white/10"
              />
            ) : (
              <div className="grid h-9 w-9 place-items-center rounded-full bg-white/[0.08] text-xs font-bold text-white">
                {account.seatBadge || 'G'}
              </div>
            )}
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="truncate text-sm font-bold text-white" title={account.email}>
                  {account.email}
                </h3>
                <span className="rounded-full border border-white/20 bg-white/10 px-2 py-0.5 text-[9px] font-mono font-bold uppercase tracking-[0.12em] text-white/90">
                  IDE ACTIVE
                </span>
              </div>
              <p className="mt-1 flex items-center gap-1.5 text-[11px] text-white/80">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400" />
                <span className="capitalize">{account.status}</span>
                <span className="text-white/40">·</span>
                <span>{account.plan || 'Antigravity Starter Quota'}</span>
              </p>
            </div>
          </div>

          <span className="flex items-center gap-1.5 rounded-full border border-emerald-400/30 bg-emerald-500/10 px-2.5 py-1 text-[9px] font-mono font-bold uppercase tracking-[0.12em] text-emerald-200">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            ACTIVE
          </span>
        </header>
      ) : (
        <header className="flex items-start justify-between mb-5">
          <div className="flex gap-3 min-w-0">
            {account.avatarUrl ? (
              <img
                src={account.avatarUrl}
                alt=""
                className={`w-10 h-10 rounded-xl object-cover border ${
                  isActive ? 'border-cyan shadow-sm shadow-cyan' : 'border-white/10'
                }`}
              />
            ) : (
              <div className="w-10 h-10 rounded-xl bg-white/[0.05] grid place-items-center text-sm font-bold text-slate-300">
                {account.seatBadge || 'G'}
              </div>
            )}
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-white truncate" title={account.email}>
                  {account.email}
                </h3>
                {isActive && (
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-cyan/20 text-cyan border border-cyan/40">
                    IDE ACTIVE
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1.5">
                <span
                  className={`inline-block w-1.5 h-1.5 rounded-full ${
                    isActive ? 'bg-emerald-400 shadow-sm shadow-emerald-400' : 'bg-slate-400'
                  }`}
                />
                <span className="capitalize">{account.status}</span>
                <span className="text-slate-600">·</span>
                <span className="text-slate-400">{account.plan || 'Antigravity Starter'}</span>
              </p>
            </div>
          </div>

          <div className="relative flex items-center gap-1.5">
            {!isActive && onSwitchAccount ? (
              <button
                onClick={() => onSwitchAccount(account.id)}
                className="px-2.5 py-1.5 rounded-lg bg-cyan/10 hover:bg-cyan/20 border border-cyan/30 text-[11px] font-semibold text-cyan hover:text-white flex items-center gap-1.5 transition-all active:scale-95 shadow-sm shadow-cyan/10"
                title="Switch to this account in Antigravity IDE, then import it"
              >
                <ArrowLeftRight className="w-3.5 h-3.5" />
                <span>Switch in IDE</span>
              </button>
            ) : isActive ? (
              <span className="px-2 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/25 text-[10px] font-mono font-bold text-emerald-400 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                ACTIVE
              </span>
            ) : null}

            <button
              aria-label="Account options"
              onClick={() => setMenuOpen((v) => !v)}
              className="text-slate-500 hover:text-white p-1 rounded-lg hover:bg-white/[0.05] transition-colors"
            >
              <MoreVertical className="w-4 h-4" />
            </button>

            {menuOpen && (
              <div className="absolute right-0 top-7 z-20 w-48 p-1.5 rounded-xl bg-[#141722] border border-white/10 shadow-2xl backdrop-blur-xl">
                {!isActive && onSwitchAccount && (
                  <button
                    onClick={() => {
                      onSwitchAccount(account.id);
                      setMenuOpen(false);
                    }}
                    className="w-full p-2 flex items-center gap-2 text-xs text-slate-200 hover:text-cyan hover:bg-white/[0.05] rounded-lg transition-colors"
                  >
                    <ArrowLeftRight className="w-3.5 h-3.5 text-cyan" />
                    Switch in Antigravity IDE, then import
                  </button>
                )}
                <button
                  onClick={() => {
                    onDelete(account.id);
                    setMenuOpen(false);
                  }}
                  className="w-full p-2 flex items-center gap-2 text-xs text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Remove Account
                </button>
              </div>
            )}
          </div>
        </header>
      )}

      {/* Error / Re-Auth Banner — compact strip, bars still visible below */}
      {account.error && (
        <div className="text-[10px] text-amber-300/90 bg-amber-400/[0.07] rounded-lg px-3 py-1.5 mb-3 flex items-center justify-between gap-2 border border-amber-400/15">
          <span className="flex items-center gap-1.5 min-w-0">
            <AlertCircle className="w-3 h-3 shrink-0 text-amber-400" />
            <span className="truncate leading-snug">{account.error}</span>
          </span>
          <button
            onClick={() => onDelete(account.id)}
            className="text-[10px] font-bold text-red-400/80 hover:text-red-300 shrink-0 ml-1"
            title="Remove account"
          >
            Remove
          </button>
        </div>
      )}

      {/* Exactly TWO Stable Token Viewing Bars: Gemini + Claude & GPT */}
      <div className={isHero ? "grid grid-cols-1 md:grid-cols-2 gap-4 my-1" : "space-y-3.5 my-1"}>
        {/* 1. Gemini Bar */}
        <div className="quota-box p-3.5 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:border-cyan/30 transition-colors">
          <div className="flex justify-between items-center text-xs mb-2">
            <span className="font-bold text-white flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-cyan" />
              <span>Gemini</span>
            </span>
            <span
              className={`font-mono font-bold ${
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

          <div className="h-2 rounded-full bg-white/[0.06] overflow-hidden">
            <div
              style={{ width: `${Math.max(0, Math.min(100, geminiQuota.remainingPercent))}%` }}
              className={`h-full rounded-full transition-all duration-700 ease-out ${
                geminiQuota.remainingPercent <= 20
                  ? 'bg-gradient-to-r from-rose-500 to-red-400'
                  : 'bg-gradient-to-r from-cyan/80 to-cyan shadow-sm shadow-cyan'
              }`}
            />
          </div>

          <div className="text-[10px] text-slate-400 mt-2 flex items-center justify-between font-mono">
            <span className="flex items-center gap-1 text-slate-500">
              <Clock className="w-3 h-3" />
              Reset Window:
            </span>
            <span className="text-slate-300 font-semibold">{geminiQuota.resetCountdown}</span>
          </div>
        </div>

        {/* 2. Claude & GPT Bar */}
        <div className="quota-box p-3.5 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:border-amber-400/30 transition-colors">
          <div className="flex justify-between items-center text-xs mb-2">
            <span className="font-bold text-white flex items-center gap-2">
              <Cpu className="w-3.5 h-3.5 text-amber-400" />
              <span>Claude & GPT</span>
            </span>
            <span
              className={`font-mono font-bold ${
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

          <div className="h-2 rounded-full bg-white/[0.06] overflow-hidden">
            <div
              style={{ width: `${Math.max(0, Math.min(100, claudeGptQuota.remainingPercent))}%` }}
              className={`h-full rounded-full transition-all duration-700 ease-out ${
                claudeGptQuota.remainingPercent <= 20
                  ? 'bg-gradient-to-r from-rose-500 to-red-400'
                  : 'bg-gradient-to-r from-amber-500 to-amber-400 shadow-sm shadow-amber-400'
              }`}
            />
          </div>

          <div className="text-[10px] text-slate-400 mt-2 flex items-center justify-between font-mono">
            <span className="flex items-center gap-1 text-slate-500">
              <Clock className="w-3 h-3" />
              Reset Window:
            </span>
            <span className="text-slate-300 font-semibold">{claudeGptQuota.resetCountdown}</span>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="pt-3 mt-4 border-t border-white/[0.06] text-[10px] text-slate-500 flex justify-between items-center">
        <span>Synced: {refreshedAt(account.lastRefreshedAt)}</span>
        <button
          onClick={() => onInspectRpc(account)}
          className="text-cyan hover:underline font-mono"
        >
          RPC Specs
        </button>
      </footer>
    </motion.article>
  );
}
