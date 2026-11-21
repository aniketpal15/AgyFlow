// vault-reader.cjs
// Reads account tokens from Antigravity IDE's SQLite global state DB.
// Uses AES-256-GCM with master key derived via DPAPI — same method as devhakeem5.antigravity-hub.
// Falls back to Electron safeStorage if DPAPI path fails.

'use strict';
const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');
const crypto = require('crypto');

const AGY_GLOBAL_STATE_DB = path.join(
  process.env.APPDATA || '',
  'Antigravity IDE', 'User', 'globalStorage', 'state.vscdb'
);

const AGY_LOCAL_STATE = path.join(
  process.env.APPDATA || '',
  'Antigravity IDE', 'Local State'
);

// ── Master key cache ──
let _masterKey = null;

function getMasterKey() {
  if (_masterKey) return _masterKey;
  if (!fs.existsSync(AGY_LOCAL_STATE)) return null;
  try {
    const localState = JSON.parse(fs.readFileSync(AGY_LOCAL_STATE, 'utf8'));
    const encryptedKey = Buffer.from(localState.os_crypt.encrypted_key, 'base64');
    const dpapiPayload = encryptedKey.slice(5); // strip 'DPAPI' prefix
    const b64Payload = dpapiPayload.toString('base64');

    // Write temp ps1 to avoid any quoting issues in the base64 string
    const tmpPs1 = path.join(process.env.TEMP || 'C:\\Temp', `agy_dpapi_${process.pid}.ps1`);
    const psScript = [
      'Add-Type -AssemblyName System.Security',
      `$b = [System.Convert]::FromBase64String('${b64Payload}')`,
      '$d = [System.Security.Cryptography.ProtectedData]::Unprotect($b, $null, [System.Security.Cryptography.DataProtectionScope]::CurrentUser)',
      '[System.Convert]::ToBase64String($d)'
    ].join('\r\n');
    fs.writeFileSync(tmpPs1, psScript, 'utf8');
    const masterKeyB64 = execSync(
      `powershell.exe -NoProfile -ExecutionPolicy Bypass -File "${tmpPs1}"`,
      { encoding: 'utf8', windowsHide: true, timeout: 10000 }
    ).trim();
    try { fs.unlinkSync(tmpPs1); } catch {}

    const key = Buffer.from(masterKeyB64, 'base64');
    if (key.length === 32) {
      _masterKey = key;
      return _masterKey;
    }
  } catch (e) {
    console.warn('[vault] Failed to derive master key via DPAPI:', e.message);
  }
  return null;
}

function decryptV10(buf, key) {
  if (!buf || buf.length < 19) return null;
  if (buf.slice(0, 3).toString('ascii') !== 'v10') return null;
  try {
    const iv = buf.slice(3, 15);
    const ciphertext = buf.slice(15, buf.length - 16);
    const tag = buf.slice(buf.length - 16);
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(tag);
    return decipher.update(ciphertext, null, 'utf8') + decipher.final('utf8');
  } catch {
    return null;
  }
}

/**
 * Async version — reads the vault token for a given email from state.vscdb.
 * Returns { accessToken, refreshToken, rawCredential } or null.
 */
