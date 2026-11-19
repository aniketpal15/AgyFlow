const fs = require('fs');
const path = require('path');
const electron = require('electron');

const app = electron.app;
const safeStorage = electron.safeStorage;

// Database file in data/ folder
const projectRoot = path.join(__dirname, '..');
const userDataJsFile = path.join(projectRoot, 'data', 'userData.js');

function dataDir() {
  try {
    if (app && typeof app.getPath === 'function') {
      return path.join(app.getPath('userData'), 'antigravity-accounts');
    }
  } catch {}
  return path.join(process.env.APPDATA || process.env.USERPROFILE, '.antigravity-accounts');
}

function accountsFile() { return path.join(dataDir(), 'accounts.json'); }
function secretsFile() { return path.join(dataDir(), 'secrets.bin'); }

function isGhost(acc) {
  const e = acc?.email;
  if (!e || typeof e !== 'string') return true;
  if (!e.includes('@') || !e.includes('.')) return true;
  if (/^antigravity-user/i.test(e)) return true;
  return false;
}

function normalizeFleet(raw) {
  let list = [];
  if (Array.isArray(raw)) list = raw;
  else if (raw && typeof raw === 'object' && raw.id) list = [raw];

  return list.filter(a => !isGhost(a));
}

function readJson(file, fallback) {
  try {
    return fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(value, null, 2), 'utf8');
}

function formatReset(value) {
  if (!value) return 'Ready';
  const ms = new Date(value).getTime() - Date.now();
  if (!Number.isFinite(ms)) return String(value);
  if (ms <= 0) return 'Ready';
  const totalMinutes = Math.ceil(ms / 60000);
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

// ponytail: auto-restore expired quotas to 100% and update live countdowns for standby accounts
function applyStandbyQuotaRestoration(fleet) {
  const now = Date.now();
  let changed = false;

  for (const acc of fleet) {
    if (acc.isActiveInIde) continue;
    if (!Array.isArray(acc.quotas)) continue;

    for (const q of acc.quotas) {
      if (!q.resetTime) {
        if (q.remainingPercent === 100 && q.resetCountdown !== 'Ready') {
          q.resetCountdown = 'Ready';
          changed = true;
        }
        continue;
      }
      const targetMs = new Date(q.resetTime).getTime();
      if (!Number.isFinite(targetMs)) continue;

      if (now >= targetMs) {
        // Expiration reached: automatically reset token quota to 100%
        if (q.remainingPercent !== 100 || q.resetCountdown !== 'Ready' || q.resetTime !== null) {
          q.remainingPercent = 100;
          q.resetCountdown = 'Ready';
          q.resetTime = null;
          changed = true;
        }
      } else {
        // Still active: dynamically recalculate remaining countdown
        const liveCountdown = formatReset(q.resetTime);
        if (q.resetCountdown !== liveCountdown) {
          q.resetCountdown = liveCountdown;
          changed = true;
        }
      }
    }
  }

  return changed;
}

function loadFleet() {
  let fleet = [];
  // 1. First priority: read project root userData.js database
  if (fs.existsSync(userDataJsFile)) {
    try {
      delete require.cache[require.resolve(userDataJsFile)];
      const loaded = require(userDataJsFile);
      fleet = normalizeFleet(loaded);
    } catch (e) {
      console.warn('[telemetry] Error loading userData.js:', e.message);
    }
  }

  // 2. Second priority: AppData accounts.json
  if (fleet.length === 0) {
    const raw = readJson(accountsFile(), []);
    fleet = normalizeFleet(raw);
  }

  // Automatically refresh standby accounts comparing current date with refresh date
  if (fleet.length > 0) {
    const changed = applyStandbyQuotaRestoration(fleet);
    if (changed) {
      saveFleet(fleet);
    }
  }

  return fleet;
}

function saveFleet(accounts) {
  const cleanFleet = normalizeFleet(accounts);

  // 1. Write formatted JS database file to userData.js in project root
  try {
    const header = `/**\n * Antigravity ID • Local User Database\n * Auto-synced with Antigravity IDE accounts.\n * Edit only via the application UI.\n * Last updated: ${new Date().toISOString()}\n */\n`;
    const content = header + 'module.exports = ' + JSON.stringify(cleanFleet, null, 2) + ';\n';
    fs.writeFileSync(userDataJsFile, content, 'utf8');
  } catch (e) {
    console.warn('[telemetry] Unable to write userData.js:', e.message);
  }

  // 2. Write JSON copy to AppData accounts.json (for packaged Electron builds)
  writeJson(accountsFile(), cleanFleet);
}

function loadSecrets() {
  try {
    if (!fs.existsSync(secretsFile())) return {};
    const raw = fs.readFileSync(secretsFile());
    if (safeStorage && typeof safeStorage.isEncryptionAvailable === 'function' && safeStorage.isEncryptionAvailable()) {
      return JSON.parse(safeStorage.decryptString(raw));
    }
    // Fallback if safeStorage not active (e.g. dev/CLI test)
    return JSON.parse(raw.toString('utf8'));
  } catch {
    return {};
  }
}

function saveSecrets(secrets) {
  fs.mkdirSync(dataDir(), { recursive: true });
  const str = JSON.stringify(secrets);
  if (safeStorage && typeof safeStorage.isEncryptionAvailable === 'function' && safeStorage.isEncryptionAvailable()) {
    fs.writeFileSync(secretsFile(), safeStorage.encryptString(str));
  } else {
    fs.writeFileSync(secretsFile(), Buffer.from(str, 'utf8'));
  }
}

function getTokens(id) {
  return loadSecrets()[id] || null;
}

function setTokens(id, tokens) {
  const all = loadSecrets();
  all[id] = tokens;
  saveSecrets(all);
}

function deleteTokens(id) {
  const all = loadSecrets();
  delete all[id];
  saveSecrets(all);
}

module.exports = { 
  loadFleet, 
  saveFleet, 
  getTokens, 
  setTokens, 
  deleteTokens, 
  applyStandbyQuotaRestoration, 
  formatReset 
};
