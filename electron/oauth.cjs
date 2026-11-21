const http = require('http');
const https = require('https');
const crypto = require('crypto');
const { safeStorage, app } = require('electron');
const fs = require('fs');
const path = require('path');
const { execFileSync, execSync } = require('child_process');
const telemetry = require('./telemetry.cjs');
const { readIdeVaultToken, getKnownGoogleAvatars } = require('./vault-reader.cjs');
const { performFullIdeAccountSwitch } = require('./ide-injector.cjs');

const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const USERINFO_URL = 'https://openidconnect.googleapis.com/v1/userinfo';
// Production Google Cloud Code endpoints for Antigravity
const LOAD_ASSIST_URL = 'https://cloudcode-pa.googleapis.com/v1internal:loadCodeAssist';
const MODELS_URL = 'https://cloudcode-pa.googleapis.com/v1internal:fetchAvailableModels';

function configFile() { return path.join(app?.getPath ? app.getPath('userData') : process.env.APPDATA, 'antigravity-accounts', 'oauth-config.bin'); }
function localConfigFile() { return path.join(__dirname, '..', 'data', 'oauth.local.json'); }

function loadOAuthConfig() {
  const environmentSecret = process.env.AGY_GOOGLE_CLIENT_SECRET || '';
  const environmentClientId = process.env.AGY_GOOGLE_CLIENT_ID || '';
  try {
    const f = configFile();
    const saved = fs.existsSync(f) && safeStorage?.isEncryptionAvailable?.()
      ? JSON.parse(safeStorage.decryptString(fs.readFileSync(f)))
      : {};
    const local = fs.existsSync(localConfigFile())
      ? JSON.parse(fs.readFileSync(localConfigFile(), 'utf8'))
      : {};
    return {
      clientId: environmentClientId || local.clientId || saved.clientId || '',
      clientSecret: environmentSecret || local.clientSecret || saved.clientSecret || ''
    };
  } catch {
    return { clientId: environmentClientId, clientSecret: environmentSecret };
  }
}

