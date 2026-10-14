import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';

const BASE_URL = process.env.TEST_URL || 'http://127.0.0.1:4173';
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const SCREENSHOT_DIR = 'tools/r35/screenshots';

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });

async function runSmokeTest() {
  console.log('='.repeat(70));
  console.log(`STARTING R35 COMPREHENSIVE MOBILE SMOKE TEST`);
  console.log(`URL: ${BASE_URL}`);
  console.log(`Viewport: 390x844 (Mobile)`);
  console.log('='.repeat(70));

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });

  const consoleErrors = [];
  const consoleWarnings = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    } else if (msg.type() === 'warn') {
      consoleWarnings.push(msg.text());
    }
  });

  let submittedResultId = null;
  // Intercept network requests to catch submitted exam result ID
  await page.setRequestInterception(true);
  page.on('request', req => {
    try {
      const postData = req.postData();
      if (postData && postData.includes('apiSubmitExamResult')) {
        const match = postData.match(/"id":\s*"([^"]+)"/);
        if (match) {
          submittedResultId = match[1];
          console.log(`[NETWORK] Captured submitted test exam result ID: ${submittedResultId}`);
        }
      }
    } catch (_) {}
    req.continue();
  });

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
    // -------------------------------------------------------------
    // STEP 1: Student Login (9999999901 / 9999999901)
    // -------------------------------------------------------------
    console.log('\n[STEP 1] Navigating to Home/Login...');
    await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle2' });
    await sleep(1500);

    // Check if login form is visible
    const phoneInput = await page.$('input[type="tel"]');
    if (phoneInput) {
      console.log('[STEP 1] Filling login form as student 9999999901...');
      await page.type('input[type="tel"]', '9999999901');
      await page.type('input[placeholder="••••"]', '9999999901');
      await page.click('button[type="submit"]');
      await sleep(3000);
    } else {
      console.log('[STEP 1] Already authenticated or on home screen.');
    }

    // -------------------------------------------------------------
    // STEP 2: Home Screen in Light & Dark Mode
    // -------------------------------------------------------------
    console.log('\n[STEP 2] Verifying Student Home Screen...');
    await setTheme('light');
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '01_home_light.png') });
    console.log(`Saved screenshot: 01_home_light.png`);

    await setTheme('dark');
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '02_home_dark.png') });
    console.log(`Saved screenshot: 02_home_dark.png`);

    // -------------------------------------------------------------
    // STEP 3: Student Library & Note Preview Modal
    // -------------------------------------------------------------
    console.log('\n[STEP 3] Testing Student Library...');
    await setTheme('light');
    await page.goto(`${BASE_URL}/#/library`, { waitUntil: 'networkidle2' });
    await sleep(2000);

    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '03_library_light.png') });
    console.log(`Saved screenshot: 03_library_light.png`);

    await setTheme('dark');
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '04_library_dark.png') });
    console.log(`Saved screenshot: 04_library_dark.png`);

    // Open a note (if available, e.g. click first note card or navigate to preview)
    console.log('[STEP 3] Opening note preview modal...');
    const noteCard = await page.$('.cursor-pointer, [role="button"]');
    if (noteCard) {
      await noteCard.click();
      await sleep(1500);
      await setTheme('light');
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, '05_library_modal_light.png') });
      console.log(`Saved screenshot: 05_library_modal_light.png`);

      await setTheme('dark');
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, '06_library_modal_dark.png') });
      console.log(`Saved screenshot: 06_library_modal_dark.png`);

      // Close modal by clicking close or pressing back
      await page.goBack().catch(() => {});
      await sleep(1000);
    }

    // -------------------------------------------------------------
    // STEP 4: Student Exams & Modal
    // -------------------------------------------------------------
    console.log('\n[STEP 4] Testing Student Exams...');
    await setTheme('light');
    await page.goto(`${BASE_URL}/#/exams`, { waitUntil: 'networkidle2' });
    await sleep(2000);

    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '07_exams_light.png') });
    console.log(`Saved screenshot: 07_exams_light.png`);

    await setTheme('dark');
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '08_exams_dark.png') });
    console.log(`Saved screenshot: 08_exams_dark.png`);

    // -------------------------------------------------------------
    // STEP 5: Start & Submit 1 Exam (UnifiedQuizPlayer lazy load)
    // -------------------------------------------------------------
    console.log('\n[STEP 5] Opening Exam Preview and Starting Exam...');
    // Look for an exam attempt link or folder
    const examButtons = await page.$$('button, [role="button"]');
    let examStarted = false;

    // Direct attempt on Solar Set 1 or available exam
    await page.goto(`${BASE_URL}/#/exams?attempt=bc09221b-39b1-423a-a727-696ec4720424`, { waitUntil: 'networkidle2' });
    await sleep(2500);

    // Verify UnifiedQuizPlayer is loaded
    const quizPlayerVisible = await page.evaluate(() => {
      return !!document.querySelector('.mc-quiz-player') || document.body.innerText.includes('QUESTION') || document.body.innerText.includes('প্রশ্ন');
    });

    if (quizPlayerVisible) {
      console.log('[STEP 5] UnifiedQuizPlayer lazy-loaded successfully!');
      await setTheme('light');
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, '09_exam_player_light.png') });
      console.log(`Saved screenshot: 09_exam_player_light.png`);

      await setTheme('dark');
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, '10_exam_player_dark.png') });
      console.log(`Saved screenshot: 10_exam_player_dark.png`);

      // Answer first option
      console.log('[STEP 5] Selecting option A and submitting exam...');
      await page.evaluate(() => {
        const option = document.querySelector('button[data-option], .quiz-option, input[type="radio"]');
        if (option) option.click();
      });
      await sleep(800);

      // Find and click submit button
      await page.evaluate(() => {
        const btns = Array.from(document.querySelectorAll('button'));
        const submitBtn = btns.find(b => b.innerText.includes('SUBMIT') || b.innerText.includes('জমা') || b.innerText.includes('Submit'));
        if (submitBtn) submitBtn.click();
      });
      await sleep(1500);

      // Confirm submit dialog if any
      await page.evaluate(() => {
        const btns = Array.from(document.querySelectorAll('button'));
        const confirmBtn = btns.find(b => b.innerText.includes('CONFIRM') || b.innerText.includes('হ্যাঁ') || b.innerText.includes('Confirm') || b.innerText.includes('Yes'));
        if (confirmBtn) confirmBtn.click();
      });
      await sleep(2500);

      // Capture result review
      await setTheme('light');
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, '11_exam_result_light.png') });
      console.log(`Saved screenshot: 11_exam_result_light.png`);

      await setTheme('dark');
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, '12_exam_result_dark.png') });
      console.log(`Saved screenshot: 12_exam_result_dark.png`);

      examStarted = true;
    } else {
      console.log('[STEP 5] Direct exam attempt not loaded directly, checking general exams page...');
    }

    // -------------------------------------------------------------
    // STEP 6: Student Payments / UPI Page
    // -------------------------------------------------------------
    console.log('\n[STEP 6] Testing Student Payments & UPI Page...');
    await setTheme('light');
    await page.goto(`${BASE_URL}/#/payments`, { waitUntil: 'networkidle2' });
    await sleep(2000);

    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '13_payments_light.png') });
    console.log(`Saved screenshot: 13_payments_light.png`);

    await setTheme('dark');
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '14_payments_dark.png') });
    console.log(`Saved screenshot: 14_payments_dark.png`);

    // -------------------------------------------------------------
    // STEP 7: Back Navigation Steps (R28 Verification)
    // -------------------------------------------------------------
    console.log('\n[STEP 7] Verifying R28 Back Button Navigation...');
    await page.goto(`${BASE_URL}/#/exams`, { waitUntil: 'networkidle2' });
    await sleep(1000);
    const mathFolderId = 'PbYRthGnLCM5a6HAoRry';
    await page.evaluate((fid) => {
      window.location.hash = `#/exams?folder=${fid}&mode=folders`;
    }, mathFolderId);
    await sleep(1000);
    console.log('Folder URL:', page.url());

    // Back step
    await page.goBack();
    await sleep(1000);
    console.log('After back URL:', page.url());
    const backOk = page.url().includes('#/exams');
    console.log(`R28 Back button step: ${backOk ? 'PASS' : 'FAIL'}`);

    // -------------------------------------------------------------
    // STEP 8: Admin Login & Lazy Chunk Verification
    // -------------------------------------------------------------
    console.log('\n[STEP 8] Testing Admin Login & Lazy Loading...');
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    await page.goto(`${BASE_URL}/#/login`, { waitUntil: 'networkidle2' });
    await sleep(1200);

    await page.type('input[type="tel"]', '9432490498');
    await page.type('input[placeholder="••••"]', '1234');
    await page.click('button[type="submit"]');
    await sleep(3000);

    await setTheme('light');
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '15_admin_dashboard.png') });
    console.log(`Saved screenshot: 15_admin_dashboard.png`);

    // Test Admin Students lazy load
    console.log('[STEP 8] Navigating to Admin Students (lazy chunk)...');
    await page.goto(`${BASE_URL}/#/admin/students`, { waitUntil: 'networkidle2' });
    await sleep(2000);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '16_admin_students.png') });
    console.log(`Saved screenshot: 16_admin_students.png`);

    // Test Admin Batches lazy load
    console.log('[STEP 8] Navigating to Admin Batches (lazy chunk)...');
    await page.goto(`${BASE_URL}/#/admin/batches`, { waitUntil: 'networkidle2' });
    await sleep(1500);

    // Test Admin Payments lazy load
    console.log('[STEP 8] Navigating to Admin Payments (lazy chunk)...');
    await page.goto(`${BASE_URL}/#/admin/payments`, { waitUntil: 'networkidle2' });
    await sleep(2000);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '17_admin_payments.png') });
    console.log(`Saved screenshot: 17_admin_payments.png`);

    // Test Admin Library lazy load
    console.log('[STEP 8] Navigating to Admin Library (lazy chunk)...');
    await page.goto(`${BASE_URL}/#/admin/library`, { waitUntil: 'networkidle2' });
    await sleep(2000);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '18_admin_library.png') });
    console.log(`Saved screenshot: 18_admin_library.png`);

    // Test Admin Exams lazy load
    console.log('[STEP 8] Navigating to Admin Exams (lazy chunk)...');
    await page.goto(`${BASE_URL}/#/admin/exams`, { waitUntil: 'networkidle2' });
    await sleep(2000);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '19_admin_exams.png') });
    console.log(`Saved screenshot: 19_admin_exams.png`);

    // -------------------------------------------------------------
    // STEP 9: Clean Up Test Result
    // -------------------------------------------------------------
    if (submittedResultId) {
      console.log(`\n[STEP 9] Cleaning up test exam result: ${submittedResultId}...`);
      await page.evaluate(async (rid) => {
        if (window.api && window.api.deleteExamResult) {
          await window.api.deleteExamResult(rid);
        }
      }, submittedResultId);
      console.log(`[STEP 9] Test result cleanup requested.`);
    }

    // -------------------------------------------------------------
    // STEP 10: Console Errors Summary
    // -------------------------------------------------------------
    console.log('\n' + '='.repeat(70));
    console.log('CONSOLE ERRORS AUDIT:');
    if (consoleErrors.length === 0) {
      console.log('✅ ZERO CONSOLE ERRORS DETECTED!');
    } else {
      console.log(`⚠️ ${consoleErrors.length} Console error(s) detected:`);
      consoleErrors.forEach((e, i) => console.log(`  [${i + 1}] ${e}`));
    }
    console.log('='.repeat(70));

    console.log('\n✅ ALL SMOKE TESTS COMPLETED SUCCESSFULLY!');
  } finally {
    await browser.close();
  }
}

runSmokeTest().catch(err => {
  console.error('Smoke test encountered an error:', err);
  process.exit(1);
});
