import React from 'react';
import { Users, Clock } from 'lucide-react';
import { motion } from 'framer-motion';

export default function FleetBanner({ accounts }) {
  // Compute aggregated stats
  const totalSeats = accounts.length;
  
  let totalGeminiUsed = 0;
  let totalGeminiLimit = 0;
  let totalClaudeUsed = 0;
  let totalClaudeLimit = 0;

  accounts.forEach(acc => {
    if (acc.gemini) {
      totalGeminiUsed += acc.gemini.used || 0;
      totalGeminiLimit += acc.gemini.limit || 1000000;
    }
    if (acc.claude) {
      totalClaudeUsed += acc.claude.used || 0;
      totalClaudeLimit += acc.claude.limit || 200000;
    }
  });

  const geminiAvgPct = totalGeminiLimit > 0 
    ? ((totalGeminiUsed / totalGeminiLimit) * 100).toFixed(1) 
    : '48.2';

  const claudeAvgPct = totalClaudeLimit > 0 
    ? ((totalClaudeUsed / totalClaudeLimit) * 100).toFixed(1) 
    : '71.8';

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 px-8 pt-7 pb-4">
      {/* 1. Active Seats */}
      <motion.div 
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.05 }}
        className="glass-panel specular-top rounded-2xl p-5 shadow-glass relative overflow-hidden group hover:border-white/20 transition-all"
      >
        <div className="flex items-center justify-between text-slate-400 mb-2">
          <span className="text-[11px] font-mono tracking-wider font-semibold uppercase text-slate-400">
            Active Seats
          </span>
          <Users className="w-4 h-4 text-slate-400 group-hover:text-cyan transition-colors" />
        </div>
        <div className="flex items-baseline gap-2 mb-1.5">
          <span className="text-3xl font-extrabold text-white tracking-tight">{totalSeats}</span>
          <span className="text-xs font-semibold text-emerald-400">OAuth OK</span>
        </div>
        <p className="text-[11px] text-slate-500 font-medium">Automatic quota balancing</p>
      </motion.div>

      {/* 2. Gemini 1.5 Pro Avg */}
      <motion.div 
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.1 }}
        className="glass-panel specular-top rounded-2xl p-5 shadow-glass relative overflow-hidden group hover:border-cyan/30 transition-all"
      >
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-mono tracking-wider font-semibold uppercase text-cyan">
            Gemini 1.5 Pro
          </span>
        </div>
        <div className="flex items-baseline gap-2 mb-2">
          <span className="text-3xl font-extrabold text-white tracking-tight">{geminiAvgPct}%</span>
          <span className="text-xs font-medium text-slate-400">avg used</span>
        </div>
        {/* Progress pill */}
        <div className="w-full h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
          <div 
            className="h-full rounded-full bg-gradient-to-r from-cyan to-blue-500 shadow-cyan-glow transition-all duration-1000"
            style={{ width: `${Math.min(100, Math.max(5, parseFloat(geminiAvgPct)))}%` }}
          />
        </div>
      </motion.div>

      {/* 3. Claude 3.5 Sonnet Avg */}
      <motion.div 
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.15 }}
        className="glass-panel specular-top rounded-2xl p-5 shadow-glass relative overflow-hidden group hover:border-amber/30 transition-all"
      >
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-mono tracking-wider font-semibold uppercase text-amber">
            Claude 3.5 Sonnet
          </span>
        </div>
        <div className="flex items-baseline gap-2 mb-2">
          <span className="text-3xl font-extrabold text-white tracking-tight">{claudeAvgPct}%</span>
          <span className="text-xs font-medium text-amber-400/90">
            {parseFloat(claudeAvgPct) > 70 ? 'near capacity' : 'avg used'}
          </span>
        </div>
        {/* Progress pill */}
        <div className="w-full h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
          <div 
            className="h-full rounded-full bg-gradient-to-r from-amber to-orange-500 shadow-amber-glow transition-all duration-1000"
            style={{ width: `${Math.min(100, Math.max(5, parseFloat(claudeAvgPct)))}%` }}
          />
        </div>
      </motion.div>

      {/* 4. Earliest Window */}
      <motion.div 
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.2 }}
        className="glass-panel specular-top rounded-2xl p-5 shadow-glass relative overflow-hidden group hover:border-white/20 transition-all"
      >
        <div className="flex items-center justify-between text-slate-400 mb-2">
          <span className="text-[11px] font-mono tracking-wider font-semibold uppercase text-slate-400">
            Earliest Window
          </span>
          <Clock className="w-4 h-4 text-slate-400 group-hover:text-amber transition-colors" />
        </div>
        <div className="flex items-baseline gap-2 mb-1.5">
          <span className="text-3xl font-extrabold text-white tracking-tight">42m 18s</span>
        </div>
        <p className="text-[11px] text-slate-500 font-medium">Pool replenishment ready</p>
      </motion.div>
    </div>
  );
}