async function readIdeVaultToken(email, safeStorage) {
  if (!fs.existsSync(AGY_GLOBAL_STATE_DB)) {
    console.warn('[vault] state.vscdb not found:', AGY_GLOBAL_STATE_DB);
    return null;
  }

  let initSqlJs;
  try {
    initSqlJs = require('sql.js');
  } catch (e) {
    console.warn('[vault] sql.js not available:', e.message);
    return null;
  }

  let db;
  try {
    const wasmPath = path.join(require.resolve('sql.js'), '..', '..', 'dist', 'sql-wasm.wasm');
    const SQL = await initSqlJs({ locateFile: () => wasmPath });
    const fileBuffer = fs.readFileSync(AGY_GLOBAL_STATE_DB);
    db = new SQL.Database(fileBuffer);
  } catch (e) {
    console.warn('[vault] Cannot open state.vscdb:', e.message);
    return null;
  }

  // Derive AES-256-GCM master key (DPAPI method — preferred)
  const masterKey = getMasterKey();

  function getRawValue(key) {
    try {
      const stmt = db.prepare('SELECT value FROM ItemTable WHERE key = ?');
      stmt.bind([key]);
      if (!stmt.step()) { stmt.free(); return null; }
      const row = stmt.getAsObject();
      stmt.free();
      return row.value ?? null;
    } catch (e) {
      console.warn('[vault] DB query error:', e.message);
      return null;
    }
  }

  function decryptValue(rawVal) {
    if (!rawVal) return null;
    // JSON {"type":"Buffer","data":[...]} — AES-256-GCM v10
    if (typeof rawVal === 'string' && rawVal.startsWith('{"type":"Buffer"')) {
      try {
        const parsed = JSON.parse(rawVal);
        if (parsed.type === 'Buffer' && Array.isArray(parsed.data)) {
          const buf = Buffer.from(parsed.data);
          // Try DPAPI-derived AES key first (fastest and most reliable)
          if (masterKey) {
            const dec = decryptV10(buf, masterKey);
            if (dec) return dec;
          }
          // Fallback: Electron safeStorage (only works in Electron main process)
          if (safeStorage?.isEncryptionAvailable?.()) {
            try { return safeStorage.decryptString(buf); } catch {}
          }
        }
      } catch {}
      return null;
    }
    // Plain string
    if (typeof rawVal === 'string') return rawVal;
    // Uint8Array from sql.js
    if (rawVal instanceof Uint8Array || Buffer.isBuffer(rawVal)) {
      const buf = Buffer.isBuffer(rawVal) ? rawVal : Buffer.from(rawVal);
      if (masterKey) {
        const dec = decryptV10(buf, masterKey);
        if (dec) return dec;
      }
      if (safeStorage?.isEncryptionAvailable?.()) {
        try { return safeStorage.decryptString(buf); } catch {}
      }
    }
    return null;
  }

  try {
    // ── Priority 1: boygr.antigravity-account-switcher vault (contains full Google id_token JWT) ──
    const vaultKey = `secret://{"extensionId":"boygr.antigravity-account-switcher","key":"antigravity.vault.token.${email}"}`;
    const vaultRaw = getRawValue(vaultKey);
    if (vaultRaw) {
      const vaultDecrypted = decryptValue(vaultRaw);
      if (vaultDecrypted) {
        try {
          const rec = JSON.parse(vaultDecrypted);
          let tokenObj = rec;
          if (rec.blobBase64) {
            try {
              tokenObj = JSON.parse(Buffer.from(rec.blobBase64, 'base64').toString('utf8'));
            } catch {}
          }
          const accessToken = tokenObj.access_token || tokenObj.token?.access_token || tokenObj.accessToken;
          const refreshToken = tokenObj.refresh_token || tokenObj.token?.refresh_token || tokenObj.refreshToken || null;
          const idToken = tokenObj.id_token || tokenObj.token?.id_token || null;
          if (accessToken) {
            console.log('[vault] ✓ Found token via boygr vault for:', email, 'hasIdToken:', !!idToken);
            return { accessToken, refreshToken, idToken, rawCredential: vaultDecrypted };
          }
        } catch {
          if (typeof vaultDecrypted === 'string' && vaultDecrypted.length > 20 && !vaultDecrypted.startsWith('{')) {
            console.log('[vault] ✓ Found bare access token via boygr vault for:', email);
            return { accessToken: vaultDecrypted, refreshToken: null, idToken: null, rawCredential: null };
          }
        }
      }
    }

    // ── Priority 2: devhakeem5.antigravity-hub ──
    const extId1 = 'devhakeem5.antigravity-hub';
    const rawAccess1 = getRawValue(`secret://{"extensionId":"${extId1}","key":"antigravity.account.${email}.accessToken"}`);
    if (rawAccess1) {
      const accessToken = decryptValue(rawAccess1);
      if (accessToken) {
        const rawRefresh1 = getRawValue(`secret://{"extensionId":"${extId1}","key":"antigravity.account.${email}.refreshToken"}`);
        const refreshToken = rawRefresh1 ? decryptValue(rawRefresh1) : null;
        console.log('[vault] ✓ Found token via devhakeem5 for:', email);
        return { accessToken, refreshToken, idToken: null, rawCredential: null };
      }
    }

    // ── Priority 3: davissss2.antigravity-account ──
    const extId2 = 'davissss2.antigravity-account';
    const rawAccess2 = getRawValue(`secret://{"extensionId":"${extId2}","key":"antigravityAccount.secure.${email}.accessToken"}`);
    if (rawAccess2) {
      const accessToken = decryptValue(rawAccess2);
      if (accessToken) {
        const rawRefresh2 = getRawValue(`secret://{"extensionId":"${extId2}","key":"antigravityAccount.secure.${email}.refreshToken"}`);
        const refreshToken = rawRefresh2 ? decryptValue(rawRefresh2) : null;
        console.log('[vault] ✓ Found token via davissss2 for:', email);
        return { accessToken, refreshToken, rawCredential: null };
      }
    }

    console.warn('[vault] No token found in IDE vault for:', email);
    return null;
  } finally {
    try { db.close(); } catch {}
  }
}

/**
 * Reads all real Google account profile image URLs from state.vscdb
 * Returns { avatarMap: Record<email, url>, activeProfileUrl: string | null }
 */
async function getKnownGoogleAvatars() {
  if (!fs.existsSync(AGY_GLOBAL_STATE_DB)) return { avatarMap: {}, activeProfileUrl: null };
  try {
    let initSqlJs;
    try { initSqlJs = require('sql.js'); } catch { return { avatarMap: {}, activeProfileUrl: null }; }
    const wasmPath = path.join(require.resolve('sql.js'), '..', '..', 'dist', 'sql-wasm.wasm');
    const SQL = await initSqlJs({ locateFile: () => wasmPath });
    const db = new SQL.Database(fs.readFileSync(AGY_GLOBAL_STATE_DB));

    const stmt = db.prepare('SELECT key, value FROM ItemTable');
    const avatarMap = {};
    let activeProfileUrl = null;

    while (stmt.step()) {
      const row = stmt.getAsObject();
      const key = row.key;
      const val = row.value;
      if (typeof val === 'string') {
        if (key === 'antigravity.profileUrl' && val.startsWith('http')) {
          activeProfileUrl = val;
        }
        try {
          const json = JSON.parse(val);
          for (const k of Object.keys(json)) {
            if (Array.isArray(json[k])) {
              json[k].forEach(item => {
                if (item && item.email && item.avatarUrl && !item.avatarUrl.includes('dicebear')) {
                  avatarMap[item.email.toLowerCase()] = item.avatarUrl;
                }
              });
            }
          }
        } catch {}
      }
    }
    stmt.free();
    try { db.close(); } catch {}
    return { avatarMap, activeProfileUrl };
  } catch (e) {
    console.warn('[vault] getKnownGoogleAvatars warning:', e.message);
    return { avatarMap: {}, activeProfileUrl: null };
  }
}

module.exports = { readIdeVaultToken, getKnownGoogleAvatars, AGY_GLOBAL_STATE_DB };
