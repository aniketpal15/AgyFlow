const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('path');
const telemetry = require('./telemetry.cjs');
const oauth = require('./oauth.cjs');

// ── Memory Footprint Reduction ──────────────────────────────────────────────
// Disable unused Chromium subsystems before the app is ready.
// None of these affect any app functionality — AgyFlow has no video, audio,
// GPU compositing, spell-check, PDF, or print requirements.
app.commandLine.appendSwitch('disable-features',
  'VizDisplayCompositor,TranslateUI,MediaRouter,OptimizationGuideModelDownloading,CalculateNativeWinOcclusion'
);
app.commandLine.appendSwitch('disable-gpu');           // no GPU compositing needed
app.commandLine.appendSwitch('disable-gpu-sandbox');
app.commandLine.appendSwitch('disable-software-rasterizer');
app.commandLine.appendSwitch('disable-dev-shm-usage');  // avoids /dev/shm OOM on Linux, harmless on Windows
app.commandLine.appendSwitch('js-flags', '--max-old-space-size=128'); // cap V8 heap to 128 MB
// ────────────────────────────────────────────────────────────────────────────

// Prevent unexpected process exits on async/IPC errors or terminal console signals
process.on('uncaughtException', (err) => console.error('[main] uncaughtException:', err));
process.on('unhandledRejection', (reason) => console.error('[main] unhandledRejection:', reason));

// Ensure the token daemon does not exit if the parent terminal/IDE closes
if (process.platform === 'win32') {
  process.on('SIGBREAK', () => {});
  process.on('SIGINT', () => {});
  process.on('SIGHUP', () => {});
  process.on('SIGTERM', () => {});
}

let mainWindow = null;

// ---------------------------------------------------------------
// Background credential watcher
// Polls Windows Credential Manager every 15s.
// Detects account IDENTITY change only — ignores writer_id (which
// Antigravity IDE updates on every credential write, causing false
// positives). Key is derived from the email decoded from id_token JWT.
// ---------------------------------------------------------------
let _watcherLastKey = null;   // last seen email identity
let _watcherInterval = null;

function _credEmailKey(cred) {
  if (!cred) return null;
  // 1. Plain field (fastest)
  if (cred.id_token_email && cred.id_token_email.includes('@')) {
    return cred.id_token_email.toLowerCase();
  }
  // 2. Decode Google JWT payload (Base64url → JSON → email)
  try {
    const parts = (cred.id_token || '').split('.');
    if (parts.length >= 2) {
      const pad = parts[1].replace(/-/g, '+').replace(/_/g, '/');
      const json = JSON.parse(Buffer.from(pad, 'base64').toString('utf8'));
      if (json.email && json.email.includes('@')) return json.email.toLowerCase();
    }
  } catch (_) { /* ignore */ }
  return null; // unknown — don't trigger sync
}

async function startCredentialWatcher() {
  // Prime the initial key — read once so the very first poll doesn't fire spuriously
  try {
    const initial = oauth.readLocalAntigravityCredential();
    _watcherLastKey = _credEmailKey(initial);
  } catch (_) { /* ignore */ }

  _watcherInterval = setInterval(async () => {
    if (!mainWindow || mainWindow.isDestroyed()) return;
    try {
      const cred = oauth.readLocalAntigravityCredential();
      const key = _credEmailKey(cred);
      // Only sync when the signed-in EMAIL changes (account switch).
      // writer_id changes are ignored — they happen on every IDE credential refresh
      // and do NOT mean a new account was added.
      if (key && key !== _watcherLastKey) {
        _watcherLastKey = key;
        console.log('[watcher] IDE account identity changed →', key, '— syncing…');
        const updated = await oauth.syncActiveIdeAccount();
        if (!mainWindow || mainWindow.isDestroyed()) return;
        mainWindow.webContents.send('credential-updated', updated);
        return;
      }

      // Automatically refresh standby accounts if resetTime has expired (or countdown ticks)
      const currentFleet = telemetry.loadFleet();
      const hasRestored = telemetry.applyStandbyQuotaRestoration(currentFleet);
      if (hasRestored) {
        telemetry.saveFleet(currentFleet);
        if (!mainWindow || mainWindow.isDestroyed()) return;
        mainWindow.webContents.send('credential-updated', currentFleet);
      }
    } catch (e) {
      console.warn('[watcher] poll error (non-fatal):', e.message);
    }
  }, 15000); // 15 seconds
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1240,
    height: 840,
    minWidth: 360,
    minHeight: 480,
    backgroundColor: '#090A0F',
    title: 'AgyFlow',
    icon: path.join(__dirname, '../public/icon.ico'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      backgroundThrottling: true,       // throttle timers & animations when minimized/hidden
      spellcheck: false,                 // no text input fields needing spellcheck
      enableWebSQL: false,               // not using WebSQL
      disableHtmlFullscreenWindowResize: true
    },
    autoHideMenuBar: true,
    show: false
  });

  const isDev = process.env.NODE_ENV === 'development';
  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
  } else {
    mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    startCredentialWatcher(); // start background watcher after window is shown

    // Run one GC pass after startup to release boot-time allocations
    if (global.gc) global.gc();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// IPC Handlers
ipcMain.handle('get-accounts', async () => {
  // On load: sync active IDE account (ghost-safe), then return full fleet
  try {
    // First do a lightweight token sync for the active IDE account only — does NOT wipe fleet
    const cred = (() => {
      try { return require('./oauth.cjs').getActiveLocalAccountEmail ? null : null; } catch { return null; }
    })();
    void cred; // unused — just trigger the guard below

    // Sync only updates/adds the active IDE account; existing fleet is preserved
    const updated = await oauth.syncActiveIdeAccount();
    return updated;
  } catch (e) {
    console.warn('Initial active account sync warning:', e.message);
    // Fallback: just refresh what we have on disk without syncing IDE
    try { return await oauth.refreshAll(); } catch { return telemetry.loadFleet(); }
  }
});

ipcMain.handle('import-local-account', async () => {
  return oauth.syncActiveIdeAccount();
});

ipcMain.handle('switch-active-account', async (_, id) => {
  console.log('[IPC] switch-active-account called with id:', id);
  try {
    const result = await oauth.switchActiveAccount(id);
    console.log('[IPC] switch-active-account succeeded');
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('credential-updated', result);
    }
    return result;
  } catch (e) {
    console.error('[IPC] switch-active-account FAILED:', e.message, e.stack);
    throw e;
  }
});

ipcMain.handle('sync-tokens', async () => {
  const result = await oauth.syncActiveIdeAccount();
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('credential-updated', result);
  }
  return result;
});

ipcMain.handle('get-oauth-config', async () => {
  return oauth.loadOAuthConfig();
});

ipcMain.handle('save-oauth-config', async (_, config) => {
  return oauth.saveOAuthConfig(config);
});

ipcMain.handle('delete-account', async (_, id) => {
  const accounts = telemetry.loadFleet();
  telemetry.deleteTokens(id);
  const updated = accounts.filter(a => a.id !== id);
  telemetry.saveFleet(updated);
  return updated;
});

ipcMain.handle('toggle-theme', async (_, theme) => {
  return theme;
});

// App Lifecycle
app.whenReady().then(createWindow);

app.on('browser-window-blur', () => {
  // Trigger GC when user switches away from the app to free idle memory
  if (global.gc) global.gc();
});

app.on('window-all-closed', () => {
  if (_watcherInterval) clearInterval(_watcherInterval); // stop watcher on quit
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
