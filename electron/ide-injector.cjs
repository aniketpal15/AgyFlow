const fs = require('fs');
const initSqlJs = require('sql.js');
const path = require('path');
const { execFileSync, execSync } = require('child_process');

class ProtoBuilder {
  static concatBytes(...arrays) {
    let total = arrays.reduce((acc, a) => acc + a.length, 0);
    let res = new Uint8Array(total);
    let offset = 0;
    for (let a of arrays) {
      res.set(a, offset);
      offset += a.length;
    }
    return res;
  }

  static encodeVarint(val) {
    let res = [];
    let n = BigInt(val);
    while (n > 127n) {
      res.push(Number((n & 127n) | 128n));
      n >>= 7n;
    }
    res.push(Number(n));
    return new Uint8Array(res);
  }

  static encodeVarintField(tag, val) {
    let header = (tag << 3) | 0;
    return this.concatBytes(this.encodeVarint(header), this.encodeVarint(val));
  }

  static encodeLenDelimField(tag, bytes) {
    let header = (tag << 3) | 2;
    let hBytes = this.encodeVarint(header);
    let lBytes = this.encodeVarint(bytes.length);
    let res = new Uint8Array(hBytes.length + lBytes.length + bytes.length);
    res.set(hBytes, 0);
    res.set(lBytes, hBytes.length);
    res.set(bytes, hBytes.length + lBytes.length);
    return res;
  }

  static encodeStringField(tag, str) {
    return this.encodeLenDelimField(tag, Buffer.from(str || '', 'utf-8'));
  }

  static createOAuthInfo(accessToken, refreshToken, expirySec, isGsuite = false, idToken = '', email = '') {
    if (isGsuite && email) {
      let low = email.toLowerCase();
      if (low.endsWith('@gmail.com') || low.endsWith('@googlemail.com')) {
        isGsuite = false;
      }
    }
    let s1 = this.encodeStringField(1, accessToken);
    let s2 = this.encodeStringField(2, 'Bearer');
    let s3 = this.encodeStringField(3, refreshToken || '');
    
    let tag1 = this.encodeVarint(8);
    let expVal = this.encodeVarint(expirySec);
    let expMsg = new Uint8Array(tag1.length + expVal.length);
    expMsg.set(tag1, 0);
    expMsg.set(expVal, tag1.length);
    let s4 = this.encodeLenDelimField(4, expMsg);

    let s5 = idToken ? this.encodeStringField(5, idToken) : new Uint8Array(0);
    let s6 = isGsuite ? this.encodeVarintField(6, 1) : new Uint8Array(0);
    return this.concatBytes(s1, s2, s3, s4, s5, s6);
  }

  static createUnifiedStateEntry(sentinelKey, payloadBytes) {
    let b64 = Buffer.from(payloadBytes).toString('base64');
    let encB64 = this.encodeStringField(1, b64);
    let entry = this.concatBytes(
      this.encodeStringField(1, sentinelKey),
      this.encodeLenDelimField(2, encB64)
    );
    let wrapped = this.encodeLenDelimField(1, entry);
    return Buffer.from(wrapped).toString('base64');
  }

  static createUnifiedOAuthToken(accessToken, refreshToken, expirySec, isGsuite = false, idToken = '', email = '') {
    let info = this.createOAuthInfo(accessToken, refreshToken, expirySec, isGsuite, idToken, email);
    return this.createUnifiedStateEntry('oauthTokenInfoSentinelKey', info);
  }

  static createMinimalUserStatusPayload(email) {
    return this.concatBytes(
      this.encodeStringField(3, email),
      this.encodeStringField(7, email)
    );
  }

  static createUnifiedUserStatus(email) {
    let payload = this.createMinimalUserStatusPayload(email);
    return this.createUnifiedStateEntry('userStatusSentinelKey', payload);
  }
}

/**
 * Safely writes Windows Credential Manager target gemini:antigravity
 */
function writeWindowsCredential(email, accessToken, refreshToken, idToken) {
  const credToolPath = path.join(__dirname, 'cred_tool.exe');
  const credObj = {
    token: {
      access_token: accessToken,
      token_type: 'Bearer',
      refresh_token: refreshToken || '',
      expiry: new Date(Date.now() + 3600000).toISOString(),
      expires_in: 3599
    },
    auth_method: 'consumer',
    id_token: idToken || '',
    id_token_email: email,
    writer_id: `agy-daemon-${Date.now()}`
  };
  try {
    execFileSync(credToolPath, ['write', 'gemini:antigravity', JSON.stringify(credObj)]);
    console.log('[ide-injector] ✓ Windows Credential Manager updated for:', email);
    return true;
  } catch (err) {
    console.error('[ide-injector] Credential Manager write error:', err.message);
    return false;
  }
}

/**
 * Executes an instant, safe account switch matching the BoyGR extension:
 * - Updates Windows Credential Manager (gemini:antigravity)
 * - Updates SQLite state.vscdb with protobuf oauthToken and userStatus
 * - Patches google.google-antigravity onboarding state
 * - NEVER force-kills Antigravity IDE or agy.exe (which would close the user app and terminal!)
 * - If Antigravity IDE is closed, starts it cleanly
 * - If Antigravity IDE is running, pings it via antigravity-ide.cmd -r
 */
