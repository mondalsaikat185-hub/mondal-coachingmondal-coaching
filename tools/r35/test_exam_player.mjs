import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const SCREENSHOT_DIR = 'tools/r35/screenshots';

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function run() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });

  const setTheme = async (theme) => {
    await page.evaluate((t) => {
      localStorage.setItem('tuition-theme', t);
      if (t === 'dark') {
        document.documentElement.classList.add('dark');
        document.documentElement.classList.remove('light');
      } else {
        document.documentElement.classList.remove('dark');
        document.documentElement.classList.add('light');
      }
    }, theme);
    await sleep(400);
  };

  try {
    console.log('[1] Logging in as student...');
    await page.goto('http://127.0.0.1:4173/#/login');
    await page.waitForSelector('input[type="tel"]');
    await page.type('input[type="tel"]', '9999999901');
    await page.type('input[placeholder="••••"]', '9999999901');
    await page.click('button[type="submit"]');
    await sleep(3000);

    console.log('[2] Navigating to Math Exam folder...');
    await page.goto('http://127.0.0.1:4173/#/exams?folder=PbYRthGnLCM5a6HAoRry&mode=folders');
    await sleep(2000);

    const folderItems = await page.evaluate(() => {
      const els = Array.from(document.querySelectorAll('h4, .font-black'));
      return els.map(e => e.innerText.trim()).filter(Boolean);
    });
    console.log('Math folder items:', folderItems.slice(0, 8));

    // Navigate to Simple Interest folder
    const siFolderId = '047179bf-9d97-4d21-94ac-e070d5841b32';
    console.log('[3] Navigating to Simple Interest folder...');
    await page.goto(`http://127.0.0.1:4173/#/exams?folder=${siFolderId}&mode=folders`);
    await sleep(2000);

    const siItems = await page.evaluate(() => {
      const cards = Array.from(document.querySelectorAll('h4, .font-black'));
      return cards.map(c => c.innerText.trim()).filter(Boolean);
    });
    console.log('Simple Interest items:', siItems);

    // Look for exam preview or button to start exam
    // In R29, preview ID was 'AwEzKl2aumrwWvnZA4zc'
    console.log('[4] Opening Exam Preview modal (AwEzKl2aumrwWvnZA4zc)...');
    await page.goto(`http://127.0.0.1:4173/#/exams?folder=${siFolderId}&preview=AwEzKl2aumrwWvnZA4zc&mode=folders`);
    await sleep(2500);

    await setTheme('light');
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '09_exam_modal_light.png') });
    console.log('Saved: 09_exam_modal_light.png');

    await setTheme('dark');
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '10_exam_modal_dark.png') });
    console.log('Saved: 10_exam_modal_dark.png');

    // Check if UnifiedQuizPlayer rendered
    const hasPlayer = await page.evaluate(() => {
      return document.body.innerText.includes('Question') || document.body.innerText.includes('প্রশ্ন') || !!document.querySelector('.mc-quiz-player');
    });
    console.log('Has Quiz Player rendered:', hasPlayer);

    if (hasPlayer) {
      await setTheme('light');
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, '11_exam_running_light.png') });
      console.log('Saved: 11_exam_running_light.png');

      await setTheme('dark');
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, '12_exam_running_dark.png') });
      console.log('Saved: 12_exam_running_dark.png');

      // Answer option 1 and submit
      console.log('[5] Answering question and submitting...');
      await page.evaluate(() => {
        const option = document.querySelector('button[data-option], .quiz-option, input[type="radio"]');
        if (option) option.click();
      });
      await sleep(600);

      await page.evaluate(() => {
        const btns = Array.from(document.querySelectorAll('button'));
        const sub = btns.find(b => b.innerText.includes('SUBMIT') || b.innerText.includes('জমা') || b.innerText.includes('Submit'));
        if (sub) sub.click();
      });
      await sleep(1000);

      await page.evaluate(() => {
        const btns = Array.from(document.querySelectorAll('button'));
        const conf = btns.find(b => b.innerText.includes('CONFIRM') || b.innerText.includes('হ্যাঁ') || b.innerText.includes('Confirm'));
        if (conf) conf.click();
      });
      await sleep(2500);

      await setTheme('light');
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, '13_exam_result_light.png') });
      console.log('Saved: 13_exam_result_light.png');

      await setTheme('dark');
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, '14_exam_result_dark.png') });
      console.log('Saved: 14_exam_result_dark.png');
    }

  } finally {
    await browser.close();
  }
}

run().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
