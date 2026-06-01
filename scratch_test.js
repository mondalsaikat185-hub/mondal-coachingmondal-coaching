const http = require('https');

const payload = JSON.stringify({ action: 'apiGetUsers', args: [] });

const options = {
  hostname: 'script.google.com',
  path: '/macros/s/AKfycbxBtlORQYtnf4ByrnEJWSoDBbOkJz4KfublmkFQrmniiH3G-kZyntkNVpfaaDImmLgnaA/exec',
  method: 'POST',
  headers: {
    'Content-Type': 'text/plain;charset=utf-8',
    'Content-Length': Buffer.byteLength(payload)
  }
};

const req = http.request(options, (res) => {
  let data = '';
  
  // Apps Script returns a 302 redirect
  if (res.statusCode === 302 || res.statusCode === 301) {
    const redirectUrl = res.headers.location;
    // Follow redirect
    const redirectReq = http.request(redirectUrl, { method: 'GET' }, (redirectRes) => {
      let redirectData = '';
      redirectRes.on('data', (chunk) => { redirectData += chunk; });
      redirectRes.on('end', () => {
        try {
          const parsed = JSON.parse(redirectData);
          console.log(JSON.stringify(parsed, null, 2));
        } catch(e) {
          console.log("Raw redirect response:", redirectData.substring(0, 1000));
        }
      });
    });
    redirectReq.end();
    return;
  }

  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    console.log("Response:", data);
  });
});

req.on('error', (error) => {
  console.error("Error:", error);
});

req.write(payload);
req.end();
