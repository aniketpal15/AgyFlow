// extract_all_creds.cjs
// Reads all account tokens from Antigravity IDE state.vscdb using AES-256-GCM
// (the same encryption the devhakeem5.antigravity-hub extension uses)
// and populates _rawSecret in data/userData.js for accounts that are missing it.

'use strict';
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const crypto = require('crypto');

const initSqlJs = require('sql.js');

// ── 1. Derive the master AES key from Antigravity IDE's Local State via DPAPI ──
function getMasterKey() {
  const localStatePath = path.join(
    process.env.APPDATA, 'Antigravity IDE', 'Local State'
  );
  if (!fs.existsSync(localStatePath)) {
    throw new Error('Antigravity IDE Local State not found: ' + localStatePath);
  }
  const localState = JSON.parse(fs.readFileSync(localStatePath, 'utf8'));
  const encryptedKey = Buffer.from(localState.os_crypt.encrypted_key, 'base64');
  // Strip DPAPI prefix (first 5 bytes = "DPAPI")
  const dpapiPayload = encryptedKey.slice(5);
  const b64Payload = dpapiPayload.toString('base64');

  // Write a temp ps1 file to avoid quoting issues
  const tmpPs1 = path.join(process.env.TEMP, 'agy_dpapi_tmp.ps1');
  const psScript = [
    'Add-Type -AssemblyName System.Security',
    `$b = [System.Convert]::FromBase64String('${b64Payload}')`,
    '$d = [System.Security.Cryptography.ProtectedData]::Unprotect($b, $null, [System.Security.Cryptography.DataProtectionScope]::CurrentUser)',
    '[System.Convert]::ToBase64String($d)'
  ].join('\r\n');
  fs.writeFileSync(tmpPs1, psScript, 'utf8');

  const masterKeyB64 = execSync(
    `powershell.exe -NoProfile -ExecutionPolicy Bypass -File "${tmpPs1}"`,
    { encoding: 'utf8' }
  ).trim();

  try { fs.unlinkSync(tmpPs1); } catch {}

  const masterKey = Buffer.from(masterKeyB64, 'base64');
  if (masterKey.length !== 32) {
    throw new Error(`Unexpected master key length: ${masterKey.length} (expected 32)`);
  }
  return masterKey;
}

// ── 2. Decrypt a v10 AES-256-GCM value ──
function decryptV10(buf, key) {
  if (!buf || buf.length < 19) return null;
  const prefix = buf.slice(0, 3).toString('ascii');
  if (prefix !== 'v10') return null;
  const iv = buf.slice(3, 15);
  const ciphertext = buf.slice(15, buf.length - 16);
  const tag = buf.slice(buf.length - 16);
  try {
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(tag);
    return decipher.update(ciphertext, null, 'utf8') + decipher.final('utf8');
  } catch (e) {
    return null;
  }
}

// ── 3. Query a single key from state.vscdb ──
function getDecryptedValue(db, key, masterKey) {
  const stmt = db.prepare('SELECT value FROM ItemTable WHERE key = ?');
  stmt.bind([key]);
  if (!stmt.step()) { stmt.free(); return null; }
  const row = stmt.getAsObject();
  stmt.free();
  const rawVal = row.value;
  if (!rawVal) return null;
  try {
    const parsed = JSON.parse(rawVal);
    if (parsed.type === 'Buffer' && Array.isArray(parsed.data)) {
      return decryptV10(Buffer.from(parsed.data), masterKey);
    }
  } catch {}
  if (typeof rawVal === 'string') return rawVal;
  if (rawVal instanceof Uint8Array) return decryptV10(Buffer.from(rawVal), masterKey);
  return null;
}

// ── 4. Main: extract tokens for all accounts and patch userData.js ──
async function main() {
  console.log('[extract] Starting credential extraction from Antigravity IDE vault...');

  const masterKey = getMasterKey();
  console.log('[extract] Master key derived successfully (32 bytes)');

  const dbPath = path.join(
    process.env.APPDATA, 'Antigravity IDE', 'User', 'globalStorage', 'state.vscdb'
  );
  if (!fs.existsSync(dbPath)) {
    throw new Error('state.vscdb not found: ' + dbPath);
  }

  const wasmPath = path.join(
    require.resolve('sql.js'), '..', '..', 'dist', 'sql-wasm.wasm'
  );
  const SQL = await initSqlJs({ locateFile: () => wasmPath });
  const db = new SQL.Database(fs.readFileSync(dbPath));
  console.log('[extract] Opened state.vscdb');

  // Load current accounts
  const userDataPath = path.join(__dirname, 'data', 'userData.js');
  const accounts = require(userDataPath);

  let updated = 0;
  for (const acc of accounts) {
    if (acc._rawSecret) {
      console.log(`[skip]  ${acc.email} — already has _rawSecret`);
      continue;
    }

    const email = acc.email;
    // Try devhakeem5.antigravity-hub first (most reliable source)
    const keyPrefixes = [
      { ext: 'devhakeem5.antigravity-hub', access: `antigravity.account.${email}.accessToken`, refresh: `antigravity.account.${email}.refreshToken` },
      { ext: 'boygr.antigravity-account-switcher', access: `antigravity.vault.token.${email}`, refresh: null },
      { ext: 'davissss2.antigravity-account', access: `antigravityAccount.secure.${email}.accessToken`, refresh: `antigravityAccount.secure.${email}.refreshToken` },
    ];

    let accessToken = null;
    let refreshToken = null;

    for (const src of keyPrefixes) {
      const aKey = `secret://{"extensionId":"${src.ext}","key":"${src.access}"}`;
      const rKey = src.refresh ? `secret://{"extensionId":"${src.ext}","key":"${src.refresh}"}` : null;
      
      accessToken = getDecryptedValue(db, aKey, masterKey);
      if (!accessToken) continue;
      
      // Check if it's JSON (boygr vault might store full cred object)
      try {
        const parsed = JSON.parse(accessToken);
        const inner = parsed.access_token || parsed.token?.access_token;
        if (inner) {
          refreshToken = parsed.refresh_token || parsed.token?.refresh_token || null;
          accessToken = inner;
        }
      } catch {}
      
      if (rKey && !refreshToken) {
        refreshToken = getDecryptedValue(db, rKey, masterKey);
      }
      
      console.log(`[found] ${email} via ${src.ext} — accessToken len: ${accessToken.length}`);
      break;
    }

    if (!accessToken) {
      console.warn(`[miss]  ${email} — no token found in any extension vault`);
      continue;
    }

    const cred = {
      token: {
        access_token: accessToken,
        token_type: 'Bearer',
        refresh_token: refreshToken || '',
        expiry: new Date(Date.now() + 3600000).toISOString(),
        expires_in: 3599
      },
      auth_method: 'consumer',
      id_token_email: email,
      writer_id: `agy-extracted-${Date.now()}`
    };
    acc._rawSecret = JSON.stringify(cred);
    updated++;
  }

  db.close();

  if (updated > 0) {
    fs.writeFileSync(
      userDataPath,
      'module.exports = ' + JSON.stringify(accounts, null, 2) + ';\n',
      'utf8'
    );
    console.log(`\n[done] Updated ${updated} account(s) in userData.js`);
  } else {
    console.log('\n[done] No accounts needed updating');
  }

  // Print final state
  console.log('\nFinal state:');
  for (const a of accounts) {
    console.log(`  ${a.email}: hasSecret=${!!a._rawSecret}, isActive=${a.isActiveInIde}`);
  }
}

main().catch(err => {
  console.error('[FATAL]', err.message);
  process.exit(1);
});
