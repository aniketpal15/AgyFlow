const { spawn } = require('child_process');
const path = require('path');
const electronBin = require('electron');
const projectRoot = path.resolve(__dirname, '..');

const cleanEnv = { ...process.env };
delete cleanEnv.ELECTRON_RUN_AS_NODE;

const child = spawn(electronBin, [projectRoot], {
  detached: true,
  stdio: 'ignore',
  env: cleanEnv
});

child.unref();
console.log('[launch-detached] ✓ Antigravity Token Daemon running independently (PID: ' + child.pid + ')');

