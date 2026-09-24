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
