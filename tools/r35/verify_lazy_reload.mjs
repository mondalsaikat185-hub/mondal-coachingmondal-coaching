import puppeteer from 'puppeteer';
import http from 'http';
import fs from 'fs';
import path from 'path';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
};

function createStaticServer(port = 4173) {
  const distDir = path.join(process.cwd(), 'dist');
  const server = http.createServer((req, res) => {
    let cleanUrl = req.url.split('?')[0];
    let filePath = path.join(distDir, cleanUrl);

    if (cleanUrl === '/' || !path.extname(cleanUrl)) {
      filePath = path.join(distDir, 'index.html');
    }

    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
      const ext = path.extname(filePath);
      res.writeHead(200, {
        'Content-Type': mimeTypes[ext] || 'application/octet-stream',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'no-store',
      });
      fs.createReadStream(filePath).pipe(res);
    } else {
      const indexPath = path.join(distDir, 'index.html');
      res.writeHead(200, {
        'Content-Type': 'text/html; charset=utf-8',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'no-store',
      });
      fs.createReadStream(indexPath).pipe(res);
    }
  });

  return new Promise((resolve) => {
    server.listen(port, () => {
      console.log(`Static server started on http://127.0.0.1:${port}`);
      resolve(server);
    });
  });
}

async function verify() {
  const server = await createStaticServer(4173);
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 390, height: 844, isMobile: true });

    let interceptChunk = false;
    let interceptedCount = 0;

    await page.setRequestInterception(true);
    page.on('request', req => {
      const u = req.url();
      if (interceptChunk && u.includes('StudentPayments')) {
        interceptedCount++;
        console.log(`[NETWORK] Intercepted chunk #${interceptedCount} with 404: ${u.split('/').pop()}`);
        req.respond({ status: 404, contentType: 'text/plain', body: 'Not found' });
        return;
      }
      req.continue();
    });

    page.on('console', msg => {
      const t = msg.text();
      if (t.includes('lazyWithReload') || t.includes('Error') || t.includes('নতুন')) {
        console.log(`[PAGE CONSOLE] ${t}`);
      }
    });

    console.log('Navigating to app...');
    await page.goto('http://127.0.0.1:4173/', { waitUntil: 'networkidle2' });
    await sleep(1000);

    // Login as student
    const phoneInput = await page.$('input[type="tel"]');
    if (phoneInput) {
      console.log('Logging in with 9999999901...');
      await page.type('input[type="tel"]', '9999999901');
      await page.type('input[placeholder="••••"]', '9999999901');
      await page.click('button[type="submit"]');

      // Wait until we are redirected away from login
      console.log('Waiting for login redirect...');
      await page.waitForFunction(() => !window.location.hash.includes('login'), { timeout: 20000 });
      console.log('Logged in successfully! Current URL:', page.url());
    }

    // Now enable chunk interception
    interceptChunk = true;
    console.log('Chunk interception ENABLED. Navigating to payments...');

    // Navigate to #/student/payments
    let reloadCount = 0;
    page.on('framenavigated', frame => {
      if (frame === page.mainFrame()) {
        reloadCount++;
        console.log(`[NAVIGATED] Main frame navigated #${reloadCount} to: ${frame.url()}`);
      }
    });

    await page.evaluate(() => {
      window.location.hash = '#/student/payments';
    });

    // Wait for the reload and fallback to occur
    console.log('Waiting 6 seconds for reload and fallback UI...');
    await sleep(6000);

    const bodyText = await page.evaluate(() => document.body.innerText);
    const hasBengali = bodyText.includes('নতুন আপডেট এসেছে, পেজটি রিফ্রেশ করুন');
    const hasBtn = bodyText.includes('এখনই রিফ্রেশ করুন');

    console.log('\n--- VERIFICATION RESULT ---');
    console.log(`Total chunk 404s intercepted: ${interceptedCount}`);
    console.log(`Total frame navigations (reloads): ${reloadCount}`);
    console.log(`Bengali fallback text visible: ${hasBengali ? 'YES (PASS)' : 'NO (FAIL)'}`);
    console.log(`Refresh button visible: ${hasBtn ? 'YES (PASS)' : 'NO (FAIL)'}`);

  } catch (err) {
    console.error('Error during verification:', err);
  } finally {
    await browser.close();
    server.close();
  }
}

verify().catch(console.error);
