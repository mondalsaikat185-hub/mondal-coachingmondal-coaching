import puppeteer from 'puppeteer';
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

  const ADMIN_USER = {
    id: 'gsDmWDKO8Xc5wCkwvCP8RxoNR123',
    uid: 'gsDmWDKO8Xc5wCkwvCP8RxoNR123',
    email: 'saikatmondal@gmail.com',
    name: 'Saikat Mondal',
    displayName: 'Saikat Mondal',
    fullName: 'Saikat Mondal',
    phone: '9432490498',
    role: 'admin',
    status: 'active',
    isProfileComplete: true
  };
  const ADMIN_TOKEN = 'valid_admin_token';

  await page.evaluateOnNewDocument((user, token) => {
    localStorage.setItem('mc_session_user', JSON.stringify(user));
    localStorage.setItem('mc_session_token', token);
  }, ADMIN_USER, ADMIN_TOKEN);

  try {
    console.log('[1] Opening Exam preview in AdminExams...');
    await page.goto('http://127.0.0.1:4173/#/admin/exams?preview=3HjL2MTZccRdAFYNcVVO', { waitUntil: 'networkidle2' });
    await sleep(2500);

    // 1. Check agreement checkbox
    console.log('[2] Checking agreement checkbox and proceeding to Landing...');
    await page.evaluate(() => {
      const cb = document.querySelector('input[type="checkbox"]');
      if (cb) cb.click();
    });
    await sleep(500);

    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const nextBtn = btns.find(b => b.innerText.includes('Acknowledge') || b.innerText.includes('Next'));
      if (nextBtn) nextBtn.click();
    });
    await sleep(1500);

    // 2. Click Begin Assessment
    console.log('[3] Clicking Begin Assessment...');
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const startBtn = btns.find(b => b.innerText.includes('Begin') || b.innerText.includes('Assessment'));
      if (startBtn) startBtn.click();
    });
    await sleep(2000);

    // Now on QUIZ screen!
    console.log('[4] On active QUIZ screen! Capturing running exam in light & dark...');
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '09_exam_player_light.png') });
    console.log('Saved: 09_exam_player_light.png');

    await page.evaluate(() => {
      localStorage.setItem('tuition-theme', 'dark');
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
    });
    await sleep(500);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '10_exam_player_dark.png') });
    console.log('Saved: 10_exam_player_dark.png');

    // Select option A
    console.log('[5] Selecting answer option...');
    await page.evaluate(() => {
      const option = document.querySelector('button.border, .quiz-option, button.text-left');
      if (option) option.click();
    });
    await sleep(800);

    // Click Submit
    console.log('[6] Submitting exam...');
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const sub = btns.find(b => b.innerText.includes('SUBMIT') || b.innerText.includes('Submit'));
      if (sub) sub.click();
    });
    await sleep(1200);

    // Confirm dialog
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const conf = btns.find(b => b.innerText.includes('CONFIRM') || b.innerText.includes('Confirm') || b.innerText.includes('হ্যাঁ'));
      if (conf) conf.click();
    });
    await sleep(2500);

    // On RESULT screen!
    console.log('[7] On RESULT screen! Capturing result in light & dark...');
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '11_exam_result_dark.png') });
    console.log('Saved: 11_exam_result_dark.png');

    await page.evaluate(() => {
      localStorage.setItem('tuition-theme', 'light');
      document.documentElement.classList.remove('dark');
      document.documentElement.classList.add('light');
    });
    await sleep(500);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '12_exam_result_light.png') });
    console.log('Saved: 12_exam_result_light.png');

    console.log('\n✅ ALL EXAM QUIZ PLAYER & RESULT SCREENSHOTS CAPTURED SUCCESSFULLY!');
  } finally {
    await browser.close();
  }
}

run().catch(e => {
  console.error(e);
  process.exit(1);
});
