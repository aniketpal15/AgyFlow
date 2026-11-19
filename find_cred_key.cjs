const fs = require('fs');
const content = fs.readFileSync('C:/Users/anike/.antigravity-ide/extensions/boygr.antigravity-account-switcher-1.4.16-universal/dist/extension.js', 'utf8');

const needle = 'gemini:antigravity';
let pos = 0;
while ((pos = content.indexOf(needle, pos)) !== -1) {
  console.log('\n=== MATCH AT:', pos);
  console.log(content.substring(Math.max(0, pos - 50), pos + 300));
  pos += needle.length;
}
