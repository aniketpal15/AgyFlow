const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  getAccounts: () => ipcRenderer.invoke('get-accounts'),
  importLocalAccount: () => ipcRenderer.invoke('import-local-account'),
  switchActiveAccount: (id) => ipcRenderer.invoke('switch-active-account', id),
  debugSwitch: (id) => ipcRenderer.invoke('debug-switch', id),
  syncTokens: () => ipcRenderer.invoke('sync-tokens'),
  deleteAccount: (id) => ipcRenderer.invoke('delete-account', id),
  getOAuthConfig: () => ipcRenderer.invoke('get-oauth-config'),
  saveOAuthConfig: (config) => ipcRenderer.invoke('save-oauth-config', config),
  toggleTheme: (theme) => ipcRenderer.invoke('toggle-theme', theme),
  onOAuthComplete: (callback) => {
    ipcRenderer.on('oauth-complete', (_, accounts) => callback(accounts));
  },
  onCredentialUpdated: (callback) => {
    ipcRenderer.on('credential-updated', (_, accounts) => callback(accounts));
  }
});
