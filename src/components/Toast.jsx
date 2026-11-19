import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, AlertCircle, Info } from 'lucide-react';

export default function Toast({ toast }) {
  if (!toast) return null;

  const isError = toast.type === 'error';
  const isSuccess = toast.type === 'success';

  return (
    <AnimatePresence>
      <div className="fixed bottom-6 right-6 z-50 pointer-events-none">
        <motion.div
          initial={{ opacity: 0, y: 16, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 10, scale: 0.95 }}
          className={`px-4 py-3 rounded-2xl shadow-2xl backdrop-blur-2xl border flex items-center gap-3 text-xs font-medium font-mono ${
            isError
              ? 'bg-red-950/90 text-red-200 border-red-500/40'
              : isSuccess
              ? 'bg-[#101918]/90 text-emerald-200 border-emerald-500/40'
              : 'bg-[#121622]/90 text-cyan/90 border-cyan/40'
          }`}
        >
          {isError && <AlertCircle className="w-4 h-4 text-red-400" />}
          {isSuccess && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
          {!isError && !isSuccess && <Info className="w-4 h-4 text-cyan" />}
          <span>{toast.message}</span>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

