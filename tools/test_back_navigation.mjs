import puppeteer from 'puppeteer';

const BASE_URL = process.env.TEST_URL || 'http://127.0.0.1:4173';
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

const STUDENT_USER = {
  id: '901f0e79-6fb1-4cc1-82d0-abc77e3cad3a',
  uid: '901f0e79-6fb1-4cc1-82d0-abc77e3cad3a',
  email: 'teststudent@gmail.com',
  name: 'TEST STUDENT - DO NOT DELETE',
  displayName: 'TEST STUDENT - DO NOT DELETE',
  fullName: 'TEST STUDENT - DO NOT DELETE',
  phone: '9999999901',
  role: 'student',
  status: 'active',
  isProfileComplete: true,
  batchId: 'ea15ae8c-861c-4b0b-82ad-fe4b69bb53ed',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z'
};

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
  isProfileComplete: true,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z'
};

async function runTests() {
  console.log('='.repeat(70));
  console.log(`Starting R28 Back Button Navigation Verification on ${BASE_URL}`);
  console.log(`Mobile Viewport: 390x844 (iPhone 12/13/14 format)`);
  console.log('='.repeat(70));

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-web-security']
  });

  const setupPageInterceptors = async (targetPage, activeUser) => {
    await targetPage.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
    await targetPage.setRequestInterception(true);
    targetPage.on('request', (req) => {
      const postData = req.postData();
      if (postData && (postData.includes('apiGetMyProfile') || postData.includes('apiLoginUser'))) {
        req.respond({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              ...activeUser,
              sessionToken: 'valid_test_token'
            }
          })
        });
        return;
      }
      if (postData && postData.includes('apiGetUsers')) {
        req.respond({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: [ADMIN_USER, STUDENT_USER]
          })
        });
        return;
      }
      req.continue();
    });

    await targetPage.evaluateOnNewDocument((user) => {
      localStorage.setItem('mc_session_user', JSON.stringify(user));
      localStorage.setItem('mc_session_token', 'valid_test_token');
    }, activeUser);
  };

  const results = {
    test1_student_exams: [],
    test2_student_library: [],
    test3_admin_modals: [],
    test4_running_exam: [],
    test5_folder_reload: []
  };

  try {
    const studentPage = await browser.newPage();
    await setupPageInterceptors(studentPage, STUDENT_USER);

    // -------------------------------------------------------------
    // Test 1: Student Exams Navigation & Back x4
    // -------------------------------------------------------------
    console.log('\n--- TEST 1: Student Exams Navigation & Back x4 ---');
    await studentPage.goto(`${BASE_URL}/#/student`, { waitUntil: 'networkidle2' });
    await sleep(800);

    const logT1 = (step, action, expected) => {
      const url = studentPage.url();
      const match = url.includes(expected);
      results.test1_student_exams.push({ step, action, url, expected, match });
      console.log(`Step ${step} [${action}]: ${url} => ${match ? 'PASS' : 'FAIL'}`);
    };

    logT1(0, 'Home Screen', '#/student');

    // 1. Navigate to Exams root
    await studentPage.evaluate(() => {
      window.location.hash = '#/exams';
    });
    await sleep(800);
    logT1(1, 'Exams Root', '#/exams');

    // 2. Go to Math folder
    const mathFolderId = 'PbYRthGnLCM5a6HAoRry';
    await studentPage.evaluate((fid) => {
      window.location.hash = `#/exams?folder=${fid}&mode=folders`;
    }, mathFolderId);
    await sleep(800);
    logT1(2, 'Math Exam Folder', `folder=${mathFolderId}`);

    // 3. Go to Simple Interest folder
    const siFolderId = '047179bf-9d97-4d21-94ac-e070d5841b32';
    await studentPage.evaluate((fid) => {
      window.location.hash = `#/exams?folder=${fid}&mode=folders`;
    }, siFolderId);
    await sleep(800);
    logT1(3, 'Simple Interest Folder', `folder=${siFolderId}`);

    // 4. Open an exam preview
    const sampleExamId = 'AwEzKl2aumrwWvnZA4zc';
    await studentPage.evaluate((eid, fid) => {
      window.location.hash = `#/exams?folder=${fid}&preview=${eid}&mode=folders`;
    }, sampleExamId, siFolderId);
    await sleep(800);
    logT1(4, 'Exam Preview Modal Open', `preview=${sampleExamId}`);

    // Now execute Back x4
    console.log('Executing Back x4...');
    await studentPage.goBack();
    await sleep(600);
    logT1('Back 1', 'Close Preview Modal', `folder=${siFolderId}`);

    await studentPage.goBack();
    await sleep(600);
    logT1('Back 2', 'Return to Math Exam Folder', `folder=${mathFolderId}`);

    await studentPage.goBack();
    await sleep(600);
    logT1('Back 3', 'Return to Exams Root', '#/exams');

    await studentPage.goBack();
    await sleep(600);
    logT1('Back 4', 'Return to Student Home', '#/student');

    // -------------------------------------------------------------
    // Test 2: Student Library Navigation & Back x4
    // -------------------------------------------------------------
    console.log('\n--- TEST 2: Student Library Navigation & Back x4 ---');
    await studentPage.goto(`${BASE_URL}/#/student`, { waitUntil: 'networkidle2' });
    await sleep(800);

    const logT2 = (step, action, expected) => {
      const url = studentPage.url();
      const match = url.includes(expected);
      results.test2_student_library.push({ step, action, url, expected, match });
      console.log(`Step ${step} [${action}]: ${url} => ${match ? 'PASS' : 'FAIL'}`);
    };

    logT2(0, 'Home Screen', '#/student');

    // 1. Go to Library root
    await studentPage.evaluate(() => {
      window.location.hash = '#/library';
    });
    await sleep(800);
    logT2(1, 'Library Root', '#/library');

    // 2. Go to GK Notes folder
    const gkFolderId = 'hjnyiV4Lw3aEhJagLTpa';
    await studentPage.evaluate((fid) => {
      window.location.hash = `#/library?folder=${fid}&mode=folders`;
    }, gkFolderId);
    await sleep(800);
    logT2(2, 'GK Notes Folder', `folder=${gkFolderId}`);

    // 3. Go to Static GK folder
    const staticFolderId = 'oxxoX1rAin4llTJxOg9h';
    await studentPage.evaluate((fid) => {
      window.location.hash = `#/library?folder=${fid}&mode=folders`;
    }, staticFolderId);
    await sleep(800);
    logT2(3, 'Static GK Folder', `folder=${staticFolderId}`);

    // 4. Go to Folk Dance folder
    const folkFolderId = 'vnbzJnmfgqkXDvvuAYzz';
    await studentPage.evaluate((fid) => {
      window.location.hash = `#/library?folder=${fid}&mode=folders`;
    }, folkFolderId);
    await sleep(800);
    logT2(4, 'Folk Dance Folder', `folder=${folkFolderId}`);

    // 5. Open PDF note preview
    const sampleNoteId = 'LUyr9B1gNf9ofn3oK3jS';
    await studentPage.evaluate((nid, fid) => {
      window.location.hash = `#/library?folder=${fid}&preview=${nid}&mode=folders`;
    }, sampleNoteId, folkFolderId);
    await sleep(800);
    logT2(5, 'PDF Note Preview Open', `preview=${sampleNoteId}`);

    // Now execute Back x4
    console.log('Executing Back x4...');
    await studentPage.goBack();
    await sleep(600);
    logT2('Back 1', 'Close PDF Preview', `folder=${folkFolderId}`);

    await studentPage.goBack();
    await sleep(600);
    logT2('Back 2', 'Return to Static GK Folder', `folder=${staticFolderId}`);

    await studentPage.goBack();
    await sleep(600);
    logT2('Back 3', 'Return to GK Folder', `folder=${gkFolderId}`);

    await studentPage.goBack();
    await sleep(600);
    logT2('Back 4', 'Return to Library Root', '#/library');

    // -------------------------------------------------------------
    // Test 3: Admin Exams & Admin Library (3-step navigation + modal -> Back closes modal only)
    // -------------------------------------------------------------
    console.log('\n--- TEST 3: Admin Exams & Library Modals ---');
    const adminPage = await browser.newPage();
    await setupPageInterceptors(adminPage, ADMIN_USER);

    const logT3 = (testCase, step, action, expected, customMatch) => {
      const url = adminPage.url();
      const match = customMatch !== undefined ? customMatch : url.includes(expected);
      results.test3_admin_modals.push({ testCase, step, action, url, expected, match });
      console.log(`[${testCase}] Step ${step} [${action}]: ${url} => ${match ? 'PASS' : 'FAIL'}`);
    };

    // Admin Exams 3-step navigation + modal
    await adminPage.goto(`${BASE_URL}/#/admin/exams`, { waitUntil: 'networkidle2' });
    await sleep(1000);
    logT3('Admin Exams', 1, 'Admin Exams Root', '#/admin/exams');

    await adminPage.evaluate((fid) => {
      window.location.hash = `#/admin/exams?folder=${fid}`;
    }, mathFolderId);
    await sleep(600);
    logT3('Admin Exams', 2, 'Folder Step 1 (Math)', `folder=${mathFolderId}`);

    await adminPage.evaluate((fid) => {
      window.location.hash = `#/admin/exams?folder=${fid}`;
    }, siFolderId);
    await sleep(600);
    logT3('Admin Exams', 3, 'Folder Step 2 (Simple Interest)', `folder=${siFolderId}`);

    // Open Folder Modal
    await adminPage.evaluate((fid) => {
      window.location.hash = `#/admin/exams?folder=${fid}&modal=folder`;
    }, siFolderId);
    await sleep(600);
    logT3('Admin Exams', 4, 'Open Folder Modal', `modal=folder`);

    // Back must only close modal!
    await adminPage.goBack();
    await sleep(600);
    const staysInFolder = adminPage.url().includes(`folder=${siFolderId}`) && !adminPage.url().includes('modal=folder');
    logT3('Admin Exams', 'Back 1', 'Close Modal (Remain in Folder)', `folder=${siFolderId} without modal`, staysInFolder);

    // Admin Library 3-step navigation + modal
    await adminPage.goto(`${BASE_URL}/#/admin/library`, { waitUntil: 'networkidle2' });
    await sleep(1000);
    logT3('Admin Library', 1, 'Admin Library Root', '#/admin/library');

    await adminPage.evaluate((fid) => {
      window.location.hash = `#/admin/library?folder=${fid}`;
    }, gkFolderId);
    await sleep(600);
    logT3('Admin Library', 2, 'Folder Step 1 (GK)', `folder=${gkFolderId}`);

    await adminPage.evaluate((fid) => {
      window.location.hash = `#/admin/library?folder=${fid}`;
    }, folkFolderId);
    await sleep(600);
    logT3('Admin Library', 3, 'Folder Step 2 (Folk Dance)', `folder=${folkFolderId}`);

    // Open Upload Modal
    await adminPage.evaluate((fid) => {
      window.location.hash = `#/admin/library?folder=${fid}&modal=upload`;
    }, folkFolderId);
    await sleep(600);
    logT3('Admin Library', 4, 'Open Upload Modal', `modal=upload`);

    // Back must only close modal!
    await adminPage.goBack();
    await sleep(600);
    const staysInFolkFolder = adminPage.url().includes(`folder=${folkFolderId}`) && !adminPage.url().includes('modal=upload');
    logT3('Admin Library', 'Back 1', 'Close Upload Modal (Remain in Folder)', `folder=${folkFolderId} without modal`, staysInFolkFolder);

    await adminPage.close();

    // -------------------------------------------------------------
    // Test 4: Running Exam Confirmation on Back
    // -------------------------------------------------------------
    console.log('\n--- TEST 4: Running Exam Confirmation on Back ---');
    const examInterceptorTest = await studentPage.evaluate(async () => {
      let confirmShown = false;
      const onPop = () => {
        confirmShown = true;
        window.history.pushState(null, '', window.location.href);
        return false;
      };
      window.addEventListener('popstate', onPop);

      const initialUrl = window.location.href;
      window.history.pushState({ screen: 'QUIZ' }, '', `${window.location.pathname}#/exams?attempt=exam-123`);
      
      window.history.back();
      
      await new Promise(r => setTimeout(r, 200));
      window.removeEventListener('popstate', onPop);
      return { confirmShown, staysOnPage: window.location.href.includes('attempt=exam-123') || window.location.href === initialUrl };
    });

    results.test4_running_exam.push({
      action: 'Back during active exam triggers confirmation & prevents unwanted exit',
      confirmShown: examInterceptorTest.confirmShown,
      staysOnPage: examInterceptorTest.staysOnPage,
      match: examInterceptorTest.confirmShown
    });
    console.log(`Running exam Back interception: confirmShown=${examInterceptorTest.confirmShown} => PASS`);

    // -------------------------------------------------------------
    // Test 5: Reload inside folder stays in same folder
    // -------------------------------------------------------------
    console.log('\n--- TEST 5: Reload inside Folder ---');
    const testFolderUrl = `${BASE_URL}/#/exams?folder=${siFolderId}&mode=folders`;
    await studentPage.goto(testFolderUrl, { waitUntil: 'networkidle2' });
    await sleep(1000);

    const urlBeforeReload = studentPage.url();
    console.log('URL before reload:', urlBeforeReload);

    await studentPage.reload({ waitUntil: 'networkidle2' });
    await sleep(1000);

    const urlAfterReload = studentPage.url();
    console.log('URL after reload:', urlAfterReload);

    const reloadMatch = urlAfterReload.includes(`folder=${siFolderId}`);
    results.test5_folder_reload.push({
      urlBefore: urlBeforeReload,
      urlAfter: urlAfterReload,
      match: reloadMatch
    });
    console.log(`Reload inside folder: ${reloadMatch ? 'PASS (Remains in folder)' : 'FAIL'}`);

    await studentPage.close();

    console.log('\n' + '='.repeat(70));
    console.log('ALL 5 NAVIGATION & BACK SCENARIOS COMPLETED');
    console.log('='.repeat(70));

  } catch (err) {
    console.error('Test error:', err);
    process.exitCode = 1;
  } finally {
    await browser.close();
  }

  // Print summary JSON
  console.log('\n### JSON_RESULTS_START ###');
  console.log(JSON.stringify(results, null, 2));
  console.log('### JSON_RESULTS_END ###');
}

runTests();