async function refreshGoogleOAuthTokens(refreshToken) {
  const { clientId, clientSecret } = loadOAuthConfig();
  if (!clientId || !clientSecret) {
    throw new Error('Google OAuth credentials not configured. Please set AGY_GOOGLE_CLIENT_ID and AGY_GOOGLE_CLIENT_SECRET or configure via UI.');
  }

  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: 'refresh_token',
    refresh_token: refreshToken
  }).toString();

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Google token refresh failed (${res.status}): ${text}`);
  }
  return await res.json();
}

function saveOAuthConfig(config) {
  if (!config?.clientId?.trim()) throw new Error('A Google OAuth client ID is required.');
  fs.mkdirSync(path.dirname(configFile()), { recursive: true });
  const str = JSON.stringify({ clientId: config.clientId.trim(), clientSecret: (config.clientSecret || '').trim() });
  if (safeStorage?.isEncryptionAvailable?.()) {
    fs.writeFileSync(configFile(), safeStorage.encryptString(str));
  } else {
    fs.writeFileSync(configFile(), Buffer.from(str, 'utf8'));
  }
  return true;
}

function requestJson(url, options = {}, body) {
  return new Promise((resolve, reject) => {
    const headers = {
      'User-Agent': 'antigravity/1.22.2 windows/amd64',
      ...(options.headers || {})
    };
    const request = https.request(url, { ...options, headers }, response => {
      let text = '';
      response.on('data', chunk => text += chunk);
      response.on('end', () => {
        let data;
        try { data = text ? JSON.parse(text) : {}; }
        catch { data = { message: text }; }
        if (response.statusCode < 200 || response.statusCode >= 300) {
          return reject(new Error(data.error?.message || data.error_description || data.message || `Request failed (${response.statusCode})`));
        }
        resolve(data);
      });
    });

    // 6-second timeout to prevent hanging on Google Cloud Code
    request.setTimeout(6000, () => {
      request.destroy(new Error('Google Cloud Code request timed out (6s).'));
    });

    request.on('error', reject);
    if (body) request.write(body);
    request.end();
  });
}

// -------------------------------------------------------------
// Native Windows Credential Manager Extraction
// -------------------------------------------------------------
function readLocalAntigravityCredential() {
  const exePath = path.join(__dirname, 'cred_tool.exe');
  const ps1Path = path.join(__dirname, 'read_cred.ps1');

  // Try compiled native cred_tool.exe first (<50ms)
  if (fs.existsSync(exePath)) {
    try {
      const out = execFileSync(exePath, ['read', 'gemini:antigravity'], { encoding: 'utf8' });
      if (out && out.trim()) {
        return JSON.parse(out);
      }
    } catch (e) {
      console.warn('cred_tool.exe read error, trying fallback:', e.message);
    }
  }

  // Fallback to powershell script
  try {
    const out = execFileSync('powershell', [
      '-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', ps1Path, 'gemini:antigravity'
    ], { encoding: 'utf8' });
    if (out && out.trim()) {
      return JSON.parse(out);
    }
  } catch (e) {
    console.warn('powershell read_cred.ps1 error:', e.message);
  }

  return null;
}

function writeLocalAntigravityCredential(rawJsonString) {
  const exePath = path.join(__dirname, 'cred_tool.exe');
  if (fs.existsSync(exePath)) {
    try {
      execFileSync(exePath, ['write', 'gemini:antigravity', rawJsonString]);
      return true;
    } catch (e) {
      console.error('cred_tool.exe write failed:', e.message);
    }
  }
  return false;
}

function extractEmailAndDetails(cred) {
  if (!cred) return null;
  let email;
  let name = cred.name;
  let avatarUrl = cred.picture;
  const idToken = cred.id_token || cred.token?.id_token;

  // Prefer the current ID token over cached metadata. The metadata can lag
  // briefly while Antigravity is switching accounts.
  if (typeof idToken === 'string') {
    try {
      const parts = idToken.split('.');
      if (parts.length >= 2) {
        const payloadBase64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
        const padded = payloadBase64.padEnd(payloadBase64.length + (4 - payloadBase64.length % 4) % 4, '=');
        const jsonStr = Buffer.from(padded, 'base64').toString('utf8');
        const payload = JSON.parse(jsonStr);
        if (payload?.email) {
          email = payload.email;
          if (!name && payload.name) name = payload.name;
          if (!avatarUrl && payload.picture) avatarUrl = payload.picture;
        }
      }
    } catch (e) {
      console.warn('Failed parsing id_token JWT:', e.message);
    }
  }

  email = email || cred.id_token_email || cred.email;
  if (email && email.includes('@') && email.includes('.') && !/^antigravity-user/i.test(email)) {
    return {
      email,
      name: name || email.split('@')[0],
      avatarUrl: avatarUrl || null
    };
  }
  return null;
}

function getCredentialToken(cred) {
  return cred?.token?.access_token || cred?.access_token || null;
}

function getCredentialExpiry(cred) {
  const expiry = cred?.token?.expiry ?? cred?.expiry;
  return expiry ? new Date(expiry).getTime() : Date.now() + 3600000;
}

function getActiveLocalAccountEmail() {
  try {
    const cred = readLocalAntigravityCredential();
    const details = extractEmailAndDetails(cred);
    return details?.email || null;
  } catch {
    return null;
  }
}

// Ensure the active IDE account from Windows Credential Manager is present in the fleet
function credentialFingerprint(cred) {
  if (!cred) return null;
  return crypto.createHash('sha256').update(JSON.stringify({
    writerId: cred.writer_id || '',
    email: cred.id_token_email || cred.email || '',
    idToken: cred.id_token || cred.token?.id_token || '',
    accessToken: getCredentialToken(cred) || ''
  })).digest('hex');
}

function formatReset(value) {
  if (!value) return 'Ready';
  const ms = new Date(value).getTime() - Date.now();
  if (!Number.isFinite(ms)) return String(value);
  if (ms <= 0) return 'Resetting now';
  const totalMinutes = Math.ceil(ms / 60000);
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

// -------------------------------------------------------------
// Live Quota Fetcher (Local Language Server RPC + Cloud Code Fallback)
// -------------------------------------------------------------
// Helper to parse quota remaining percentage correctly.
// Google Cloud Protobuf APIs (proto3) omit default values (0.0) from JSON.
// If quotaInfo is present with a resetTime or is an object, but remainingFraction is missing/undefined,
// it indicates remainingFraction is 0 (exhausted).
function extractRemainingPercent(quotaInfo) {
  if (!quotaInfo) return 100;
  if (typeof quotaInfo.remainingFraction === 'number') {
    return Math.max(0, Math.min(100, Math.round(quotaInfo.remainingFraction * 100)));
  }
  if (quotaInfo.resetTime) {
    return 0;
  }
  return 0;
}

// ponytail: query the local running agy.exe language server directly for 100% accurate live quotas
let _cachedAgyRpcInfo = null;

function getAgyRpcInfo(forceRefresh = false) {
  if (!forceRefresh && _cachedAgyRpcInfo) {
    return _cachedAgyRpcInfo;
  }
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const cmd = `$ProgressPreference = 'SilentlyContinue'; Get-CimInstance Win32_Process -Filter "Name = 'agy.exe'" | Select-Object -ExpandProperty CommandLine`;
      const b64 = Buffer.from(cmd, 'utf16le').toString('base64');
      const out = execSync(`powershell.exe -NoProfile -ExecutionPolicy Bypass -EncodedCommand ${b64}`, {
        encoding: 'utf8',
        windowsHide: true,
        timeout: 8000
      });
      const portMatch = out.match(/--hub-port=(\d+)/i);
      const csrfMatch = out.match(/--csrf_token=([a-zA-Z0-9-]+)/i);
      if (portMatch && csrfMatch) {
        _cachedAgyRpcInfo = { port: parseInt(portMatch[1], 10), csrf: csrfMatch[1] };
        return _cachedAgyRpcInfo;
      }
    } catch (e) {
      console.warn(`[getAgyRpcInfo] query attempt ${attempt} warning:`, e.message);
    }
  }
  return null;
}

function fetchAgyLocalQuotas(retries = 3) {
  return new Promise(async (resolve) => {
    for (let attempt = 1; attempt <= retries; attempt++) {
      const info = getAgyRpcInfo(attempt > 1);
      if (!info) {
        if (attempt < retries) {
          await new Promise(r => setTimeout(r, 600));
          continue;
        }
        return resolve(null);
      }

      const reqAttempt = await new Promise((resAttempt) => {
        const req = http.request({
          hostname: '127.0.0.1',
          port: info.port,
          path: '/exa.language_server_pb.LanguageServerService/GetUserStatus',
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Connect-Protocol-Version': '1',
            'x-codeium-csrf-token': info.csrf
          },
          timeout: 5000
        }, res => {
          let data = '';
          res.on('data', chunk => data += chunk);
          res.on('end', () => {
            try {
              const json = JSON.parse(data);
              const status = json.userStatus;
              if (!status) return resAttempt(null);

              const configs = status.cascadeModelConfigData?.clientModelConfigs || [];
              
              // 1. Gemini: select active tier model with valid quotaInfo
              const geminiConfig = configs.find(c => /gemini.*flash/i.test(c.label || c.modelId) && c.quotaInfo && c.quotaInfo.remainingFraction !== undefined)
                || configs.find(c => /gemini.*flash/i.test(c.label || c.modelId) && c.quotaInfo)
                || configs.find(c => /gemini/i.test(c.label || c.modelId) && c.quotaInfo);

              // 2. Claude & GPT: select active model with valid quotaInfo
              const claudeConfig = configs.find(c => /(claude|gpt)/i.test(c.label || c.modelId) && c.quotaInfo);

              const parseQuota = (cfg, defaultModel, key) => {
                const remaining = extractRemainingPercent(cfg?.quotaInfo);
                const resetTime = cfg?.quotaInfo?.resetTime || null;
                return {
                  key,
                  model: defaultModel,
                  remainingPercent: remaining,
                  resetTime,
                  resetCountdown: resetTime ? formatReset(resetTime) : 'Ready'
                };
              };

              const quotas = [
                parseQuota(geminiConfig, 'Gemini', 'gemini'),
                parseQuota(claudeConfig, 'Claude & GPT', 'claude-gpt')
              ];

              const plan = status.userTier?.name || status.plan || 'Antigravity Starter Quota';
              resAttempt({ quotas, plan, email: status.email });
            } catch {
              resAttempt(null);
            }
          });
        });

        req.on('error', () => {
          _cachedAgyRpcInfo = null;
          resAttempt(null);
        });
        req.on('timeout', () => {
          req.destroy();
          _cachedAgyRpcInfo = null;
          resAttempt(null);
        });
        req.write('{}');
        req.end();
      });

      if (reqAttempt) return resolve(reqAttempt);
      if (attempt < retries) {
        await new Promise(r => setTimeout(r, 600));
      }
    }
    resolve(null);
  });
}

async function fetchAccountQuotas(accessToken, targetEmail = null) {
  // 1. First priority: Try local Antigravity Language Server RPC ONLY IF it matches targetEmail (or no targetEmail specified)
  try {
    const localRpcData = await fetchAgyLocalQuotas();
    if (localRpcData) {
      const emailMatches = !targetEmail || (localRpcData.email && targetEmail && localRpcData.email.toLowerCase() === targetEmail.toLowerCase());
      if (emailMatches) {
        console.log('[fetchAccountQuotas] Live quotas acquired via local Language Server RPC for:', localRpcData.email);
        return {
          quotas: localRpcData.quotas,
          plan: localRpcData.plan,
          email: localRpcData.email,
          projectId: 'aicode-consumers'
        };
      } else {
        console.log(`[fetchAccountQuotas] Local Language Server is serving ${localRpcData.email}, which does not match target ${targetEmail}. Skipping local RPC.`);
      }
    }
  } catch (rpcErr) {
    console.warn('[fetchAccountQuotas] Local RPC failed, falling back to Web API:', rpcErr.message);
  }

  // 2. Fallback: Google Cloud Code web endpoints
  const context = await requestJson(
    LOAD_ASSIST_URL,
    { method: 'POST', headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' } },
    JSON.stringify({ metadata: { ide_type: 'ANTIGRAVITY', ide_version: '1.22.2', ide_name: 'antigravity' } })
  );

  const projectId = context.cloudaicompanionProject || 'aicode-consumers';
  const response = await requestJson(
    MODELS_URL,
    { method: 'POST', headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' } },
    JSON.stringify(projectId ? { project: projectId } : {})
  );

  const modelEntries = Object.entries(response.models || {});

  // Primary Gemini entry: choose real interactive flash / pro chat model (excluding preview/image stubs)
  const geminiEntry = modelEntries.find(([id, m]) => /^gemini.*flash/i.test(id) && m?.quotaInfo && !id.includes('preview') && !id.includes('image') && !id.includes('chat_'))?.[1]
    || modelEntries.find(([id, m]) => /^gemini-(2\.5|3)/i.test(id) && m?.quotaInfo && !id.includes('preview') && !id.includes('image'))?.[1]
    || modelEntries.find(([id, m]) => /gemini/i.test(id) && m?.quotaInfo && !id.includes('preview') && !id.includes('chat_'))?.[1]
    || modelEntries.find(([id, m]) => /gemini/i.test(id) && m?.quotaInfo)?.[1];

  // Primary Claude / GPT entry
  const claudeGptEntry = modelEntries.find(([id, m]) => /claude-sonnet/i.test(id) && m?.quotaInfo)?.[1]
    || modelEntries.find(([id, m]) => /(claude|gpt)/i.test(id) && m?.quotaInfo)?.[1];

  const quotas = [
    {
      key: 'gemini',
      model: 'Gemini',
      remainingPercent: extractRemainingPercent(geminiEntry?.quotaInfo),
      resetTime: geminiEntry?.quotaInfo?.resetTime || null,
      resetCountdown: geminiEntry?.quotaInfo?.resetTime ? formatReset(geminiEntry.quotaInfo.resetTime) : 'Ready'
    },
    {
      key: 'claude-gpt',
      model: 'Claude & GPT',
      remainingPercent: extractRemainingPercent(claudeGptEntry?.quotaInfo),
      resetTime: claudeGptEntry?.quotaInfo?.resetTime || null,
      resetCountdown: claudeGptEntry?.quotaInfo?.resetTime ? formatReset(claudeGptEntry.quotaInfo.resetTime) : 'Ready'
    }
  ];

  const plan = context.paidTier?.name || context.currentTier?.name || 'Antigravity Starter';
  return { quotas, plan, projectId };
}

// -------------------------------------------------------------
// Synchronize Active IDE Account into Local userData.js Database
// -------------------------------------------------------------
async function syncActiveIdeAccount({ waitForChange = false, requireCredential = false } = {}) {
  const maxAttempts = waitForChange ? 20 : 5;
  const retryDelayMs = waitForChange ? 500 : 400;
  let cred = null;
  let details = null;
  const initialFingerprint = waitForChange
    ? credentialFingerprint(readLocalAntigravityCredential())
    : null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    cred = readLocalAntigravityCredential();
    details = extractEmailAndDetails(cred);
    const hasCredential = details && details.email && getCredentialToken(cred);
    const changed = !waitForChange || credentialFingerprint(cred) !== initialFingerprint;
    if (hasCredential && changed) {
      break;
    }
    if (attempt < maxAttempts) {
      await new Promise(res => setTimeout(res, retryDelayMs));
    }
  }

  let accounts = telemetry.loadFleet();

  let email = details?.email || null;
  let token = getCredentialToken(cred);

  // If keystore did not return an email, probe active IDE language server directly
  if (!email) {
    try {
      const probe = await fetchAgyLocalQuotas(2);
      if (probe?.email) {
        email = probe.email;
        console.log('[syncActiveIdeAccount] Resolved active email via language server RPC:', email);
      }
    } catch {}
  }

  if (email) {
    // 1. Fetch live quotas for this active account using its live token (with auto-refresh on expiry)
    let liveData = null;
    let activeToken = token;
    const refreshToken = cred?.token?.refresh_token || cred?.refresh_token;

    try {
      liveData = await fetchAccountQuotas(activeToken, email);
    } catch (apiErr) {
      console.warn('[syncActiveIdeAccount] Initial quota fetch error:', apiErr.message);
      if (refreshToken) {
        try {
          console.log('[syncActiveIdeAccount] Refreshing OAuth token for:', email);
          const fresh = await refreshGoogleOAuthTokens(refreshToken);
          if (fresh.access_token) {
            activeToken = fresh.access_token;
            if (cred && cred.token) {
              cred.token = {
                ...cred.token,
                access_token: activeToken,
                expiry: new Date(Date.now() + (fresh.expires_in || 3599) * 1000).toISOString(),
                expires_in: fresh.expires_in || 3599
              };
              if (fresh.id_token) cred.id_token = fresh.id_token;
              writeLocalAntigravityCredential(JSON.stringify(cred));
            }
            liveData = await fetchAccountQuotas(activeToken, email);
          }
        } catch (rfErr) {
          console.warn('[syncActiveIdeAccount] Token refresh failed:', rfErr.message);
        }
      }
    }

    // 2. Find or create account in fleet
    let account = accounts.find(a => a.email?.toLowerCase() === email.toLowerCase());

    if (!account) {
      const seatIndex = accounts.length + 1;
      account = {
        id: crypto.randomUUID(),
        seatBadge: `G${seatIndex}`,
        email: email,
        name: details?.name || email.split('@')[0],
        avatarUrl: details?.avatarUrl || null,
        status: 'Primary Active',
        plan: liveData?.plan || 'Antigravity Starter',
        isMaster: accounts.length === 0,
        isActiveInIde: true,
        quotas: liveData?.quotas || [
          { key: 'gemini', model: 'Gemini', remainingPercent: 100, resetTime: null, resetCountdown: 'Ready' },
          { key: 'claude-gpt', model: 'Claude & GPT', remainingPercent: 100, resetTime: null, resetCountdown: 'Ready' }
        ],
        lastRefreshedAt: new Date().toISOString(),
        projectId: liveData?.projectId || 'aicode-consumers'
      };
      accounts.push(account);
    } else {
      // Update existing account details
      if (details?.avatarUrl && (!account.avatarUrl || account.avatarUrl.includes('dicebear'))) {
        account.avatarUrl = details.avatarUrl;
      }
      if (details?.name) {
        account.name = details.name;
      }
      if (liveData?.quotas) {
        account.quotas = liveData.quotas;
      }
      if (liveData?.plan) {
        account.plan = liveData.plan;
      }
      if (liveData?.projectId) {
        account.projectId = liveData.projectId;
      }
      account.lastRefreshedAt = new Date().toISOString();
    }

    // 3. Mark active vs standby for all accounts in the database
    for (const acc of accounts) {
      const isCurrentActive = acc.email?.toLowerCase() === email.toLowerCase();
      acc.isActiveInIde = isCurrentActive;
      acc.status = isCurrentActive ? 'Primary Active' : 'Standby Node';
      acc.error = null; // Standby accounts never show error banner
    }

    // 3b. Apply time-based quota restoration and live countdown updates for standby accounts
    // Standby accounts preserve their own individual data and automatically reset to 100% Ready when their resetTime expires
    telemetry.applyStandbyQuotaRestoration(accounts);

    // 3c. Synchronize real Google account avatar images from IDE storage for all fleet accounts
    try {
      const { avatarMap, activeProfileUrl } = await getKnownGoogleAvatars();
      for (const acc of accounts) {
        const emailLower = acc.email?.toLowerCase();
        if (avatarMap && avatarMap[emailLower]) {
          acc.avatarUrl = avatarMap[emailLower];
        } else if (acc.isActiveInIde && activeProfileUrl) {
          acc.avatarUrl = activeProfileUrl;
        }
      }
    } catch (avErr) {
      console.warn('[syncActiveIdeAccount] Avatar sync error:', avErr.message);
    }

    // 4. Save credentials securely for quick switching later (both paths)
    if (cred) {
      const rawSecret = JSON.stringify(cred);
      telemetry.setTokens(account.id, {
        accessToken: token,
        refreshToken: cred.token?.refresh_token || cred.refresh_token,
        rawSecret,
        expiresAt: getCredentialExpiry(cred)
      });
      // Also store rawSecret directly on the account object in userData.js
      // so switching works even when safeStorage paths differ (dev vs prod)
      account._rawSecret = rawSecret;
    }

    // 5. Persist to userData.js and accounts.json
    telemetry.saveFleet(accounts);
  } else {
    console.warn('[syncActiveIdeAccount] Unable to read credential from keystore or language server.');
    if (requireCredential) {
      throw new Error('Could not read the current Antigravity account. Switch accounts in Antigravity, wait a moment, and try Import again.');
    }
  }

  return telemetry.loadFleet();
}

async function importLocalAntigravityAccount() {
  return syncActiveIdeAccount({ waitForChange: true, requireCredential: true });
}

async function switchActiveAccount(accountId) {
  const accounts = telemetry.loadFleet();
  const target = accounts.find(a => a.id === accountId);
  if (!target) throw new Error('Target account not found.');

  // 1. Get rawSecret or stored tokens
  const stored = telemetry.getTokens(accountId);
  let rawSecret = stored?.rawSecret || target._rawSecret || null;

  // 2. Fallback to vault reader if needed
  if (!rawSecret && target.email) {
    try {
      const vaultData = await readIdeVaultToken(target.email, safeStorage);
      if (vaultData?.accessToken) {
        rawSecret = JSON.stringify({
          token: {
            access_token: vaultData.accessToken,
            refresh_token: vaultData.refreshToken || '',
            token_type: 'Bearer',
            expiry: new Date(Date.now() + 3600000).toISOString(),
            expires_in: 3599
          },
          auth_method: 'consumer',
          id_token: vaultData.idToken || '',
          id_token_email: target.email
        });
        target._rawSecret = rawSecret;
      }
    } catch (e) {
      console.warn('[switchActiveAccount] Vault reader fallback warning:', e.message);
    }
  }

  if (!rawSecret) {
    throw new Error(`No credentials found for ${target.email}.`);
  }

  let credObj = {};
  try { credObj = JSON.parse(rawSecret); } catch {}
  let accessToken = credObj.token?.access_token || credObj.access_token || '';
  let refreshToken = credObj.token?.refresh_token || credObj.refresh_token || '';
  let idToken = credObj.id_token || credObj.token?.id_token || '';

  // 3. Always refresh with Google if refresh token is present to guarantee fresh access_token AND fresh id_token JWT
  if (refreshToken) {
    try {
      console.log('[switch] Refreshing Google OAuth tokens for:', target.email);
      const fresh = await refreshGoogleOAuthTokens(refreshToken);
      if (fresh.access_token) accessToken = fresh.access_token;
      if (fresh.id_token) idToken = fresh.id_token;

      credObj.token = {
        ...credObj.token,
        access_token: accessToken,
        refresh_token: refreshToken,
        expiry: new Date(Date.now() + (fresh.expires_in || 3599) * 1000).toISOString(),
        expires_in: fresh.expires_in || 3599
      };
      credObj.id_token = idToken;
      credObj.id_token_email = target.email;
      target._rawSecret = JSON.stringify(credObj);
      telemetry.saveFleet(accounts);
      console.log('[switch] Refreshed tokens successfully for:', target.email);
    } catch (refreshErr) {
      console.warn('[switch] Token refresh warning, using cached:', refreshErr.message);
    }
  }

  if (!idToken) {
    throw new Error(`Incomplete Google credentials (missing id_token) for ${target.email}.`);
  }

  // 4. Perform the full, cleanly sequenced switch:
  // (injects creds & DB -> notifies IDE via CLI reload)
  await performFullIdeAccountSwitch(target.email, accessToken, refreshToken, idToken, target.avatarUrl || '');

  // 5. Poll for Antigravity IDE language server to come back online with the new account
  try {
    console.log('[switchActiveAccount] Waiting for Antigravity IDE language server to come online with:', target.email);
    for (let attempt = 1; attempt <= 12; attempt++) {
      await new Promise(r => setTimeout(r, 600));
      const localData = await fetchAgyLocalQuotas(1);
      if (localData && localData.email && localData.email.toLowerCase() === target.email.toLowerCase()) {
        target.quotas = localData.quotas;
        target.plan = localData.plan;
        target.lastRefreshedAt = new Date().toISOString();
        console.log('[switchActiveAccount] Fresh live quotas acquired for:', target.email, JSON.stringify(target.quotas));
        break;
      }
    }
  } catch (liveErr) {
    console.warn('[switchActiveAccount] Post-switch live quota poll notice:', liveErr.message);
  }

  // 6. Update active status in fleet
  for (const acc of accounts) {
    const isTarget = acc.id === accountId;
    acc.isActiveInIde = isTarget;
    acc.status = isTarget ? 'Primary Active' : 'Standby Node';
    acc.error = null;
  }
  telemetry.applyStandbyQuotaRestoration(accounts);
  telemetry.saveFleet(accounts);

  return accounts;
}

// Standby accounts are served directly from userData.js cache.
// refreshAll updates the active IDE account and leaves standby accounts safely preserved.
async function refreshAll() {
  return syncActiveIdeAccount();
}

module.exports = {
  loadOAuthConfig,
  saveOAuthConfig,
  syncActiveIdeAccount,
  importLocalAntigravityAccount,
  switchActiveAccount,
  getActiveLocalAccountEmail,
  readLocalAntigravityCredential,
  refreshAll
};
