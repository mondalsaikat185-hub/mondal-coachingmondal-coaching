const url = "https://script.google.com/macros/s/AKfycbxBtlORQYtnf4ByrnEJWSoDBbOkJz4KfublmkFQrmniiH3G-kZyntkNVpfaaDImmLgnaA/exec";

async function checkData() {
  const libraryRes = await fetch(url, {
    method: "POST",
    body: JSON.stringify({ action: "apiGetLibrary", args: [], token: "MondalCoachingSecureToken2026!" })
  }).then(r => r.json());

  const library = libraryRes.data.data || [];

  const parentFolder = library.find(i => i.id === '851c8609-f80e-4127-9920-74709ffab9c6');
  if (parentFolder) {
      console.log(`Parent Folder Name: ${parentFolder.title}`);
      console.log(`Is Root Folder: ${parentFolder.parentId === null || parentFolder.parentId === ""}`);
  } else {
      console.log("Parent folder not found!");
  }
}

checkData();
