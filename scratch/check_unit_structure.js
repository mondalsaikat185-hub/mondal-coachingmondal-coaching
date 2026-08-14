const url = "https://script.google.com/macros/s/AKfycbxBtlORQYtnf4ByrnEJWSoDBbOkJz4KfublmkFQrmniiH3G-kZyntkNVpfaaDImmLgnaA/exec";

async function checkData() {
  const libraryRes = await fetch(url, {
    method: "POST",
    body: JSON.stringify({ action: "apiGetLibrary", args: [], token: "MondalCoachingSecureToken2026!" })
  }).then(r => r.json());

  const library = libraryRes.data.data || [];

  const itemsToCheck = ['50ce8b50-9b81-4814-88c9-d0af03309066', 'a81ce3c3-fb05-4ecb-8a32-e91f0690d69b'];
  
  itemsToCheck.forEach(id => {
      const item = library.find(i => i.id === id);
      console.log(`\nItem: ${item ? item.title : 'NOT FOUND'}`);
      if (item) {
          console.log(`  Type: ${item.type}`);
          console.log(`  IsFolder: ${item.isFolder}`);
          console.log(`  Parent ID: ${item.parentId}`);
          
          // Check children
          const children = library.filter(i => i.parentId === item.id);
          console.log(`  Children count: ${children.length}`);
          children.forEach(c => {
              console.log(`    - [${c.type}] ${c.title}`);
          });
      }
  });
}

checkData();
