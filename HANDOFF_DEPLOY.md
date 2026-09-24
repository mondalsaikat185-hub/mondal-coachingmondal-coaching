# HANDOFF — payments-upi branch (code written by Claude, 24-09-2026)
Branch: payments-upi. Code is COMPLETE and typechecks (tsc --noEmit = 0 errors). Antigravity only deploys + tests.
DO NOT regex-edit gas-backend/Code.gs (CRLF file; a previous regex deleted ~1900 lines). Use it exactly as it is.

## What changed (uncommitted in working tree)
- gas-backend/Code.gs — rebuilt from scratch/Code.gs.payments-upi-backup (93 functions, syntax OK):
  * master-admin backdoor + seedAdminIfNeeded removed (0 matches for the old phone/passcode)
  * apiDeleteNotification RESTORED (was lost in commit f6bfa95 → notification delete never worked). Admin: any; student: only own (senderId). Added to USER_ACTIONS + ACTIONS_NEEDING_SESSION.
  * apiVerifyGatewayPayment not allowlisted (Razorpay off).
- src/lib/toast.ts — NEW tiny toast helper (no dependency).
- src/components/NotificationsPanel.tsx — delete: "নিশ্চিত? আবার চাপুন" → row greys out "মুছছে…", all delete buttons locked (no double-tap), toast.
- src/pages/AdminResults.tsx — tap whole row to select, strong red highlight, bigger checkbox, locked while deleting, toast + rollback.
- src/pages/AdminLibrary.tsx — delete: confirm shows item name, item disappears instantly, "মুছছে…" label, rollback on fail, toast. Share: dialog closes instantly, background save, "শেয়ার হচ্ছে…/সম্পন্ন ✓/ব্যর্থ" toasts.
- src/pages/Pages.tsx — student delete optimistic + toast; batch delete toasts; payment Approve/Reject locked per-row while processing (no double-tap) + toasts; amount is display-only (apiUpdatePaymentAmount does not exist server-side).

## GAS HEAD note
Claude restored GAS HEAD to exactly production v101 (HEAD had been corrupted to 47 functions). Production MAIN APP = v101 (healthy). Test deployment = AKfycbxLbQVY… (@100).

## Deploy steps (in order, raw output each, stop on failure)
1. git add gas-backend/Code.gs src/lib/toast.ts src/components/NotificationsPanel.tsx src/pages/AdminResults.tsx src/pages/AdminLibrary.tsx src/pages/Pages.tsx HANDOFF_DEPLOY.md && git commit -m "payments-upi: restore apiDeleteNotification, remove backdoor, delete/share UX feedback"
2. npm run lint && npm run build (must pass).
3. clasp push → new version → update TEST deployment AKfycbxLbQVY… (NOT main app). Smoke test on test URL with student 9999999901: login; apiGetExamSessions ok; create own notification then apiDeleteNotification → success; delete someone else's → 403; apiVerifyGatewayPayment → Forbidden.
4. Vercel Preview for branch payments-upi pointing to TEST deployment (preview env only). Give owner the URL.
5. ONLY after owner approves: new version → update MAIN APP (same ID), merge payments-upi → main (normal push), verify live, delete test deployment.
Rollback: MAIN APP → v101; Vercel instant rollback.
Credentials: never print; owner enters admin creds himself if needed.

## ROUND 2 (Claude, after owner's preview test) — uncommitted
Owner's preview was talking to PRODUCTION v101 (no apiDeleteNotification) → deletes hung grey. Fixes:
- src/lib/api.ts — runGasMethod: 4xx gateway errors (401/403/404) are no longer retried 3× (was ~15-20 s hang); fail fast → UI rolls back + red toast.
- src/pages/Pages.tsx — getDueMonths: counts BACKWARDS from current month (was starting 12 months ago → "2025" shown first). Shows oldest→current, e.g. "August 2026, September 2026".
- src/lib/cache.ts + src/pages/StudentLibrary.tsx — "⏳ sync বাকি" badge now disappears as soon as the background exam submission finishes (event 'mc-outbox-changed'); before, it stayed until a page reload.
tsc --noEmit = 0.

