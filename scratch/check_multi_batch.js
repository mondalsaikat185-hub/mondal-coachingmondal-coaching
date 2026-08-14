const url = "https://script.google.com/macros/s/AKfycbxBtlORQYtnf4ByrnEJWSoDBbOkJz4KfublmkFQrmniiH3G-kZyntkNVpfaaDImmLgnaA/exec";

async function checkData() {
  const usersRes = await fetch(url, {
    method: "POST",
    body: JSON.stringify({ action: "apiGetUsers", args: [], token: "MondalCoachingSecureToken2026!" })
  }).then(r => r.json());

  const batchesRes = await fetch(url, {
    method: "POST",
    body: JSON.stringify({ action: "apiGetBatches", args: [], token: "MondalCoachingSecureToken2026!" })
  }).then(r => r.json());

  const users = usersRes.data.data || [];
  const batches = batchesRes.data.data || [];

  console.log("--- BATCHES ---");
  batches.forEach(b => {
    console.log(`ID: ${b.id} | Name: ${b.name}`);
  });

  console.log("\n--- MULTI-BATCH STUDENTS ---");
  const multiBatchUsers = users.filter(u => u.batchId && u.batchId.includes(','));
  multiBatchUsers.forEach(u => {
    console.log(`${u.name} (${u.phone}) -> batchId: "${u.batchId}"`);
    const sIds = u.batchId.split(',').map(s => s.trim());
    const validBatches = batches.filter(b => sIds.includes(b.id)).map(b => b.name);
    console.log(`  Resolved to: ${validBatches.join(', ')}`);
  });
}

checkData();
