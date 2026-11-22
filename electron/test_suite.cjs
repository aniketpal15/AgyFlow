const assert = require('assert');
const oauth = require('./oauth.cjs');
const telemetry = require('./telemetry.cjs');

async function runTestSuite() {
  console.log('====================================================');
  console.log('   ANTIGRAVITY ID TOKEN TRACKER - AUTOMATED TEST    ');
  console.log('====================================================\n');

  // Test 1: Native Keystore Extraction
  console.log('[Test 1] Testing Windows Credential Manager Extraction...');
  const activeEmail = oauth.getActiveLocalAccountEmail();
  console.log('  -> Active IDE account found in keystore:', activeEmail);
  assert.ok(activeEmail, 'Must find active Antigravity account in Windows Credential Manager');
  console.log('  ✓ Test 1 Passed: Keystore successfully read.\n');

  // Test 2: Active Account Sync and Dual-Bar Aggregation
  console.log('[Test 2] Testing Google Cloud Code Handshake & Dual-Bar Aggregation...');
  const fleet = await oauth.syncActiveIdeAccount();
  assert.ok(Array.isArray(fleet), 'Fleet must be an array');
  assert.ok(fleet.length >= 1, 'Fleet must contain at least 1 account');

  const activeAccount = fleet.find(a => a.email.toLowerCase() === activeEmail.toLowerCase());
  assert.ok(activeAccount, 'Active account must be present in fleet');
  console.log('  -> Account:', activeAccount.email);
  console.log('  -> Status:', activeAccount.status);
  console.log('  -> Plan:', activeAccount.plan);
  console.log('  -> Total Metered Quotas:', activeAccount.quotas.length);

  // Verify EXACTLY 2 bars
  assert.strictEqual(activeAccount.quotas.length, 2, 'Must contain EXACTLY 2 quota bars (Gemini and Claude & GPT)');

  const geminiBar = activeAccount.quotas[0];
  const claudeGptBar = activeAccount.quotas[1];

  console.log('\n  [Bar 1] Model:', geminiBar.model);
  console.log('          Remaining:', geminiBar.remainingPercent + '%');
  console.log('          Reset Window:', geminiBar.resetCountdown);
  assert.strictEqual(geminiBar.model, 'Gemini', 'Bar 1 must be Gemini');
  assert.ok(typeof geminiBar.remainingPercent === 'number' && !isNaN(geminiBar.remainingPercent), 'Gemini percent must be a valid number');

  console.log('\n  [Bar 2] Model:', claudeGptBar.model);
  console.log('          Remaining:', claudeGptBar.remainingPercent + '%');
  console.log('          Reset Window:', claudeGptBar.resetCountdown);
  assert.strictEqual(claudeGptBar.model, 'Claude & GPT', 'Bar 2 must be Claude & GPT');
  assert.ok(typeof claudeGptBar.remainingPercent === 'number' && !isNaN(claudeGptBar.remainingPercent), 'Claude & GPT percent must be a valid number');

  console.log('\n  ✓ Test 2 Passed: Exactly two stable quota bars generated without layout fluctuation.\n');

  // Test 3: Telemetry Fleet Persistence
  console.log('[Test 3] Verifying Local Vault Storage Persistence...');
  const savedFleet = telemetry.loadFleet();
  assert.ok(savedFleet.some(a => a.email.toLowerCase() === activeEmail.toLowerCase()), 'Fleet must persist active account to disk');
  console.log('  ✓ Test 3 Passed: Fleet verified on disk.\n');

  // Test 4: Standby Quota Rolling Countdown Calculation & Auto-Restoration
  console.log('[Test 4] Testing Standby Quota Rolling Countdown & Auto-Restoration...');
  const pastDate = new Date(Date.now() - 3600000).toISOString();
  const futureDate = new Date(Date.now() + 86400000 * 3).toISOString();
  const testFleet = [
    {
      id: 'mock-expired',
      email: 'standby.expired@gmail.com',
      isActiveInIde: false,
      quotas: [
        { key: 'gemini', model: 'Gemini', remainingPercent: 0, resetTime: pastDate, resetCountdown: '1h' },
        { key: 'claude-gpt', model: 'Claude & GPT', remainingPercent: 15, resetTime: pastDate, resetCountdown: '1h' }
      ]
    },
    {
      id: 'mock-active',
      email: 'standby.cooling@gmail.com',
      isActiveInIde: false,
      quotas: [
        { key: 'gemini', model: 'Gemini', remainingPercent: 40, resetTime: futureDate, resetCountdown: '6d 0h' }
      ]
    }
  ];

  const hasRestored = telemetry.applyStandbyQuotaRestoration(testFleet);
  assert.strictEqual(hasRestored, true, 'Must detect and apply standby quota updates');

  // Verify expired account automatically restored to 100%
  const restored = testFleet[0];
  assert.strictEqual(restored.quotas[0].remainingPercent, 100, 'Expired Gemini quota must be auto-restored to 100%');
  assert.strictEqual(restored.quotas[0].resetCountdown, 'Ready', 'Expired Gemini countdown must become Ready');
  assert.strictEqual(restored.quotas[0].resetTime, null, 'Expired Gemini resetTime must be cleared');
  assert.strictEqual(restored.quotas[1].remainingPercent, 100, 'Expired Claude quota must be auto-restored to 100%');
  assert.strictEqual(restored.quotas[1].resetCountdown, 'Ready', 'Expired Claude countdown must become Ready');
  assert.strictEqual(restored.quotas[1].resetTime, null, 'Expired Claude resetTime must be cleared');

  // Verify active standby account has countdown dynamically calculated against current date
  const cooling = testFleet[1];
  assert.strictEqual(cooling.quotas[0].remainingPercent, 40, 'Active quota percent remains intact');
  assert.ok(cooling.quotas[0].resetCountdown.startsWith('3d'), 'Active standby countdown must reflect exact time remaining (3d)');

  console.log('  -> Expired Standby Account: Auto-restored to 100% (Ready)');
  console.log('  -> Active Standby Account: Countdown dynamically recalculated to', cooling.quotas[0].resetCountdown);
  console.log('  ✓ Test 4 Passed: Standby quota math verified.\n');

  console.log('====================================================');
  console.log('   ALL TESTS PASSED: 100% VERIFIED & READY TO RUN!  ');
  console.log('====================================================');
}

runTestSuite().catch(err => {
  console.error('\n❌ Test Suite Failed:', err);
  process.exit(1);
});

