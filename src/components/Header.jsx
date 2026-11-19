import React from 'react';
import { RotateCw, Moon, Sun, Layers, Sunrise, Coffee, Sparkles } from 'lucide-react';

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
    <header className="h-auto min-h-[68px] py-2 px-3 sm:px-8 flex items-center justify-between border-b border-white/[0.06] bg-[#090A0F]/80 backdrop-blur-2xl z-40 sticky top-0 flex-shrink-0">
      {/* Brand Left */}
      <div className="flex items-center gap-2.5 sm:gap-3.5">
        <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-[#121622] border border-cyan/30 flex items-center justify-center shadow-cyan-glow relative overflow-hidden group shrink-0">
          <div className="absolute inset-0 bg-gradient-to-tr from-cyan/20 to-transparent opacity-60 group-hover:opacity-100 transition-opacity" />
          <Layers className="w-4 h-4 sm:w-5 sm:h-5 text-cyan relative z-10" />
        </div>
        <div>
          <div className="flex items-center gap-1.5 sm:gap-2">
            <h1 className="text-sm sm:text-base font-bold tracking-tight text-white whitespace-nowrap">AgyFlow</h1>
          </div>
          <p className="text-[10px] sm:text-[11px] text-slate-400 font-medium hidden sm:flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan animate-pulse shadow-sm shadow-cyan" />
            Multi-Account Token Daemon
          </p>
        </div>
      </div>

      {/* Actions Right */}
      <div className="flex items-center gap-1.5 sm:gap-3">
        {/* Master Badge (Hidden on mobile / tablet width to prevent clutter) */}
        <div className="hidden lg:flex px-3.5 py-1.5 rounded-full bg-white/[0.03] border border-white/[0.07] text-xs font-mono text-slate-300 items-center gap-2 shadow-inner">
          <span className="text-slate-500 text-[11px]">Master:</span>
          <span className="text-slate-200 font-semibold max-w-[150px] truncate">{masterEmail}</span>
        </div>

        {/* Theme Cycle Button — cycles: dark → oled → snow → latte */}
        <button
          onClick={onToggleTheme}
          className="h-8 sm:h-9 px-2 sm:px-3 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-xs font-medium text-slate-300 flex items-center gap-1.5 sm:gap-2 transition-all hover:border-white/20 active:scale-95"
          title="Cycle theme"
        >
          {theme === 'oled' && (
            <><Sun className="w-3.5 h-3.5 text-amber shrink-0" /><span className="hidden sm:inline">OLED</span></>
          )}
          {theme === 'dark' && (
            <><Moon className="w-3.5 h-3.5 text-cyan shrink-0" /><span className="hidden sm:inline">Dark</span></>
          )}
          {theme === 'snow' && (
            <><Sparkles className="w-3.5 h-3.5 text-purple-600 shrink-0" /><span className="hidden sm:inline font-semibold text-purple-700">Violet</span></>
          )}
          {theme === 'latte' && (
            <><Coffee className="w-3.5 h-3.5 text-amber-600 shrink-0" /><span className="hidden sm:inline text-stone-700">Latte</span></>
          )}
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400 shrink-0" />
        </button>

        {/* Refresh Icon Button */}
        <button
          onClick={onRefresh}
          disabled={isSyncing}
          className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] flex items-center justify-center text-slate-300 hover:text-white transition-all hover:border-white/20 active:scale-95 disabled:opacity-50 shrink-0"
          title="Sync & Refresh Quotas"
        >
          <RotateCw className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${isSyncing ? 'animate-spin text-cyan' : ''}`} />
        </button>

        {/* + G Add Button (Google OAuth trigger) */}
        <button
          onClick={onOpenAddModal}
          className="h-8 sm:h-9 px-2.5 sm:px-3.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.12] hover:border-cyan/40 text-xs font-semibold text-white flex items-center gap-1.5 sm:gap-2 transition-all shadow-glass active:scale-95 group shrink-0"
        >
          <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"/>
            <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"/>
            <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.98 0 12s.45 3.82 1.25 5.42l4.03-3.15z"/>
            <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"/>
          </svg>
          <span className="group-hover:text-cyan transition-colors hidden sm:inline">Add</span>
        </button>

        {/* Master User Avatar */}
        <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-gradient-to-tr from-cyan/40 via-amber/30 to-purple-500/40 p-[1.5px] shadow-glass cursor-pointer hover:scale-105 transition-transform overflow-hidden shrink-0">
          {masterAvatarUrl ? (
            <img src={masterAvatarUrl} alt="Master Google Profile" className="w-full h-full rounded-full object-cover" />
          ) : (
            <div className="w-full h-full rounded-full bg-[#12151E] flex items-center justify-center">
              <span className="text-[10px] sm:text-[11px] font-bold text-slate-200">A</span>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

