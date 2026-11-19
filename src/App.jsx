import React, { useState, useEffect, useCallback } from 'react';
import Header from './components/Header';
import AccountGrid from './components/AccountGrid';
import SplashLoader from './components/SplashLoader';
import SyncOverlay from './components/SyncOverlay';
import AddAccountModal from './components/AddAccountModal';
import RpcModal from './components/RpcModal';
import Toast from './components/Toast';
import { useAccounts } from './hooks/useAccounts';

export default function App() {
  const [theme, setTheme] = useState(() => localStorage.getItem('agy_theme') || 'snow');
  const [showSplash, setShowSplash] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [rpcAccount, setRpcAccount] = useState(null);
  const [toast, setToast] = useState(null);

  const showToast = useCallback((message, type = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  }, []);

  const { 
    accounts, 
    setAccounts,
    isSyncing, 
    importLocalAccount,
    switchActiveAccount,
    deleteAccount, 
    triggerSync 
  } = useAccounts(showToast);

  const handleOpenAddModal = () => {
    setShowAddModal(true);
  };

  // Initial Splash Screen Timer
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowSplash(false);
    }, 1200);
    return () => clearTimeout(timer);
  }, []);

  // Theme synchronization — 4 themes: dark, oled, snow, latte
  useEffect(() => {
    const root = document.documentElement;
    // Remove all theme classes first
    root.classList.remove('theme-oled', 'theme-snow', 'theme-latte');
    if (theme !== 'dark') root.classList.add(`theme-${theme}`);
    localStorage.setItem('agy_theme', theme);
  }, [theme]);

  const THEMES = ['dark', 'oled', 'snow', 'latte'];
  const THEME_LABELS = { dark: 'Dark Obsidian', oled: 'OLED Black', snow: 'Violet Light', latte: 'Warm Latte' };

  const toggleTheme = () => {
    const next = THEMES[(THEMES.indexOf(theme) + 1) % THEMES.length];
    setTheme(next);
    showToast(`Switched to ${THEME_LABELS[next]}`, 'info');
  };

  const activeMaster = accounts.find(a => a.isActiveInIde) || accounts[0];

  return (
    <div className={`h-screen w-screen flex flex-col overflow-hidden transition-colors duration-400 ${
      theme === 'oled' ? 'bg-black' : theme === 'snow' ? 'bg-[#F4F5FB]' : theme === 'latte' ? 'bg-[#FDF9F3]' : 'bg-[#090A0F]'
    } ${theme === 'snow' || theme === 'latte' ? 'light-theme' : ''} theme-${theme}`}>
      {/* 1. Geometric Pulse Splash Loader on App Launch */}
      <SplashLoader isVisible={showSplash} />

      {/* 2. Frosted Glass Sync Overlay during Token Pool Refresh */}
      <SyncOverlay isSyncing={isSyncing} />

      {/* 3. Top Navigation Bar (Header) */}
      <Header
        theme={theme}
        onToggleTheme={toggleTheme}
        onRefresh={triggerSync}
        isSyncing={isSyncing}
        onOpenAddModal={handleOpenAddModal}
        masterEmail={activeMaster?.email || 'No account connected'}
        masterAvatarUrl={activeMaster?.avatarUrl || ''}
      />

      {/* 4. Main Momentum Scroll Account Grid */}
      <AccountGrid
        accounts={accounts}
        onDeleteAccount={deleteAccount}
        onInspectRpc={(acc) => setRpcAccount(acc)}
        onSwitchAccount={switchActiveAccount}
        onImportAccount={importLocalAccount}
      />

      {/* 5. Add Account Modal */}
      <AddAccountModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onImportAccount={importLocalAccount}
        accounts={accounts}
      />

      {/* 6. Deep RPC Telemetry Modal */}
      <RpcModal
        isOpen={Boolean(rpcAccount)}
        account={rpcAccount}
        onClose={() => setRpcAccount(null)}
      />

      {/* 7. Notifications Toast Bar */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}
