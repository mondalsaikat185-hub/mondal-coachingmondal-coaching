import fs from 'fs';

async function measureLibraryPayload() {
  console.log('='.repeat(70));
  console.log('MEASURING apiGetLibrary PAYLOAD & PARSE PERFORMANCE');
  console.log('='.repeat(70));

  const VPS_URL = 'https://mc-api-187-127-191-163.sslip.io';
  const SECURITY_TOKEN = process.env.VITE_SECURITY_TOKEN || 'MondalCoachingSecureToken2026!';

  const t0 = performance.now();
  const res = await fetch(`${VPS_URL}/library`, {
    headers: { 'X-MC-Token': SECURITY_TOKEN }
  });
  const t1 = performance.now();

  const text = await res.text();
  const t2 = performance.now();

  const bytes = Buffer.byteLength(text, 'utf8');
  const kb = (bytes / 1024).toFixed(2);
  const mb = (bytes / (1024 * 1024)).toFixed(2);

  console.log(`Download status: ${res.status} ${res.statusText}`);
  console.log(`Payload size (raw): ${bytes.toLocaleString()} bytes (${kb} KB / ${mb} MB)`);
  console.log(`Network transfer time: ${(t1 - t0).toFixed(1)} ms`);
  console.log(`Text read time: ${(t2 - t1).toFixed(1)} ms`);

  // Parse benchmark (10 iterations)
  const parseTimes = [];
  let parsedData = null;
  for (let i = 0; i < 10; i++) {
    const pt0 = performance.now();
    parsedData = JSON.parse(text);
    const pt1 = performance.now();
    parseTimes.push(pt1 - pt0);
  }

  const avgParse = (parseTimes.reduce((a, b) => a + b, 0) / parseTimes.length).toFixed(2);
  const minParse = Math.min(...parseTimes).toFixed(2);
  const maxParse = Math.max(...parseTimes).toFixed(2);

  const items = Array.isArray(parsedData) ? parsedData : (parsedData.data || []);
  console.log(`Items count: ${items.length} items`);
  console.log(`Desktop JSON.parse time: avg ${avgParse} ms (min ${minParse} ms, max ${maxParse} ms)`);

  // Measure simulated 4x CPU throttle (typical mobile CPU slow-down vs desktop)
  const simulatedMobileParse = (parseFloat(avgParse) * 4).toFixed(2);
  console.log(`Estimated 4x Mobile CPU JSON.parse time: ~${simulatedMobileParse} ms`);

  // Analyze structure of library items: why is it so large?
  let totalQuizDataBytes = 0;
  let itemsWithQuizData = 0;
  items.forEach(it => {
    if (it.quizData) {
      itemsWithQuizData++;
      totalQuizDataBytes += Buffer.byteLength(typeof it.quizData === 'string' ? it.quizData : JSON.stringify(it.quizData), 'utf8');
    }
  });

  console.log('\nPayload Breakdown:');
  console.log(`  Items with quizData: ${itemsWithQuizData} / ${items.length}`);
  console.log(`  QuizData total size: ${(totalQuizDataBytes / 1024).toFixed(2)} KB (${((totalQuizDataBytes / bytes) * 100).toFixed(1)}% of total library payload!)`);
  console.log(`  Metadata/other size: ${((bytes - totalQuizDataBytes) / 1024).toFixed(2)} KB`);
  console.log('='.repeat(70));
}

measureLibraryPayload().catch(console.error);
