import React, { useState, useEffect } from 'react';
import { LayoutGrid } from 'lucide-react';

export default function StatusBar({ daemonPort = 5892 }) {
  const [timeStr, setTimeStr] = useState(() => {
    return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  });

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeStr(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <footer className="h-9 px-4 sm:px-8 border-t border-black/5 dark:border-white/[0.06] bg-white/85 dark:bg-[#07090F]/90 backdrop-blur-xl flex items-center justify-between text-[11px] font-mono text-slate-500 dark:text-slate-400 z-30 flex-shrink-0 select-none transition-colors">
      {/* Left: Port telemetry */}
      <div className="flex items-center gap-2">
        <LayoutGrid className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400 shrink-0" />
        <span className="text-slate-600 dark:text-slate-400">RPC Daemon Port:</span>
        <span className="text-purple-700 dark:text-purple-300 font-semibold">{daemonPort}</span>
      </div>

      {/* Right: Health & Engine sync */}
      <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
        <span className="text-emerald-600 dark:text-emerald-400 font-medium">Daemon Synced</span>
        <span className="text-slate-300 dark:text-slate-600">·</span>
        <span className="text-slate-700 dark:text-slate-300">ENGIN 80%</span>
        <span className="text-slate-300 dark:text-slate-600">·</span>
        <span className="text-slate-900 dark:text-slate-200 font-semibold">{timeStr}</span>
      </div>
    </footer>
  );
}
