const url = "https://script.google.com/macros/s/AKfycbxBtlORQYtnf4ByrnEJWSoDBbOkJz4KfublmkFQrmniiH3G-kZyntkNVpfaaDImmLgnaA/exec";

async function checkData() {
  const batchesRes = await fetch(url, {
    method: "POST",
    body: JSON.stringify({ action: "apiGetBatches", args: [], token: "MondalCoachingSecureToken2026!" })
  }).then(r => r.json());

  const libraryRes = await fetch(url, {
    method: "POST",
    body: JSON.stringify({ action: "apiGetLibrary", args: [], token: "MondalCoachingSecureToken2026!" })
  }).then(r => r.json());

  const batches = batchesRes.data.data || [];
  const library = libraryRes.data.data || [];

  const slst = batches.find(b => b.id === '4a4bb11b-0e69-40fa-a727-6c3a06b4a83a');
  console.log("SLST Batch Name:", slst.name);
  console.log("Assigned Items Map Keys:", Object.keys(slst.assignedItemsMap || {}));
  
  if (Object.keys(slst.assignedItemsMap || {}).length > 0) {
      Object.keys(slst.assignedItemsMap).forEach(k => {
          const item = library.find(i => i.id === k);
          console.log(`  -> Item ID: ${k} | Title: ${item ? item.title : 'NOT FOUND IN LIBRARY'}`);
      });
  } else {
      console.log("  -> NO ITEMS ASSIGNED TO SLST BATCH IN DATABASE!");
  }
}

checkData();
