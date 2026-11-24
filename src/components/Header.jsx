import React from 'react';
import { RotateCw, Moon, Sun, Layers, Coffee, Sparkles, User } from 'lucide-react';

export default function Header({ 
  theme, 
  onToggleTheme, 
  onRefresh, 
  isSyncing, 
  onOpenAddModal,
  masterEmail = 'No account connected',
  masterAvatarUrl = ''
}) {
  return (
    <header className="h-auto min-h-[68px] py-2 px-3 sm:px-8 flex items-center justify-between border-b border-white/[0.06] bg-[#090A0F]/85 backdrop-blur-2xl z-40 sticky top-0 flex-shrink-0 transition-colors">
      {/* Brand Left */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-purple-800/40 via-[#18132B] to-indigo-700/30 border border-purple-500/40 flex items-center justify-center shadow-lg shadow-purple-900/30 relative overflow-hidden group shrink-0">
          <div className="absolute inset-0 bg-gradient-to-tr from-purple-500/20 to-cyan/20 opacity-60 group-hover:opacity-100 transition-opacity" />
          <Layers className="w-5 h-5 text-purple-400 relative z-10" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-base sm:text-lg font-bold tracking-tight text-white whitespace-nowrap">
              AgyFlow
            </h1>
            <span className="version-badge px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-purple-900/40 text-purple-300 border border-purple-500/30">
              v1.1.2
            </span>
          </div>
          <p className="text-[11px] text-slate-400 font-medium hidden sm:block">
            Multi Antigravity Account Handling
          </p>
        </div>
      </div>

      {/* Actions Right */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Theme Cycle Button */}
        <button
          onClick={onToggleTheme}
          className="h-8 sm:h-9 px-2.5 sm:px-3 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-xs font-medium text-slate-300 flex items-center gap-1.5 transition-all hover:border-white/20 active:scale-95"
          title="Switch theme"
        >
          {theme === 'oled' && (
            <><Sun className="w-3.5 h-3.5 text-amber shrink-0" /><span>OLED</span></>
          )}
          {theme === 'dark' && (
            <><Moon className="w-3.5 h-3.5 text-cyan shrink-0" /><span>Dark</span></>
          )}
          {theme === 'snow' && (
            <><Sparkles className="w-3.5 h-3.5 text-purple-400 shrink-0" /><span>Violet</span></>
          )}
          {theme === 'latte' && (
            <><Coffee className="w-3.5 h-3.5 text-amber-500 shrink-0" /><span>Latte</span></>
          )}
        </button>

        {/* Refresh Icon Button */}
        <button
          onClick={onRefresh}
          disabled={isSyncing}
          className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] flex items-center justify-center text-slate-300 hover:text-white transition-all hover:border-white/20 active:scale-95 disabled:opacity-50 shrink-0"
          title="Sync & Refresh Quotas"
        >
          <RotateCw className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${isSyncing ? 'animate-spin text-purple-400' : ''}`} />
        </button>

        {/* Purple G Add Button (Directly matching screenshot) */}
        <button
          onClick={onOpenAddModal}
          className="h-8 sm:h-9 px-3 sm:px-4 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 border border-purple-400/40 text-xs font-bold text-white flex items-center gap-1.5 shadow-lg shadow-purple-600/30 transition-all active:scale-95 shrink-0"
        >
          <span className="font-bold text-xs bg-white text-purple-700 w-4 h-4 rounded-full flex items-center justify-center text-[10px]">G</span>
          <span>Add</span>
        </button>

        {/* Master User Avatar */}
        <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-white/[0.06] border border-white/10 p-[1.5px] cursor-pointer hover:scale-105 transition-transform overflow-hidden shrink-0 flex items-center justify-center text-slate-300">
          {masterAvatarUrl ? (
            <img src={masterAvatarUrl} alt="Profile" className="w-full h-full rounded-full object-cover" />
          ) : (
            <User className="w-4 h-4 text-slate-400" />
          )}
        </div>
      </div>
    </header>
  );
}
