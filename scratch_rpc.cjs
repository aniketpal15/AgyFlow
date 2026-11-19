const http = require('http');
const { execSync } = require('child_process');

try {
  const cmd = `$ProgressPreference = 'SilentlyContinue'; Get-CimInstance Win32_Process -Filter "Name = 'agy.exe'" | Select-Object -ExpandProperty CommandLine`;
  const b64 = Buffer.from(cmd, 'utf16le').toString('base64');
  const out = execSync(`powershell.exe -NoProfile -ExecutionPolicy Bypass -EncodedCommand ${b64}`, { encoding: 'utf8' });
  
  const portMatch = out.match(/--hub-port=(\d+)/i);
  const csrfMatch = out.match(/--csrf_token=([a-zA-Z0-9-]+)/i);
  console.log('Port:', portMatch?.[1], 'CSRF:', csrfMatch?.[1]);
  if (portMatch && csrfMatch) {
    const req = http.request({
      hostname: '127.0.0.1',
      port: parseInt(portMatch[1], 10),
      path: '/exa.language_server_pb.LanguageServerService/GetUserStatus',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Connect-Protocol-Version': '1',
        'x-codeium-csrf-token': csrfMatch[1]
      }
    }, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        const json = JSON.parse(data);
        console.log('Email in language server:', json.userStatus?.email);
        console.log('Configs count:', json.userStatus?.cascadeModelConfigData?.clientModelConfigs?.length);
        for (const c of json.userStatus?.cascadeModelConfigData?.clientModelConfigs || []) {
          console.log(`- label: "${c.label}", modelId: "${c.modelId}", quotaInfo:`, JSON.stringify(c.quotaInfo));
        }
      });
    });
    req.write('{}');
    req.end();
  }
} catch (e) {
  console.error(e);
}
