const url = "https://script.google.com/macros/s/AKfycbxBtlORQYtnf4ByrnEJWSoDBbOkJz4KfublmkFQrmniiH3G-kZyntkNVpfaaDImmLgnaA/exec";

async function checkData() {
  const libraryRes = await fetch(url, {
    method: "POST",
    body: JSON.stringify({ action: "apiGetLibrary", args: [], token: "MondalCoachingSecureToken2026!" })
  }).then(r => r.json());

  const library = libraryRes.data.data || [];

  let currentId = '851c8609-f80e-4127-9920-74709ffab9c6';
  while(currentId) {
      const folder = library.find(i => i.id === currentId);
      if (folder) {
          console.log(`Folder: ${folder.title} | Parent: ${folder.parentId || 'ROOT'}`);
          currentId = folder.parentId;
      } else {
          console.log("Not found:", currentId);
          break;
      }
  }
}

checkData();
