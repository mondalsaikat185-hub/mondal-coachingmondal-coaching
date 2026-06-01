const fs = require('fs');

const logPath = 'C:\\Users\\monda\\.gemini\\antigravity\\brain\\64ceaae3-dd05-45d4-bb0a-d506488322d8\\.system_generated\\tasks\\task-4199.log';

if (!fs.existsSync(logPath)) {
  console.log("Log file not found!");
  process.exit(1);
}

const content = fs.readFileSync(logPath, 'utf8');

// Find the JSON block in the log
const startIdx = content.indexOf('{');
if (startIdx === -1) {
  console.log("No JSON found in log!");
  process.exit(1);
}

const jsonStr = content.substring(startIdx);
try {
  const data = JSON.parse(jsonStr);
  const users = data.data.data;
  console.log("Total users fetched:", users.length);
  
  const targets = ["Arnap", "Pritip", "Subhashree", "Ishani", "Monjur"];
  
  users.forEach((u, idx) => {
    const match = targets.some(t => u.name && String(u.name).toLowerCase().includes(t.toLowerCase()));
    if (match) {
      console.log(`\n--- Match ${idx} ---`);
      console.log(JSON.stringify(u, null, 2));
    }
  });
} catch(e) {
  console.error("Failed to parse log JSON:", e);
}
