import { useState, useEffect, useCallback, useRef } from 'react';

function formatClientReset(isoString) {
  if (!isoString) return 'Ready';
  const ms = new Date(isoString).getTime() - Date.now();
  if (!Number.isFinite(ms)) return String(isoString);
  if (ms <= 0) return 'Ready';
  const totalMinutes = Math.ceil(ms / 60000);
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

export function useAccounts(showToast) {
  const [accounts, setAccounts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isWaitingForChrome, setIsWaitingForChrome] = useState(false);

  const toastRef = useRef(showToast);
  toastRef.current = showToast;

  const fetchAccounts = useCallback(async () => {
    setIsSyncing(true);

    // Safety timeout: guaranteed to never stay stuck on loading screen
    const safetyTimer = setTimeout(() => {
      setIsSyncing(false);
      setIsLoading(false);
    }, 4000);

    try {
      if (window.electronAPI?.getAccounts) {
        const list = await window.electronAPI.getAccounts();
        if (Array.isArray(list)) {
          setAccounts(list);
        }
      }
    } catch (error) {
      console.warn('Unable to load local accounts:', error);
    } finally {
      clearTimeout(safetyTimer);
      setIsLoading(false);
      setIsSyncing(false);
    }
  }, []);

  useEffect(() => {
    fetchAccounts();

    if (window.electronAPI?.onOAuthComplete) {
      window.electronAPI.onOAuthComplete(updated => {
        setAccounts(updated);
        setIsWaitingForChrome(false);
        toastRef.current?.('Google account quota refreshed.', 'success');
      });
    }

    // Auto-push: fires when background watcher detects IDE switched account or quotas expired
    if (window.electronAPI?.onCredentialUpdated) {
      window.electronAPI.onCredentialUpdated(updated => {
        if (Array.isArray(updated) && updated.length > 0) {
          setAccounts(updated);
          toastRef.current?.('Antigravity fleet updated.', 'success');
        }
      });
    }
  }, [fetchAccounts]);

  // Live countdown timer: recalculates countdowns every 15s and flips expired quotas to 100%
  useEffect(() => {
    const timer = setInterval(() => {
      setAccounts(prev => {
        if (!Array.isArray(prev) || prev.length === 0) return prev;
        const now = Date.now();
        let changed = false;

        const next = prev.map(acc => {
          if (acc.isActiveInIde || !Array.isArray(acc.quotas)) return acc;
          let accChanged = false;
          const newQuotas = acc.quotas.map(q => {
            if (!q.resetTime) {
              if (q.remainingPercent === 100 && q.resetCountdown !== 'Ready') {
                accChanged = true;
                return { ...q, resetCountdown: 'Ready' };
              }
              return q;
            }
            const resetMs = new Date(q.resetTime).getTime();
            if (!Number.isFinite(resetMs)) return q;

            if (now >= resetMs) {
              // Time expired! Auto-restore to 100%
              if (q.remainingPercent !== 100 || q.resetCountdown !== 'Ready' || q.resetTime !== null) {
                accChanged = true;
                return { ...q, remainingPercent: 100, resetCountdown: 'Ready', resetTime: null };
              }
            } else {
              // Active: recalculate live countdown string
              const formatted = formatClientReset(q.resetTime);
              if (q.resetCountdown !== formatted) {
                accChanged = true;
                return { ...q, resetCountdown: formatted };
              }
            }
            return q;
          });

          if (accChanged) {
            changed = true;
            return { ...acc, quotas: newQuotas };
          }
          return acc;
        });

        if (changed) {
          // If any quota expired, sync with backend to persist changes to disk
          window.electronAPI?.syncTokens?.().catch(() => {});
          return next;
        }
        return prev;
      });
    }, 15000);

    return () => clearInterval(timer);
  }, []);

  const importLocalAccount = async () => {
    setIsSyncing(true);
    try {
      if (window.electronAPI?.importLocalAccount) {
        const updated = await window.electronAPI.importLocalAccount();
        setAccounts(updated);
        showToast?.('Imported active account from Antigravity IDE.', 'success');
      }
    } catch (error) {
      showToast?.(error.message || 'Could not import local account.', 'error');
    } finally {
      setIsSyncing(false);
    }
  };

  const switchActiveAccount = async (id) => {
    setIsSyncing(true);
    try {
      if (window.electronAPI?.switchActiveAccount) {
        const updated = await window.electronAPI.switchActiveAccount(id);
        setAccounts(updated);
        const target = updated.find(a => a.id === id);

        toastRef.current?.(
          `Switched to ${target?.email || 'account'}! Reload Window (Ctrl+R) in Antigravity IDE to activate.`,
          'success'
        );
      } else {
        toastRef.current?.('Electron API not available.', 'error');
      }
    } catch (error) {
      console.error('[switchActiveAccount] error:', error);
      toastRef.current?.(error?.message || 'Could not switch active account.', 'error');
    } finally {
      setIsSyncing(false);
    }
  };

  const deleteAccount = async (id) => {
    // Instant optimistic UI update: card vanishes with 0 delay
    setAccounts(prev => prev.filter(a => a.id !== id));
    try {
      const updated = await window.electronAPI.deleteAccount(id);
      if (Array.isArray(updated)) {
        setAccounts(updated);
      }
      showToast?.('Account removed from fleet.', 'info');
    } catch (error) {
      showToast?.(error.message || 'Failed to remove account.', 'error');
    }
  };

  const triggerSync = async () => {
    setIsSyncing(true);
    try {
      const updated = await window.electronAPI.syncTokens();
      setAccounts(updated);
      showToast?.('Live Antigravity quotas refreshed.', 'success');
    } catch (error) {
      showToast?.(error.message || 'Quota refresh failed.', 'error');
    } finally {
      setIsSyncing(false);
    }
  };

  return {
    accounts,
    setAccounts,
    isLoading,
    isSyncing,
    isWaitingForChrome,
    setIsWaitingForChrome,
    importLocalAccount,
    switchActiveAccount,
    deleteAccount,
    triggerSync
  };
}
