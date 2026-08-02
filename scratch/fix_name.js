const url = "https://script.google.com/macros/s/AKfycbxBtlORQYtnf4ByrnEJWSoDBbOkJz4KfublmkFQrmniiH3G-kZyntkNVpfaaDImmLgnaA/exec";

fetch(url, {
  method: "POST",
  body: JSON.stringify({
    action: "apiSaveUser",
    args: [{ phone: "9883212317", name: "Aparna Shantri" }],
    token: "MondalCoachingSecureToken2026!"
  }),
  headers: { "Content-Type": "text/plain;charset=utf-8" }
})
.then(res => res.json())
.then(res => {
    console.log("Response:", res);
})
.catch(err => {
    console.error("Error:", err);
});