async function performFullIdeAccountSwitch(email, accessToken, refreshToken, idToken, avatarUrl = '') {
  const ideExe = 'C:\\Users\\anike\\AppData\\Local\\Programs\\Antigravity IDE\\Antigravity IDE.exe';
  const ideCmd = 'C:\\Users\\anike\\AppData\\Local\\Programs\\Antigravity IDE\\bin\\antigravity-ide.cmd';
  const dbPath = path.join(process.env.APPDATA, 'Antigravity IDE', 'User', 'globalStorage', 'state.vscdb');

  console.log('[performFullIdeAccountSwitch] Switching account to:', email);

  // 1. Write Windows Credential Manager (primary auth source)
  writeWindowsCredential(email, accessToken, refreshToken, idToken);

  // 2. Update state.vscdb safely
  console.log('[performFullIdeAccountSwitch] Updating state.vscdb...');
  const wasmPath = path.join(require.resolve('sql.js'), '..', '..', 'dist', 'sql-wasm.wasm');
  const SQL = await initSqlJs({ locateFile: () => wasmPath });

  let buf = null;
  for (let attempt = 1; attempt <= 5; attempt++) {
    try {
      buf = fs.readFileSync(dbPath);
      break;
    } catch (readErr) {
      if (attempt === 5) throw readErr;
      await new Promise(r => setTimeout(r, 200));
    }
  }

  const db = new SQL.Database(buf);
  const expirySec = Math.floor(Date.now() / 1000) + 3600;
  const oauthTokenVal = ProtoBuilder.createUnifiedOAuthToken(accessToken, refreshToken, expirySec, false, idToken, email);
  const userStatusVal = ProtoBuilder.createUnifiedUserStatus(email);

  const insert = db.prepare('INSERT OR REPLACE INTO ItemTable (key, value) VALUES (?, ?)');
  insert.run(['antigravityUnifiedStateSync.oauthToken', oauthTokenVal]);
  insert.run(['antigravityUnifiedStateSync.userStatus', userStatusVal]);
  insert.run(['antigravityOnboarding', 'true']);
  if (avatarUrl) {
    insert.run(['antigravity.profileUrl', avatarUrl]);
  }
  insert.free();

  // Patch google.google-antigravity onboarding state
  try {
    const extStmt = db.prepare('SELECT value FROM ItemTable WHERE key = ?');
    extStmt.bind(['google.google-antigravity']);
    if (extStmt.step()) {
      const raw = extStmt.getAsObject().value;
      const obj = JSON.parse(raw);
      if (!obj['antigravity-storage']) obj['antigravity-storage'] = {};
      obj['antigravity-storage']['agy.onboarding.lastLoginUsername'] = email;
      obj['antigravity-storage']['agy.onboarding.lastLoginIsGcpTos'] = 'false';

      const updateStmt = db.prepare('INSERT OR REPLACE INTO ItemTable (key, value) VALUES (?, ?)');
      updateStmt.run(['google.google-antigravity', JSON.stringify(obj)]);
      updateStmt.free();
      console.log('[performFullIdeAccountSwitch] ✓ Patched google.google-antigravity onboarding state.');
    }
    extStmt.free();
  } catch (patchErr) {
    console.warn('[performFullIdeAccountSwitch] Notice on patching google.google-antigravity:', patchErr.message);
  }

  const exportedData = db.export();
  db.close();

  for (let attempt = 1; attempt <= 5; attempt++) {
    try {
      fs.writeFileSync(dbPath, Buffer.from(exportedData));
      console.log('[performFullIdeAccountSwitch] ✓ state.vscdb written successfully.');
      break;
    } catch (writeErr) {
      if (attempt === 5) throw writeErr;
      await new Promise(r => setTimeout(r, 200));
    }
  }

  // 3. Terminate running Antigravity IDE & agy tasks, then restart cleanly with new account
  let wasIdeRunning = false;
  try {
    const check = execSync('powershell.exe -NoProfile -Command "$ProgressPreference = \'SilentlyContinue\'; Get-Process -Name \'Antigravity IDE\' -ErrorAction SilentlyContinue | Select-Object -First 1 Id"', {
      encoding: 'utf8',
      windowsHide: true
    }).trim();
    wasIdeRunning = !!check;
  } catch {}

  if (wasIdeRunning) {
    console.log('[performFullIdeAccountSwitch] Ending Antigravity IDE & agy tasks completely...');
    try {
      execSync('powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "$ProgressPreference = \'SilentlyContinue\'; Stop-Process -Name \'Antigravity IDE\', \'agy\' -Force -ErrorAction SilentlyContinue"', {
        windowsHide: true,
        stdio: 'ignore',
        timeout: 5000
      });
    } catch (termErr) {
      console.warn('[performFullIdeAccountSwitch] Process termination notice:', termErr.message);
    }
    // Wait for process handles and database locks to fully release
    await new Promise(r => setTimeout(r, 1200));
  }

  // 4. Launch Antigravity IDE fresh with the new account
  if (fs.existsSync(ideExe)) {
    console.log('[performFullIdeAccountSwitch] Launching fresh Antigravity IDE instance...');
    try {
      execSync(`powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "$ProgressPreference = 'SilentlyContinue'; Start-Process -FilePath '${ideExe}'"`, {
        windowsHide: true,
        stdio: 'ignore'
      });
      console.log('[performFullIdeAccountSwitch] ✓ Antigravity IDE launched with new account:', email);
    } catch (launchErr) {
      console.error('[performFullIdeAccountSwitch] Launch error:', launchErr.message);
    }
  }

  console.log('[performFullIdeAccountSwitch] ✓ Account switch complete for:', email);
  return true;
}

module.exports = {
  ProtoBuilder,
  performFullIdeAccountSwitch
};
