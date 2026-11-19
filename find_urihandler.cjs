const fs = require('fs');
const content = fs.readFileSync('C:/Users/anike/.antigravity-ide/extensions/boygr.antigravity-account-switcher-1.4.16-universal/dist/extension.js', 'utf8');

const needle = 'registerUriHandler';
let pos = content.indexOf(needle);
console.log('=== MATCH registerUriHandler AT:', pos);
if (pos !== -1) {
  console.log(content.substring(Math.max(0, pos - 100), pos + 1000));
}
