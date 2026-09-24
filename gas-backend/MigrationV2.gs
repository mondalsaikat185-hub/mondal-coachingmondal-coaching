// =========================================================================
// MIGRATION TO VPS (mc-api v2)  — added 2026-09-25
// 1) exportAllToVpsV2(): copies every sheet (with Drive large-cells resolved)
//    + announcement/appSettings to the new VPS server. Run by hand from the
//    Apps Script editor. It NEVER changes or deletes anything in the Sheet.
// 2) relayFromVps: lets the VPS ask Apps Script to do Google-only jobs
//    (upload a PDF to Drive, send an OTP e-mail). Signed with MC_SYNC_SECRET.
// Script properties needed: MC_SYNC_SECRET (already exists), V2_IMPORT_URL
// =========================================================================

var V2_SHEETS = ["users", "batches", "library", "payments", "notifications",
                 "examSessions", "examResults", "attendance", "sessions"];

function v2Sign_(bodyStr) {
  var secret = PropertiesService.getScriptProperties().getProperty("MC_SYNC_SECRET");
  if (!secret || !secret.trim()) throw new Error("MC_SYNC_SECRET missing");
  return computeHmacHex(bodyStr, secret.trim());
}

function v2Post_(url, obj) {
  var bodyStr = JSON.stringify(obj);
  var res = UrlFetchApp.fetch(url, {
    method: "post",
    contentType: "application/json; charset=utf-8",
    headers: { "X-MC-Signature": "sha256=" + v2Sign_(bodyStr) },
    payload: bodyStr,
    muteHttpExceptions: true
  });
  var code = res.getResponseCode();
  var text = res.getContentText();
  if (code !== 200) throw new Error("VPS " + code + ": " + text.substring(0, 500));
  return JSON.parse(text);
}

function v2ResolveRow_(row) {
  for (var k in row) {
    var v = row[k];
    if (typeof v === "string" && v.indexOf("gdrive_file_id:") === 0) {
      row[k] = readLargeString(v);
    }
  }
  return row;
}

function exportAllToVpsV2() {
  var url = PropertiesService.getScriptProperties().getProperty("V2_IMPORT_URL");
  if (!url) throw new Error("Set script property V2_IMPORT_URL first");
  var started = Date.now();
  v2Post_(url, { step: "begin" });
  var expected = {};
  for (var s = 0; s < V2_SHEETS.length; s++) {
    var name = V2_SHEETS[s];
    var sheet = getSpreadsheet().getSheetByName(name);
    var rows = sheet ? readSheet(name) : [];
    var headers = [];
    if (sheet && sheet.getLastColumn() > 0) {
      headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map(function(h) { return String(h); });
    }
    expected[name] = rows.length;
    var chunk = (name === "library" || name === "payments" || name === "examResults") ? 40 : 300;
    if (rows.length === 0) {
      v2Post_(url, { step: "rows", sheet: name, headers: headers, rows: [] });
    }
    for (var i = 0; i < rows.length; i += chunk) {
      var part = rows.slice(i, i + chunk).map(v2ResolveRow_);
      v2Post_(url, { step: "rows", sheet: name, headers: headers, rows: part });
    }
    Logger.log("exported " + name + ": " + rows.length);
  }
  var props = PropertiesService.getScriptProperties();
  v2Post_(url, { step: "props", props: {
    announcement: props.getProperty("announcement") || "",
    appSettings: props.getProperty("appSettings") || null
  }});
  var result = v2Post_(url, { step: "commit", expectedCounts: expected });
  Logger.log("SHEET COUNTS: " + JSON.stringify(expected));
  Logger.log("VPS COUNTS:   " + JSON.stringify(result.counts));
  Logger.log("done in " + Math.round((Date.now() - started) / 1000) + "s");
  return { expected: expected, vps: result.counts };
}

// Called from doPost when action === "relayFromVps"
function handleRelayFromVps_(req) {
  var secret = PropertiesService.getScriptProperties().getProperty("MC_SYNC_SECRET");
  if (!secret || !secret.trim()) return { success: false, error: "relay not configured", code: 503 };
  var ts = Number(req.ts || 0);
  if (!ts || Math.abs(Date.now() - ts) > 5 * 60 * 1000) return { success: false, error: "relay expired", code: 401 };
  var bodyHash = computeTokenHash(String(req.argsJson || ""));
  var expected = computeHmacHex(String(req.op) + "|" + ts + "|" + bodyHash, secret.trim());
  if (String(req.sig || "").toLowerCase() !== expected) return { success: false, error: "relay bad signature", code: 401 };
  var args = JSON.parse(req.argsJson || "[]");
  if (req.op === "uploadToDrive") {
    return { success: true, data: apiUploadFileToDrive(args[0], args[1], args[2]) };
  }
  if (req.op === "sendMail") {
    MailApp.sendEmail(String(args[0]), String(args[1]), String(args[2]));
    return { success: true, data: { success: true } };
  }
  return { success: false, error: "unknown relay op", code: 400 };
}
