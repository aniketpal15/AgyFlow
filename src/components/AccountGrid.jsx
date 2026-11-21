import React from 'react';
import { AnimatePresence } from 'framer-motion';
import AccountCard from './AccountCard';
import { Sparkles, ShieldCheck, DownloadCloud } from 'lucide-react';

export default function AccountGrid({ 
  accounts, 
  onDeleteAccount, 
  onInspectRpc,
  onSwitchAccount,
  onImportAccount
}) {
  // 1. Identify the currently active Antigravity IDE account
  const activeAccount = accounts.find(a => a.isActiveInIde || a.status === 'Primary Active') || accounts[0];

  // Helper: compute total quota pool sum (Gemini % + Claude %)
  const getQuotaSum = (acc) => {
    const gemini = acc.quotas?.find(q => q.key === 'gemini' || q.model === 'Gemini')?.remainingPercent ?? 0;
    const claude = acc.quotas?.find(q => q.key === 'claude-gpt' || /claude/i.test(q.model))?.remainingPercent ?? 0;
    return Number(gemini) + Number(claude);
  };

  // 2. Filter out active account for the linked section, and sort MAX to MIN by quota sum
  const standbyAccounts = accounts
    .filter(a => a.id !== activeAccount?.id)
    .sort((a, b) => getQuotaSum(b) - getQuotaSum(a));

  return (
    <div className="flex-1 flex flex-col overflow-hidden px-3 sm:px-8 pb-4 sm:pb-6">
      {/* Main Momentum Scroll Area */}
      <div className="flex-1 overflow-y-auto pr-1.5 -mr-1.5 pt-4">
        {accounts.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 text-slate-400 p-6 text-center my-8">
            <Sparkles className="w-8 h-8 text-cyan mb-3 opacity-60 animate-pulse" />
            <p className="text-sm font-semibold text-slate-200">No Google Accounts In Fleet</p>
            <p className="text-xs text-slate-400 mt-1 max-w-sm leading-relaxed">
              Antigravity IDE saves credentials directly in Windows Credential Manager. Click below to load your active account immediately.
            </p>
            {onImportAccount && (
              <button
                onClick={onImportAccount}
                className="mt-5 px-5 py-2.5 rounded-xl bg-cyan hover:bg-cyan/90 text-black font-semibold text-xs shadow-cyan-glow flex items-center gap-2 transition-all active:scale-95"
              >
                <DownloadCloud className="w-4 h-4" />
                <span>Import Active IDE Account</span>
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-7 pb-8">
            {/* ------------------------------------------------------------- */}
            {/* 1. TOP SECTION: ACTIVE IDE ACCOUNT (FULL WIDTH)               */}
            {/* ------------------------------------------------------------- */}
            {activeAccount && (
              <section className="w-full">
                <div className="flex items-center justify-between pb-3">
                  <div className="flex items-center gap-2.5">
                    <h2 className="text-sm font-mono font-bold tracking-wider uppercase text-cyan">
                      Current Active IDE Account
                    </h2>
                  </div>

                  <div className="flex items-center gap-1.5 font-mono text-[11px] text-slate-400">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="hidden sm:inline">Windows Keystore Active</span>
                  </div>
                </div>

                {/* Full-Width Hero Card */}
                <div className="w-full">
                  <AccountCard
                    account={activeAccount}
                    index={0}
                    isHero={true}
                    onDelete={onDeleteAccount}
                    onInspectRpc={onInspectRpc}
                    onSwitchAccount={onSwitchAccount}
                  />
                </div>
              </section>
            )}

            {/* ------------------------------------------------------------- */}
            {/* 2. BOTTOM SECTION: LINKED GOOGLE ACCOUNTS (SORTED MAX TO MIN) */}
            {/* ------------------------------------------------------------- */}
            <section className="w-full pt-1">
              <div className="flex items-center justify-between pb-3.5">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h2 className="text-base font-bold tracking-tight text-white">
                    Linked Google Accounts
                  </h2>
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-mono font-bold bg-white/[0.06] text-slate-300 border border-white/[0.10]">
                    {accounts.length}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 font-medium hidden md:block">
                  Ranked by combined Gemini + Claude quota pool percentage
                </p>
              </div>

              {standbyAccounts.length === 0 ? (
                <div className="py-8 px-4 rounded-xl border border-dashed border-white/10 text-center text-slate-500 text-xs font-mono">
                  No standby accounts in fleet. Switch accounts in Antigravity IDE and click "Import Current Active IDE Account" to add more.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                  <AnimatePresence>
                    {standbyAccounts.map((acc, index) => (
                      <AccountCard
                        key={acc.id}
                        account={acc}
                        index={index + 1}
                        isHero={false}
                        onDelete={onDeleteAccount}
                        onInspectRpc={onInspectRpc}
                        onSwitchAccount={onSwitchAccount}
                      />
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </section>
          </div>
        )}
      </div>
    </div>
  );
}
