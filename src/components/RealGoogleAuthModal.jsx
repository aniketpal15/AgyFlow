import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Key, ShieldCheck, ExternalLink } from 'lucide-react';

export default function RealGoogleAuthModal({ isOpen, onClose, onStartOAuth }) {
  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => { if (isOpen) window.electronAPI?.getOAuthConfig?.().then(config => { setClientId(config?.clientId || ''); setClientSecret(config?.clientSecret || ''); }); }, [isOpen]);
  const submit = async event => { event.preventDefault(); setError(''); setIsSaving(true); try { await window.electronAPI.saveOAuthConfig({ clientId, clientSecret }); onClose(); onStartOAuth(); } catch (err) { setError(err.message || 'Could not save OAuth configuration.'); } finally { setIsSaving(false); } };
  return <AnimatePresence>{isOpen && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-black/85 backdrop-blur-2xl flex items-center justify-center p-4">
    <motion.form onSubmit={submit} initial={{ scale: .96, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: .96, opacity: 0 }} className="w-full max-w-lg rounded-3xl bg-[#111318] border border-white/10 shadow-2xl p-7 relative">
      <button type="button" onClick={onClose} className="absolute right-5 top-5 text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
      <div className="flex gap-3 mb-5"><div className="w-11 h-11 rounded-2xl bg-[#181b22] grid place-items-center"><Key className="text-cyan w-5 h-5" /></div><div><h3 className="font-bold text-white">Connect a Google account</h3><p className="text-xs text-slate-400 mt-1">OAuth 2.0 with PKCE — no Chrome-profile importing or token simulation.</p></div></div>
      <p className="text-xs text-slate-400 leading-relaxed mb-4">Create a <strong>Desktop app</strong> OAuth client in Google Cloud. Desktop clients support the loopback redirect used by this app; it selects a free local port.</p>
      <label className="block text-xs text-slate-300 mb-1">Google OAuth client ID</label><input required value={clientId} onChange={e => setClientId(e.target.value)} placeholder="…apps.googleusercontent.com" className="w-full p-3 rounded-xl bg-white/[.04] border border-white/10 text-xs text-white font-mono focus:outline-none focus:border-cyan/50" />
      <label className="block text-xs text-slate-300 mb-1 mt-3">Client secret <span className="text-slate-500">(optional for PKCE)</span></label><input type="password" value={clientSecret} onChange={e => setClientSecret(e.target.value)} className="w-full p-3 rounded-xl bg-white/[.04] border border-white/10 text-xs text-white font-mono focus:outline-none focus:border-cyan/50" />
      {error && <p role="alert" className="text-xs text-red-400 mt-3">{error}</p>}
      <div className="flex justify-between items-center mt-5"><a className="text-xs text-cyan flex gap-1" href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noreferrer">Google Cloud Console <ExternalLink className="w-3 h-3" /></a><button disabled={isSaving} className="px-4 py-2 rounded-xl bg-cyan text-black text-xs font-bold disabled:opacity-50">{isSaving ? 'Starting…' : 'Authorize with Google'}</button></div>
      <p className="text-[11px] text-slate-500 mt-5 flex gap-1"><ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> Tokens are encrypted using your operating-system account and stay local.</p>
    </motion.form>
  </motion.div>}</AnimatePresence>;
}
