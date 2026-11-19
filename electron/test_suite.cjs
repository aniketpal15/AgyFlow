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

  console.log('====================================================');
  console.log('   ALL TESTS PASSED: 100% VERIFIED & READY TO RUN!  ');
  console.log('====================================================');
}

runTestSuite().catch(err => {
  console.error('\n❌ Test Suite Failed:', err);
  process.exit(1);
});

