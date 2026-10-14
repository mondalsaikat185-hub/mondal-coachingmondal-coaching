import puppeteer from 'puppeteer';

const PROD_URL = 'https://mondal-coachingmondal-coaching.vercel.app';
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function run() {
  console.log('--- Measuring Production Baseline DOM Nodes ---');
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });

  await page.goto(`${PROD_URL}/#/login`, { waitUntil: 'networkidle2' });
  await sleep(1500);

  // Student login
  await page.type('input[type="tel"]', '9999999901');
  await page.type('input[placeholder="••••"]', 'test1234');
  await page.click('button[type="submit"]');

  await page.waitForFunction(() => window.location.hash.includes('student'), { timeout: 15000 });
  await sleep(2000);

  // Go to Library
  await page.goto(`${PROD_URL}/#/student/library`, { waitUntil: 'networkidle2' });
  await sleep(2500);

  const libraryMetrics = await page.evaluate(() => {
    const totalNodes = document.querySelectorAll('*').length;
    const cards = document.querySelectorAll('.grid > div');
    const folderElements = Array.from(cards).filter(c => c.innerText.includes('Directory') || c.querySelector('svg'));
    return {
      totalDomNodes: totalNodes,
      gridChildrenCount: cards.length,
      htmlLength: document.documentElement.outerHTML.length
    };
  });

  console.log('Library Root Metrics:', libraryMetrics);

  // Open first folder
  const firstFolder = await page.$('.grid > div');
  if (firstFolder) {
    await firstFolder.click();
    await sleep(2000);

    const folderMetrics = await page.evaluate(() => {
      const totalNodes = document.querySelectorAll('*').length;
      const cards = document.querySelectorAll('.grid > div');
      return {
        totalDomNodes: totalNodes,
        gridChildrenCount: cards.length
      };
    });
    console.log('Inside First Folder Metrics:', folderMetrics);
  }

  // Test search
  await page.type('input[placeholder="Search materials..."]', 'the');
  await sleep(1500);

  const searchMetrics = await page.evaluate(() => {
    const totalNodes = document.querySelectorAll('*').length;
    const cards = document.querySelectorAll('.grid > div');
    return {
      totalDomNodes: totalNodes,
      gridChildrenCount: cards.length
    };
  });
  console.log('Search "the" Metrics:', searchMetrics);

  // Go to Exams
  await page.goto(`${PROD_URL}/#/student/exams`, { waitUntil: 'networkidle2' });
  await sleep(2500);

  const examsMetrics = await page.evaluate(() => {
    const totalNodes = document.querySelectorAll('*').length;
    const cards = document.querySelectorAll('.grid > div');
    return {
      totalDomNodes: totalNodes,
      gridChildrenCount: cards.length
    };
  });
  console.log('Exams Root Metrics:', examsMetrics);

  await browser.close();
}

run().catch(console.error);