## ROUND 2 deploy steps
1. git add src/lib/api.ts src/pages/Pages.tsx src/lib/cache.ts src/pages/StudentLibrary.tsx HANDOFF_DEPLOY.md && git commit -m "fix: fail-fast on 4xx, dues from current month, clear sync badge" && npm run lint && npm run build && git push origin payments-upi
2. Vercel: the preview MUST use the TEST backend. Owner authorizes `vercel login` (device code in browser). Then:
   vercel env add VITE_GAS_WEB_APP_URL preview payments-upi   (value = TEST URL AKfycbxLbQVY…/exec)
   Redeploy the payments-upi preview. Verify the preview bundle contains ONLY AKfycbxLbQVY… (not AKfycbxBtl…). Give owner the new URL.
   Production env var must stay untouched.

## ROUND 3 (Claude) — auto-update + fewer logouts — uncommitted
- vite.config.ts — each build gets a unique id (__MC_BUILD_ID__) and emits dist/version.json.
- src/lib/autoUpdate.ts (NEW) — checks /version.json on start (+5 s), when app returns to foreground, and every 5 min; if a new build exists → toast + reload automatically. Never reloads during an exam (UnifiedQuizPlayer sets exam-active). fullResetKeepLogin(): clears SW/caches/cached data but KEEPS login, theme, unsent exam results, running exam state.
- src/main.tsx — startAutoUpdate().
- src/App.tsx — "Reset Cache" menu → fullResetKeepLogin (no logout); version-buster no longer removes mc_session_user.
- src/components/quiz/UnifiedQuizPlayer.tsx — setExamActive(true/false).
- src/lib/api.ts — force-logout only on code 401 / forceLogout (not on any error text containing "session").
tsc --noEmit = 0.

## ROUND 3 deploy
1. git add vite.config.ts src/lib/autoUpdate.ts src/main.tsx src/App.tsx src/components/quiz/UnifiedQuizPlayer.tsx src/lib/api.ts HANDOFF_DEPLOY.md && git commit -m "feat: auto-update via version.json, reset cache keeps login, fewer forced logouts" && npm run lint && npm run build
2. Verify dist/version.json exists and its build id also appears inside dist/index.html.
3. git push origin payments-upi. Wait for the Vercel preview of THIS commit (not a redeploy of an old one). Verify with `vercel inspect`: commit = this commit, bundle contains only AKfycbxLbQVY…, and <preview>/version.json returns {"build": "..."}.
4. Give owner the preview URL.

## ROUND 4 (Claude, after owner test of adet0chyh) — uncommitted
ROOT CAUSE of "some deletes / Reset Cache / payment alert do nothing": browser window.confirm() is silently blocked on phones / installed apps → returns false.
- src/lib/confirmDialog.ts (NEW) — in-app confirmAsync(). Replaced ALL 6 confirm() calls (AdminLibrary ×2, AdminResults, Pages ×2 [payment alert send/remove], App.tsx Reset Cache). Reset Cache icon no longer spins.
- src/lib/api.ts — admin notifications read from GAS (VPS copy excludes student→admin messages, so admin was missing them); students still use VPS. deleteNotification clears cached list. "Recently deleted" filter (3 min) so a stale VPS copy can't make deleted library items / notifications reappear.
- src/pages/StudentLibrary.tsx — Take Exam: instant spinner "খুলছে…", repeated taps ignored.
tsc --noEmit = 0.

## ROUND 4 deploy
1. git add src/lib/confirmDialog.ts src/pages/AdminLibrary.tsx src/pages/AdminResults.tsx src/pages/Pages.tsx src/App.tsx src/lib/api.ts src/pages/StudentLibrary.tsx HANDOFF_DEPLOY.md && git commit -m "fix: in-app confirm (native confirm blocked on phones), admin notifications from GAS, hide recently deleted, Take Exam feedback" && npm run lint && npm run build && git push origin payments-upi
2. Wait for the Vercel preview of THIS commit; verify commit, only AKfycbxLbQVY… in bundle, /version.json works. Give owner the URL.
