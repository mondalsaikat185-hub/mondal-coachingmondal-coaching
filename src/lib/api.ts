// =========================================================================
// M-C Tuition Application: Unified API Database Layer (api.ts)
// Swaps Firebase out for Google Apps Script + Google Sheets
// =========================================================================

import {
  getLocalSwr,
  setLocalSwr,
  clearLocalSwr,
  clearAllLocalSwr,
  getExamOutbox,
  addExamToOutbox,
  removeExamFromOutbox,
  isExamPendingSync,
  ExamOutboxItem
} from './cache';

declare const google: any;

// =========================================================================
// GOOGLE APPS SCRIPT WEB APP URL (For Vercel Deployment)
// =========================================================================
// REPLACE THIS WITH YOUR LIVE DEPLOYMENT URL (Step 2 Production Release v94)
export const GAS_WEB_APP_URL = (import.meta.env.VITE_GAS_WEB_APP_URL as string) || "https://script.google.com/macros/s/AKfycbxBtlORQYtnf4ByrnEJWSoDBbOkJz4KfublmkFQrmniiH3G-kZyntkNVpfaaDImmLgnaA/exec";
// When set, the whole app talks to the VPS backend (mc-api v2) instead of Google Apps Script.
export const BACKEND_V2_URL = ((import.meta.env.VITE_BACKEND_V2_URL as string) || "").replace(/\/+$/, "");
export const SECURITY_TOKEN = (import.meta.env.VITE_SECURITY_TOKEN as string) || "MondalCoachingSecureToken2026!";

export const SESSION_TOKEN_KEY = "mc_session_token";

export function getSessionToken(): string | null {
  try {
    return localStorage.getItem(SESSION_TOKEN_KEY);
  } catch (e) {
    return null;
  }
}

export function setSessionToken(token: string): void {
  try {
    localStorage.setItem(SESSION_TOKEN_KEY, token);
  } catch (e) {}
}

export function clearSessionToken(): void {
  try {
    localStorage.removeItem(SESSION_TOKEN_KEY);
  } catch (e) {}
}

export interface UserProfile {
  id: string;
  sessionToken?: string;
  name: string;
  phone: string;
  email?: string;
  role?: 'admin' | 'student';
  status?: 'active' | 'pending' | 'rejected' | 'incomplete';
  batchId?: string;
  passcode?: string;
  paymentStatus?: string;
  reapplyReason?: string;
  createdAt?: string;
  updatedAt?: string;
  profilePhotoUrl?: string;
  address?: string;
  dob?: string;
  joinDate?: string;
  monthlyFee?: number;
  pendingMonths?: number;
  excusedDates?: string;
  exemptReason?: string;
  forcePaymentNudge?: boolean;
  excusedMonths?: string;
}

export interface Batch {
  id: string;
  name: string;
  assignedItemsMap: Record<string, string>; // itemId -> assignedAtISO
  scheduledStartTimeMap?: Record<string, string>; // itemId -> scheduledStartTimeISO
  createdAt: string;
  classDay?: string; // '0' Sunday … '6' Saturday (batch setting for exam notifications)
  examStartTime?: string; // 'HH:MM' IST
  examSlot?: { classDay: string; examStartTime: string }; // resolved by server (setting or name default)
}

export interface ExamRequestOption { id: string; title: string; examType: string; folder: string; note?: string; classDate: string }
export interface ExamRequestOptions {
  batchId: string; batchName: string; classDay: string; examStartTime: string;
  defaultDate: string; date: string; exams: ExamRequestOption[];
  existing: { id: string; senderName: string; examIds: string[] } | null;
  series: { id: string; title: string; kind: string; label: string; n: number }[]; // auto-added regular sets (locked)
}

export interface LibraryItem {
  id: string;
  title: string;
  type: 'folder' | 'note' | 'exam' | 'pdf';
  parentId: string | null;
  contentUrl?: string;
  isFolder: boolean;
  isEncrypted?: boolean;
  encryptionPassword?: string;
  quizId?: string;
  createdAt: string;
  fileName?: string;
  isChunked?: boolean;
  chunkCount?: number;
  examType?: string;
  trackingId?: string;
  timeLimit?: number;
  marksCorrect?: number;
  marksWrong?: number;
  allowMultipleAttempts?: boolean;
  sequence?: number;
  quizData?: string;
  updatedAt?: string;
}

export interface PaymentRecord {
  id: string;
  studentId: string;
  month: string;
  amount: number;
  status: 'paid' | 'unpaid' | 'pending' | 'approved' | 'rejected';
  transactionId?: string;
  paidDate?: string;
  remarks?: string;
  proofImage?: string;
  hasProof?: boolean;
  paymentMode?: string;
  createdAt: string;
}

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  batchId: string; // 'all' or specific batchId
  senderId: string;
  createdAt: string;
}

export interface ExamSession {
  id: string;
  examId: string;
  batchId: string;
  code: string;
  isActive: boolean;
  codeEnabled: boolean;
  participantUids: string[];
  createdAt: string;
}

export interface AttendanceRecord {
  id: string;
  sessionId: string;
  studentId: string;
  studentName: string;
  studentPhone: string;
  joinedTime: string;
  createdAt: string;
}

export interface ExamResult {
  id: string;
  examId: string;
  studentId: string;
  studentName: string;
  studentPhone?: string;
  studentBatchId?: string;
  score: number;
  totalQuestions: number;
  correctAnswers?: number;
  wrongAnswers?: number;
  skippedAnswers?: number;
  answersMap?: string;
  answersJSON: string;
  submittedAt: string;
}

export function cleanPhone(p: any): string {
  if (p === undefined || p === null) return "";
  let s = String(p).trim();
  if (s.toLowerCase().indexOf('e') !== -1) {
    const num = Number(p);
    if (!isNaN(num)) {
      s = num.toFixed(0);
    }
  }
  if (s.indexOf('.') !== -1) {
    s = s.split('.')[0];
  }
  const digits = s.replace(/\D/g, '');
  if (digits.length >= 10) {
    return digits.slice(-10);
  }
  return digits;
}  // Environment Detection
  const USE_REAL_API = true;
  const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
  const globalApiCache: {
    batches: { data: Batch[], time: number } | null;
    library: { data: LibraryItem[], time: number } | null;
    users: { data: UserProfile[], time: number } | null;
    payments: { data: PaymentRecord[], time: number } | null;
    examSessions: { data: ExamSession[], time: number } | null;
    examResults: { data: ExamResult[], time: number } | null;
    announcement: { data: string, time: number } | null;
    notifications: { data: NotificationItem[], time: number } | null;
    attendance: { data: AttendanceRecord[], time: number } | null;
    settings: { data: any, time: number } | null;
  } = { batches: null, library: null, users: null, payments: null, examSessions: null, examResults: null, announcement: null, notifications: null, attendance: null, settings: null };


  const inFlightRequests: Record<string, Promise<any>> = {};

  // =========================================================================
  // 1. FETCH BASED GAS METHOD EXECUTOR (REPLACES google.script.run)
  // =========================================================================
  async function runGasMethod<T>(methodName: string, ...args: any[]): Promise<T> {
    if (!USE_REAL_API) {
      throw new Error("Local mock mode is forced");
    }
  
    if (GAS_WEB_APP_URL.includes("REPLACE_THIS_WITH_YOUR_URL")) {
      alert("CRITICAL ERROR: Please add your Google Apps Script Web App URL in src/lib/api.ts!");
      throw new Error("Missing GAS Web App URL");
    }

    // Deduplicate in-flight requests to save Google Apps Script quota
    const requestKey = `${methodName}_${JSON.stringify(args)}`;
    if (inFlightRequests[requestKey]) {
      return inFlightRequests[requestKey] as Promise<T>;
    }
  
    const requestPromise = (async () => {
    let lastError: any = null;
    let retries = 3;
    let attempt = 0;

    while (attempt < retries) {
      try {
        const activeToken = getSessionToken() || SECURITY_TOKEN;
        const fetchResponse = await fetch(BACKEND_V2_URL ? `${BACKEND_V2_URL}/rpc` : GAS_WEB_APP_URL, {
          method: "POST",
          body: JSON.stringify({ action: methodName, args: args, token: activeToken }),
          headers: {
            "Content-Type": "text/plain;charset=utf-8"
          }
        });

        let json;
        try {
          json = await fetchResponse.json();
        } catch (parseErr) {
          throw new Error("Invalid response from server (likely overload)");
        }

        if (!json.success) {
          // Only a real expired/invalid login logs the user out (not any error that mentions "session").
          if (json.code === 401 || json.forceLogout) {
            clearSessionToken();
            try { localStorage.removeItem("mc_session_user"); } catch (e) {}
            window.dispatchEvent(new CustomEvent("mc-force-logout", { detail: json.error }));
          }
          const gwErr = new Error(json.error || "API Gateway Error");
          // 4xx (unauthorized / forbidden / not allowed) will never succeed on retry — fail fast.
          if (typeof json.code === 'number' && json.code >= 400 && json.code < 500) {
            (gwErr as any).isLogicError = true;
          }
          throw gwErr;
        }

        const response = json.data;

        if (response && typeof response === "object") {
          if (response.success === false) {
            if (response.error) {
              // Don't retry logic errors from the app
              const logicErr = new Error(response.error);
              (logicErr as any).isLogicError = true;
              throw logicErr;
            } else if (Object.keys(response).length === 1) {
              return false as T;
            }
          } else if (response.success === true) {
            if (response.data !== undefined) {
              return response.data as T;
            } else if (response.payload !== undefined) {
              return response as T;
            } else if (Object.keys(response).length === 1) {
              return true as T;
            }
          }
        }

        return response as T;
      } catch (err: any) {
        lastError = err;
        // If it's a known logic error from backend (like wrong passcode), don't retry
        if (err.isLogicError) break;
        
        attempt++;
        if (attempt < retries) {
          console.warn(`Retry ${attempt}/${retries} for ${methodName} due to: ${err.message}`);
          await new Promise(r => setTimeout(r, 1000 * attempt)); // wait 1s, then 2s before retrying
        }
      }
    }

    console.error("API Call Failed after retries:", methodName, lastError);
    throw lastError;
  })().finally(() => {
    delete inFlightRequests[requestKey];
  });

    inFlightRequests[requestKey] = requestPromise;
    return requestPromise;
}

// =========================================================================
// 1B. HOSTINGER VPS mc-api CLIENT (Step 1 Read Acceleration with Auto-Fallback)
// =========================================================================

export function getVpsBaseUrl(): string {
  if (typeof window !== 'undefined' && import.meta.env.DEV) {
    const urlParams = new URLSearchParams(window.location.search);
    const paramUrl = urlParams.get('vps_url');
    if (paramUrl) return paramUrl;

    const override = localStorage.getItem('mc_api_url_override');
    if (override) return override;

    if ((window as any).__MC_API_URL) return (window as any).__MC_API_URL;
  }
  return (import.meta.env.VITE_MC_API_URL as string) || "https://mc-api-187-127-191-163.sslip.io";
}

let lastCheckedUrl = '';
let lastHealthCheckTime = 0;
let lastHealthOk = false;
let lastSnapshotAgeMs = -1;

export async function checkVpsHealth(): Promise<{ ok: boolean; reason?: string; ageMs?: number }> {
  const vpsUrl = getVpsBaseUrl();
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);
    const res = await fetch(`${vpsUrl}/health`, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!res.ok) {
      return { ok: false, reason: `HTTP status ${res.status}` };
    }

    const data = await res.json();
    const snapshotAgeMs = typeof data.snapshotAgeMs === 'number' ? data.snapshotAgeMs : -1;
    lastSnapshotAgeMs = snapshotAgeMs;

    if (data.status !== 'ok') {
      return { ok: false, reason: `Status not ok (${data.status})`, ageMs: snapshotAgeMs };
    }

    // Use lastCheckedAgeMs (heartbeat freshness) if available, else fall back to snapshotAgeMs
    const checkedAgeMs = typeof data.lastCheckedAgeMs === 'number' ? data.lastCheckedAgeMs : -1;
    const effectiveAgeMs = checkedAgeMs >= 0 ? checkedAgeMs : snapshotAgeMs;

    // lastCheckedAt must be within 5 minutes (updated every ~1 min by syncIfDirty heartbeat)
    const MAX_CHECKED_AGE_MS = 5 * 60 * 1000;
    if (effectiveAgeMs > MAX_CHECKED_AGE_MS) {
      return { ok: false, reason: `VPS not checked in ${(effectiveAgeMs / 60000).toFixed(1)}m (limit: 5m)`, ageMs: snapshotAgeMs };
    }

    return { ok: true, ageMs: snapshotAgeMs };
  } catch (err: any) {
    return { ok: false, reason: err.name === 'AbortError' ? 'Health check timed out (4s)' : err.message };
  }
}

async function isVpsAvailable(): Promise<boolean> {
  const vpsUrl = getVpsBaseUrl();
  if (vpsUrl !== lastCheckedUrl) {
    lastCheckedUrl = vpsUrl;
    lastHealthCheckTime = 0;
    lastHealthOk = false;
  }

  const now = Date.now();
  // Cache positive health checks for 30s to avoid duplicate round-trips
  if (lastHealthOk && (now - lastHealthCheckTime < 30000)) {
    return true;
  }

  const result = await checkVpsHealth();
  lastHealthCheckTime = now;
  lastHealthOk = result.ok;
  if (!result.ok) {
    console.warn(`[API] VPS mc-api unavailable: ${result.reason}. Falling back to GAS.`);
  }
  return result.ok;
}

async function fetchFromVps<T>(endpoint: string): Promise<T | null> {
  if (BACKEND_V2_URL) return null; // v2: everything goes through /rpc
  try {
    const available = await isVpsAvailable();
    if (!available) {
      return null;
    }

    const vpsUrl = getVpsBaseUrl();
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    const res = await fetch(`${vpsUrl}${endpoint}`, {
      headers: {
        'X-MC-Token': SECURITY_TOKEN
      },
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (!res.ok) {
      console.warn(`[API] VPS mc-api returned HTTP ${res.status} for ${endpoint}. Falling back to GAS.`);
      lastHealthOk = false;
      return null;
    }

    const json = await res.json();
    if (json.success === false) {
      console.warn(`[API] VPS mc-api error for ${endpoint}:`, json.error);
      return null;
    }

    return (json.data !== undefined ? json.data : json) as T;
  } catch (err: any) {
    console.warn(`[API] VPS mc-api request to ${endpoint} failed: ${err.message}. Falling back to GAS.`);
    lastHealthOk = false;
    return null;
  }
}

// Step 2: Session-authenticated VPS Read Client with silent GAS fallback (no forceLogout on VPS 401)
const lastMutationTime = {
  users: 0,
  payments: 0
};
let optimisticUsersCache: UserProfile[] | null = null;
let optimisticPaymentsCache: PaymentRecord[] | null = null;

async function fetchFromVpsWithSession<T>(endpoint: string): Promise<{ data: T; timestamp: number; version?: string } | null> {
  if (BACKEND_V2_URL) return null; // v2: everything goes through /rpc
  try {
    const sessionToken = getSessionToken();
    if (!sessionToken) {
      return null;
    }

    const available = await isVpsAvailable();
    if (!available) {
      return null;
    }

    const vpsUrl = getVpsBaseUrl();
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    const res = await fetch(`${vpsUrl}${endpoint}`, {
      headers: {
        'X-MC-Token': SECURITY_TOKEN,
        'X-MC-Session': sessionToken
      },
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (!res.ok) {
      // IMPORTANT: VPS 401/403 (e.g. old v83 random token or not yet synced) does NOT trigger forceLogout.
      // It silently falls back to GAS. Only a GAS 401 triggers forceLogout.
      console.warn(`[API] VPS mc-api returned HTTP ${res.status} for ${endpoint}. Silently falling back to GAS.`);
      return null;
    }

    const json = await res.json();
    if (json.success === false) {
      console.warn(`[API] VPS mc-api error for ${endpoint}:`, json.error);
      return null;
    }

    return {
      data: (json.data !== undefined ? json.data : json) as T,
      timestamp: Number(json.timestamp || 0),
      version: json.version
    };
  } catch (err: any) {
    console.warn(`[API] VPS mc-api session request to ${endpoint} failed: ${err.message}. Falling back to GAS.`);
    return null;
  }
}

// =========================================================================
// 2. CLIENT-SIDE LOCALSTORAGE MOCK DATABASE (DEVELOPMENT & LOCAL TESTING)
// =========================================================================

const MOCK_STORAGE_KEY = "mc_coaching_mock_db";

interface MockDB {
  users: UserProfile[];
  batches: Batch[];
  library: LibraryItem[];
  payments: PaymentRecord[];
  notifications: NotificationItem[];
  examSessions: ExamSession[];
  attendance: AttendanceRecord[];
  examResults: ExamResult[];
}

function getMockDB(): MockDB {
  const data = localStorage.getItem(MOCK_STORAGE_KEY);
  if (data) {
    try {
      return JSON.parse(data);
    } catch (e) {}
  }

  // SEED INITIAL DUMMY DATA FOR LOCAL TESTING
  const initialDB: MockDB = {
    users: [
      {
        id: "admin_uid",
        name: "Saikat Mondal (Admin)",
        phone: "9432490498",
        email: "mondal.saikat185@gmail.com",
        role: "admin",
        status: "active",
        passcode: "saikat123",
        createdAt: new Date().toISOString()
      },
      {
        id: "student_1",
        name: "Rohan Das",
        phone: "9988776655",
        email: "rohan@gmail.com",
        role: "student",
        status: "active",
        batchId: "batch_morning",
        passcode: "9988776655",
        paymentStatus: "paid",
        createdAt: new Date().toISOString()
      },
      {
        id: "student_2",
        name: "Priya Sen",
        phone: "8877665544",
        email: "priya@gmail.com",
        role: "student",
        status: "pending",
        batchId: "batch_evening",
        passcode: "8877665544",
        createdAt: new Date().toISOString()
      }
    ],
    batches: [
      {
        id: "batch_morning",
        name: "Morning Batch (Class 10)",
        assignedItemsMap: {
          "note_1": new Date().toISOString()
        },
        createdAt: new Date().toISOString()
      },
      {
        id: "batch_evening",
        name: "Evening Batch (Class 12)",
        assignedItemsMap: {},
        createdAt: new Date().toISOString()
      }
    ],
    library: [
      {
        id: "folder_science",
        title: "Physical Science",
        type: "folder",
        parentId: null,
        isFolder: true,
        createdAt: new Date().toISOString()
      },
      {
        id: "note_1",
        title: "Light & Optics Class Lecture Note",
        type: "note",
        parentId: "folder_science",
        contentUrl: "https://docs.google.com/viewer?url=https://saikat-tuition.duckdns.org/sample.pdf",
        isFolder: false,
        isEncrypted: true,
        encryptionPassword: "",
        createdAt: new Date().toISOString()
      }
    ],
    payments: [
      {
        id: "pay_1",
        studentId: "student_1",
        month: "May 2026",
        amount: 800,
        status: "paid",
        transactionId: "TXN12345",
        paidDate: new Date().toISOString(),
        createdAt: new Date().toISOString()
      }
    ],
    notifications: [
      {
        id: "notif_1",
        title: "কলাসের সময় পরিবর্তন",
        message: "আগামীকালের সকালের ব্যাচের ক্লাস সকাল ৮টার পরিবর্তে সকাল ৭:৩০ মিনিটে শুরু হবে।",
        batchId: "batch_morning",
        senderId: "admin_uid",
        createdAt: new Date().toISOString()
      }
    ],
    examSessions: [],
    attendance: [],
    examResults: []
  };

  localStorage.setItem(MOCK_STORAGE_KEY, JSON.stringify(initialDB));
  return initialDB;
}

function saveMockDB(db: MockDB) {
  localStorage.setItem(MOCK_STORAGE_KEY, JSON.stringify(db));
}

// Generic helper to generate quick unique ID
const makeId = () => "id_" + Math.random().toString(36).substr(2, 9) + "_" + Date.now().toString(36);

// =========================================================================
// Library Item LocalStorage Caching Helpers (24-Hour TTL)
// =========================================================================
const CACHE_24H_MS = 24 * 60 * 60 * 1000;

function getLibraryItemCacheKey(itemId: string, itemTimestamp?: string): string {
  if (!itemTimestamp) {
    const libraryList = globalApiCache.library?.data;
    const meta = libraryList?.find(i => i.id === itemId);
    itemTimestamp = meta?.updatedAt || meta?.createdAt || 'v1';
  }
  return `mc_lib_${itemId}_${itemTimestamp}`;
}

function getCachedLibraryItemDetails(itemId: string): LibraryItem | null {
  try {
    const key = getLibraryItemCacheKey(itemId);
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const entry = JSON.parse(raw);
    if (!entry || typeof entry.timestamp !== 'number' || !entry.data) {
      localStorage.removeItem(key);
      return null;
    }
    if (Date.now() - entry.timestamp > CACHE_24H_MS) {
      localStorage.removeItem(key);
      return null;
    }
    return entry.data as LibraryItem;
  } catch (e) {
    return null;
  }
}

function setCachedLibraryItemDetails(itemId: string, data: LibraryItem): void {
  try {
    const key = getLibraryItemCacheKey(itemId, data.updatedAt || data.createdAt);
    localStorage.setItem(key, JSON.stringify({
      timestamp: Date.now(),
      data: data
    }));
  } catch (e) {
    // Fail silently if localStorage quota is exceeded or storage is disabled
  }
}

function removeLibraryItemCache(itemId: string): void {
  try {
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const k = localStorage.key(i);
      if (k && k.startsWith(`mc_lib_${itemId}`)) {
        localStorage.removeItem(k);
      }
    }
  } catch (e) {
    // Fail silently
  }
}

// =========================================================================
// 3. EXPORTED UINFIED API ENGINE
// =========================================================================

// Items deleted in this session are hidden for 3 minutes, so a slightly stale VPS copy can't make them reappear.
const recentlyDeletedIds = new Map<string, number>();
function markDeleted(ids: string[]): void {
  const until = Date.now() + 3 * 60 * 1000;
  ids.forEach(id => { if (id) recentlyDeletedIds.set(String(id), until); });
}
function dropDeleted<T>(arr: T[]): T[] {
  if (!Array.isArray(arr) || recentlyDeletedIds.size === 0) return arr;
  const now = Date.now();
  recentlyDeletedIds.forEach((until, id) => { if (until < now) recentlyDeletedIds.delete(id); });
  return arr.filter((x: any) => !(x && recentlyDeletedIds.has(String(x.id))));
}

export const api = {
  // Check if we are running in production Apps Script web app
  isProduction: () => USE_REAL_API,

  // --- 👤 USERS & AUTHENTICATION ---
  
  getUsers: async (): Promise<UserProfile[]> => {
    if (USE_REAL_API) {
      if (globalApiCache.users && Date.now() - globalApiCache.users.time < CACHE_TTL) {
        return globalApiCache.users.data;
      }

      const vpsRes = await fetchFromVpsWithSession<UserProfile[]>('/users');
      if (vpsRes && Array.isArray(vpsRes.data)) {
        if (lastMutationTime.users > 0 && vpsRes.timestamp < lastMutationTime.users && optimisticUsersCache) {
          console.info(`[API] Read-Your-Writes guard: keeping recent local users mutation (${lastMutationTime.users} > VPS snapshot ${vpsRes.timestamp})`);
          globalApiCache.users = { data: optimisticUsersCache, time: Date.now() };
          return optimisticUsersCache;
        }
        optimisticUsersCache = vpsRes.data;
        globalApiCache.users = { data: vpsRes.data, time: Date.now() };
        return vpsRes.data;
      }

      const data = await runGasMethod<UserProfile[]>("apiGetUsers");
      optimisticUsersCache = data;
      globalApiCache.users = { data, time: Date.now() };
      return data;
    } else {
      return getMockDB().users;
    }
  },

  healStudentIds: async (): Promise<{ success: boolean; healedCount: number; updatedRows: number; idMap: Record<string, string> }> => {
    if (USE_REAL_API) {
      lastMutationTime.users = Date.now();
      return runGasMethod<{ success: boolean; healedCount: number; updatedRows: number; idMap: Record<string, string> }>("apiHealStudentIds");
    } else {
      return { success: true, healedCount: 0, updatedRows: 0, idMap: {} };
    }
  },

  saveUser: async (user: Omit<UserProfile, 'id'> & { id?: string }): Promise<UserProfile> => {
    globalApiCache.users = null;
    if (USE_REAL_API) {
      const saved = await runGasMethod<UserProfile>("apiSaveUser", user);
      lastMutationTime.users = Date.now();
      if (optimisticUsersCache && saved && saved.id) {
        const idx = optimisticUsersCache.findIndex(u => String(u.id) === String(saved.id));
        if (idx !== -1) {
          optimisticUsersCache = [
            ...optimisticUsersCache.slice(0, idx),
            { ...optimisticUsersCache[idx], ...saved },
            ...optimisticUsersCache.slice(idx + 1)
          ];
        } else {
          optimisticUsersCache = [...optimisticUsersCache, saved];
        }
        globalApiCache.users = { data: optimisticUsersCache, time: Date.now() };
      }
      return saved;
    } else {
      const db = getMockDB();
      if (user.id) {
        const idx = db.users.findIndex(u => u.id === user.id);
        if (idx !== -1) {
          db.users[idx] = { ...db.users[idx], ...user, updatedAt: new Date().toISOString() } as UserProfile;
          saveMockDB(db);
          return db.users[idx];
        }
      }
      // Register new student
      const newUser: UserProfile = {
        ...user,
        id: user.id || makeId(),
        role: user.role || 'student',
        status: user.status || 'incomplete',
        paymentStatus: user.paymentStatus || 'unpaid',
        passcode: user.passcode || cleanPhone(user.phone),
        createdAt: new Date().toISOString()
      } as UserProfile;
      db.users.push(newUser);
      saveMockDB(db);
      return newUser;
    }
  },

  updateUserStatus: async (userId: string, status: UserProfile['status'], rejectReason?: string): Promise<UserProfile> => {
    globalApiCache.users = null;
    if (USE_REAL_API) {
      const res = await runGasMethod<UserProfile>("apiUpdateUserStatus", userId, status, rejectReason);
      if (!(res as any) || (res as any).success === false) {
        throw new Error((res as any)?.error || "Failed to update user status");
      }
      lastMutationTime.users = Date.now();
      if (optimisticUsersCache) {
        const idx = optimisticUsersCache.findIndex(u => String(u.id) === String(userId));
        if (idx !== -1) {
          optimisticUsersCache = [
            ...optimisticUsersCache.slice(0, idx),
            { ...optimisticUsersCache[idx], status, ...(rejectReason ? { reapplyReason: rejectReason, rejectReason } : {}) },
            ...optimisticUsersCache.slice(idx + 1)
          ];
          globalApiCache.users = { data: optimisticUsersCache, time: Date.now() };
        }
      }
      return res;
    } else {
      const db = getMockDB();
      const idx = db.users.findIndex(u => u.id === userId);
      if (idx === -1) throw new Error("User not found");
      db.users[idx].status = status;
      if (rejectReason) db.users[idx].reapplyReason = rejectReason;
      if (status === 'active') db.users[idx].paymentStatus = 'unpaid';
      db.users[idx].updatedAt = new Date().toISOString();
      saveMockDB(db);
      return db.users[idx];
    }
  },

  updateUserPasscode: async (userId: string, passcode: string): Promise<UserProfile> => {
    globalApiCache.users = null;
    if (USE_REAL_API) {
      lastMutationTime.users = Date.now();
      return runGasMethod<UserProfile>("apiUpdateUserPasscode", userId, passcode);
    } else {
      const db = getMockDB();
      const idx = db.users.findIndex(u => u.id === userId);
      if (idx === -1) throw new Error("User not found");
      db.users[idx].passcode = passcode;
      db.users[idx].updatedAt = new Date().toISOString();
      saveMockDB(db);
      return db.users[idx];
    }
  },

  getMyProfile: async (): Promise<UserProfile> => {
    if (USE_REAL_API) {
      const vpsRes = await fetchFromVpsWithSession<UserProfile>('/me');
      if (vpsRes && vpsRes.data && (lastMutationTime.users === 0 || vpsRes.timestamp >= lastMutationTime.users)) {
        return vpsRes.data;
      }
      return runGasMethod<UserProfile>("apiGetMyProfile");
    } else {
      const db = getMockDB();
      return db.users[0] || ({} as UserProfile);
    }
  },

  logoutUser: async (): Promise<void> => {
    if (USE_REAL_API && getSessionToken()) {
      try {
        await runGasMethod("apiLogoutUser");
      } catch (e) {
        // Ignore network errors during logout
      }
    }
    clearSessionToken();
  },

  checkApplicationStatus: async (phone: string): Promise<{ success: boolean; status: string; userId?: string; error?: string }> => {
    if (USE_REAL_API) {
      return runGasMethod<{ success: boolean; status: string; userId?: string; error?: string }>("apiCheckApplicationStatus", phone);
    } else {
      const db = getMockDB();
      const cleanedInputPhone = cleanPhone(phone || "");
      const existingUser = db.users.find(u => cleanPhone(u.phone) === cleanedInputPhone);
      
      if (!existingUser) {
        return { success: true, status: "not_found" };
      }
      
      return { success: true, status: existingUser.status as string, userId: existingUser.id };
    }
  },

  // no login needed: batch names for the New Joining form
  getPublicBatches: async (): Promise<{ id: string; name: string }[]> => {
    if (USE_REAL_API) {
      const list = await runGasMethod<{ id: string; name: string }[]>("apiGetPublicBatches");
      return Array.isArray(list) ? list : [];
    }
    return getMockDB().batches.map((b: any) => ({ id: b.id, name: b.name }));
  },

  registerUser: async (userData: Partial<UserProfile>): Promise<{ success: boolean; status: string; message?: string; data?: any }> => {
    globalApiCache.users = null;
    if (USE_REAL_API) {
      return runGasMethod<{ success: boolean; status: string; message?: string; data?: any }>("apiRegisterUser", userData);
    } else {
      const db = getMockDB();
      const cleanedInputPhone = cleanPhone(userData.phone || "");
      const existingUser = db.users.find(u => cleanPhone(u.phone) === cleanedInputPhone);
      
      if (existingUser) {
        return { success: true, status: existingUser.status, message: "User already exists" };
      }
      
      const newUser: UserProfile = {
        ...userData,
        id: makeId(),
        role: 'student',
        status: 'pending',
        paymentStatus: 'unpaid',
        passcode: cleanPhone(userData.phone || ""),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      } as UserProfile;
      
      db.users.push(newUser);
      saveMockDB(db);
      return { success: true, status: 'pending', data: newUser };
    }
  },

  loginUser: async (phone: string, passcode: string): Promise<UserProfile> => {
    if (USE_REAL_API) {
      const profile = await runGasMethod<UserProfile>("apiLoginUser", phone, passcode);
      if (profile && (profile as any).sessionToken) {
        setSessionToken((profile as any).sessionToken);
      }
      return profile;
    } else {
      const db = getMockDB();
      const cleanedInputPhone = cleanPhone(phone);
      
      const user = db.users.find(u => {
        return cleanPhone(u.phone) === cleanedInputPhone;
      });

      if (!user) throw new Error("ফোন নম্বরটি নিবন্ধিত নয় (Phone number not registered)");
      
      let userPasscodeStr = user.passcode !== undefined && user.passcode !== null ? String(user.passcode).trim() : "";
      const inputPasscodeStr = passcode !== undefined && passcode !== null ? String(passcode).trim() : "";
      
      if (userPasscodeStr === "") {
        const defaultPasscode = cleanPhone(user.phone);
        if (inputPasscodeStr === defaultPasscode) {
          userPasscodeStr = defaultPasscode;
          user.passcode = defaultPasscode;
          saveMockDB(db);
        }
      }

      if (userPasscodeStr !== inputPasscodeStr) throw new Error("ভুল পাসকোড! দয়া করে সঠিক পাসকোড দিন (Invalid Passcode)");
      return user;
    }
  },

  getAnnouncement: async (): Promise<string> => {
    if (USE_REAL_API) {
      let ann: string | null = null;
      let source = "GAS";

      const vpsAnn = await fetchFromVps<string>("/announcement");
      if (typeof vpsAnn === 'string') {
        ann = vpsAnn;
        source = "VPS (mc-api)";
      } else {
        ann = await runGasMethod<string>('apiGetAnnouncement');
        source = "GAS (fallback)";
      }
      console.log(`[API] getAnnouncement loaded from ${source}`);
      return ann;
    }
    return localStorage.getItem('mc_announcement') || '';
  },
  saveAnnouncement: async (message: string): Promise<boolean> => {
    if (USE_REAL_API) {
      await runGasMethod<any>('apiSaveAnnouncement', message);
      return true;
    }
    localStorage.setItem('mc_announcement', message);
    return true;
  },
  deleteUser: async (userId: string): Promise<boolean> => {
    globalApiCache.users = null;
    if (USE_REAL_API) {
      return runGasMethod<boolean>("apiDeleteUser", userId);
    } else {
      const db = getMockDB();
      const initialLength = db.users.length;
      db.users = db.users.filter(u => u.id !== userId);
      saveMockDB(db);
      return db.users.length < initialLength;
    }
  },

  // --- 🎒 BATCHES ---

  getBatches: async (userId?: string): Promise<Batch[]> => {
    if (USE_REAL_API) {
      if (globalApiCache.batches && Date.now() - globalApiCache.batches.time < CACHE_TTL) {
        return globalApiCache.batches.data;
      }
      let data: Batch[] | null = null;
      let source = "GAS";

      const vpsData = await fetchFromVps<Batch[]>("/batches");
      if (vpsData && Array.isArray(vpsData)) {
        data = vpsData;
        source = "VPS (mc-api)";
      } else {
        data = await runGasMethod<Batch[]>("apiGetBatches");
        source = "GAS (fallback)";
      }
      console.log(`[API] getBatches loaded from ${source} (${data.length} batches)`);

      globalApiCache.batches = { data, time: Date.now() };
      if (userId) {
        setLocalSwr(userId, 'batches', data);
      }
      return data;
    } else {
      return getMockDB().batches;
    }
  },

  saveBatch: async (batch: Omit<Batch, 'id' | 'createdAt'> & { id?: string }): Promise<Batch> => {
    globalApiCache.batches = null;
    if (USE_REAL_API) {
      return runGasMethod<Batch>("apiSaveBatch", batch);
    } else {
      const db = getMockDB();
      if (batch.id) {
        const idx = db.batches.findIndex(b => b.id === batch.id);
        if (idx !== -1) {
          db.batches[idx] = { ...db.batches[idx], ...batch } as Batch;
          saveMockDB(db);
          return db.batches[idx];
        }
      }
      const newBatch: Batch = {
        ...batch,
        id: makeId(),
        assignedItemsMap: batch.assignedItemsMap || {},
        createdAt: new Date().toISOString()
      };
      db.batches.push(newBatch);
      saveMockDB(db);
      return newBatch;
    }
  },

  deleteBatch: async (batchId: string): Promise<boolean> => {
    globalApiCache.batches = null;
    if (USE_REAL_API) {
      return runGasMethod<boolean>("apiDeleteBatch", batchId);
    } else {
      const db = getMockDB();
      const initialLength = db.batches.length;
      db.batches = db.batches.filter(b => b.id !== batchId);
      saveMockDB(db);
      return db.batches.length < initialLength;
    }
  },
  // --- 📦 UNIFIED DASHBOARD API ---
  getStudentDashboardData: async (batchIds: string[], studentId: string): Promise<any> => {
    if (USE_REAL_API) {
      const data = await runGasMethod<any>("apiGetStudentDashboardData", batchIds, studentId);
      // Cache the returned data fragments so other views don't re-fetch them unnecessarily
      if (data && data.announcements !== undefined) {
        globalApiCache.announcement = { data: data.announcements, time: Date.now() };
      }
      if (studentId && data) {
        setLocalSwr(studentId, 'dashboard', data);
      }
      return data;
    } else {
      // Mock fallback: just make the separate calls
      return {
        announcements: await api.getAnnouncement(),
        batches: await api.getBatches(),
        library: await api.getLibrary(),
        examSessions: await api.getExamSessions(),
        payments: await api.getPayments()
      };
    }
  },

  // --- 📚 LIBRARY ---

  getLibrary: async (userId?: string): Promise<LibraryItem[]> => {
    if (USE_REAL_API) {
      if (globalApiCache.library && Date.now() - globalApiCache.library.time < CACHE_TTL) {
        return dropDeleted(globalApiCache.library.data);
      }
      let data: LibraryItem[] | null = null;
      let source = "GAS";

      const vpsData = await fetchFromVps<LibraryItem[]>("/library");
      if (vpsData && Array.isArray(vpsData)) {
        data = vpsData;
        source = "VPS (mc-api)";
      } else {
        data = await runGasMethod<LibraryItem[]>("apiGetLibrary");
        source = "GAS (fallback)";
      }
      data = dropDeleted(data);
      console.log(`[API] getLibrary loaded from ${source} (${data.length} items)`);

      globalApiCache.library = { data, time: Date.now() };
      if (userId) {
        setLocalSwr(userId, 'library', data);
      }
      return data;
    } else {
      return getMockDB().library;
    }
  },
  getLibraryItemDetails: async (itemId: string): Promise<LibraryItem> => {
    if (USE_REAL_API) {
      const cached = getCachedLibraryItemDetails(itemId);
      if (cached) {
        return cached;
      }
      let item: LibraryItem | null = null;
      let source = "GAS";

      const vpsItem = await fetchFromVps<LibraryItem>(`/library/${encodeURIComponent(itemId)}`);
      if (vpsItem && vpsItem.id) {
        item = vpsItem;
        source = "VPS (mc-api)";
      } else {
        item = await runGasMethod<LibraryItem>("apiGetLibraryItemDetails", itemId);
        source = "GAS (fallback)";
      }
      console.log(`[API] getLibraryItemDetails (${itemId}) loaded from ${source}`);

      if (item) {
        setCachedLibraryItemDetails(itemId, item);
      }
      return item;
    } else {
      const db = getMockDB();
      const item = db.library.find(i => i.id === itemId);
      if (!item) throw new Error("Item not found");
      return item;
    }
  },

  saveLibraryItem: async (item: Partial<LibraryItem>): Promise<LibraryItem> => {
    globalApiCache.library = null;
    if (item.id) {
      removeLibraryItemCache(item.id);
    }
    if (USE_REAL_API) {
      const res = await runGasMethod<LibraryItem>("apiSaveLibraryItem", item);
      if (res && res.id) {
        removeLibraryItemCache(res.id);
      }
      return res;
    } else {
      const db = getMockDB();
      if (item.id) {
        const idx = db.library.findIndex(i => i.id === item.id);
        if (idx !== -1) {
          db.library[idx] = { ...db.library[idx], ...item } as LibraryItem;
          saveMockDB(db);
          return db.library[idx];
        }
      }
      const newItem: LibraryItem = {
        ...item,
        id: makeId(),
        createdAt: new Date().toISOString()
      } as LibraryItem;
      db.library.push(newItem);
      saveMockDB(db);
      return newItem;
    }
  },

  updateLibrarySequences: async (updates: { id: string, sequence: number }[]): Promise<void> => {
    globalApiCache.library = null;
    updates.forEach(u => {
      if (u.id) removeLibraryItemCache(u.id);
    });
    if (USE_REAL_API) {
      await runGasMethod<void>("apiUpdateLibrarySequences", updates);
    } else {
      const db = getMockDB();
      updates.forEach(update => {
        const item = db.library.find(i => i.id === update.id);
        if (item) item.sequence = update.sequence;
      });
      saveMockDB(db);
    }
  },

  deleteLibraryItem: async (itemId: string): Promise<boolean> => {
    globalApiCache.library = null;
    removeLibraryItemCache(itemId);
    if (USE_REAL_API) {
      const ok = await runGasMethod<boolean>("apiDeleteLibraryItem", itemId);
      markDeleted([itemId]);
      return ok;
    } else {
      const db = getMockDB();
      const initialLength = db.library.length;
      db.library = db.library.filter(i => i.id !== itemId);
      
      // Clean up batch share links
      db.batches.forEach(b => {
        if (b.assignedItemsMap[itemId]) {
          delete b.assignedItemsMap[itemId];
        }
      });
      
      saveMockDB(db);
      return db.library.length < initialLength;
    }
  },

  deleteMultipleLibraryItems: async (itemIds: string[]): Promise<{ success: boolean; count?: number }> => {
    globalApiCache.library = null;
    globalApiCache.batches = null;
    if (USE_REAL_API) {
      const res = await runGasMethod<{ success: boolean; count?: number }>("apiDeleteMultipleLibraryItems", itemIds);
      markDeleted(itemIds);
      return res;
    } else {
      const db = getMockDB();
      const initialLength = db.library.length;
      const idsSet = new Set(itemIds);
      db.library = db.library.filter(i => !idsSet.has(i.id));
      
      // Clean up batch share links
      db.batches.forEach(b => {
        itemIds.forEach(id => {
          if (b.assignedItemsMap[id]) {
            delete b.assignedItemsMap[id];
          }
        });
      });
      
      saveMockDB(db);
      return { success: true, count: initialLength - db.library.length };
    }
  },

  shareLibraryItem: async (itemId: string, batchIdsMap: Record<string, boolean>, scheduledStartTimeMap?: Record<string, string>): Promise<boolean> => {
    globalApiCache.batches = null;
    if (USE_REAL_API) {
      return runGasMethod<boolean>("apiShareLibraryItem", itemId, batchIdsMap, scheduledStartTimeMap || {});
    } else {
      const db = getMockDB();
      db.batches.forEach(b => {
        if (!b.scheduledStartTimeMap) {
          b.scheduledStartTimeMap = {};
        }
        if (batchIdsMap[b.id]) {
          b.assignedItemsMap[itemId] = new Date().toISOString();
          if (scheduledStartTimeMap && scheduledStartTimeMap[b.id]) {
            b.scheduledStartTimeMap[itemId] = scheduledStartTimeMap[b.id];
          } else {
            delete b.scheduledStartTimeMap[itemId];
          }
        } else {
          delete b.assignedItemsMap[itemId];
          delete b.scheduledStartTimeMap[itemId];
        }
      });
      saveMockDB(db);
      return true;
    }
  },

  // --- 💳 PAYMENTS ---

  cleanPaymentMonth: (monthStr: string): string => {
    if (!monthStr) return "";
    
    if (monthStr.includes(',')) {
      return monthStr.split(',').map(m => api.cleanPaymentMonth(m.trim())).filter(Boolean).join(', ');
    }

    // If already clean (e.g. "May 2026"), return it
    if (/^[a-zA-Z]+\s+\d{4}$/.test(monthStr)) {
      return monthStr;
    }

    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June', 
      'July', 'August', 'September', 'October', 'November', 'December'
    ];

    // Check for DD-MM-YYYY or MM-DD-YYYY or D/M/YYYY or M/D/YYYY
    const slashOrDashMatch = monthStr.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
    if (slashOrDashMatch) {
      const part1 = parseInt(slashOrDashMatch[1], 10); // usually month or day
      const part2 = parseInt(slashOrDashMatch[2], 10); // usually day or month
      const year = parseInt(slashOrDashMatch[3], 10);
      
      // Google Sheets format usually is M/D/YYYY (e.g. "4/1/2026" for April 1, 2026)
      // If part1 is within 1-12 and part2 is 1 (standard start of month in offline entries), it is MM/DD/YYYY
      if (part1 >= 1 && part1 <= 12 && part2 === 1) {
        return `${monthNames[part1 - 1]} ${year}`;
      }
      
      // General D/M/YYYY fallback where part2 is month:
      if (part2 >= 1 && part2 <= 12) {
        return `${monthNames[part2 - 1]} ${year}`;
      }
      
      // M/D/YYYY fallback:
      if (part1 >= 1 && part1 <= 12) {
        return `${monthNames[part1 - 1]} ${year}`;
      }
    }

    // Check for standard ISO Date: "2026-05-01T00:00:00.000Z" or "2026-05-01"
    const isoMatch = monthStr.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (isoMatch) {
      const year = parseInt(isoMatch[1], 10);
      const monthNum = parseInt(isoMatch[2], 10); // 1-12
      if (monthNum >= 1 && monthNum <= 12) {
        return `${monthNames[monthNum - 1]} ${year}`;
      }
    }

    // Fallback to JS Date parsing
    const parsed = new Date(monthStr);
    if (!isNaN(parsed.getTime()) && monthStr.length > 8) {
      const monthIdx = parsed.getMonth(); // 0-11
      const year = parsed.getFullYear();
      return `${monthNames[monthIdx]} ${year}`;
    }

    return monthStr;
  },

  getPayments: async (): Promise<PaymentRecord[]> => {
    let payments: PaymentRecord[];
    if (USE_REAL_API) {
      if (globalApiCache.payments && Date.now() - globalApiCache.payments.time < CACHE_TTL) {
        return globalApiCache.payments.data;
      }

      const vpsRes = await fetchFromVpsWithSession<PaymentRecord[]>('/payments');
      if (vpsRes && Array.isArray(vpsRes.data)) {
        if (lastMutationTime.payments > 0 && vpsRes.timestamp < lastMutationTime.payments && optimisticPaymentsCache) {
          console.info(`[API] Read-Your-Writes guard: keeping recent local payments mutation (${lastMutationTime.payments} > VPS snapshot ${vpsRes.timestamp})`);
          globalApiCache.payments = { data: optimisticPaymentsCache, time: Date.now() };
          return optimisticPaymentsCache;
        }
        const cleaned = vpsRes.data.map(p => ({
          ...p,
          month: api.cleanPaymentMonth(p.month)
        }));
        optimisticPaymentsCache = cleaned;
        globalApiCache.payments = { data: cleaned, time: Date.now() };
        return cleaned;
      }

      payments = await runGasMethod<PaymentRecord[]>("apiGetPayments");
      const cleaned = (payments || []).map(p => ({
        ...p,
        month: api.cleanPaymentMonth(p.month)
      }));
      optimisticPaymentsCache = cleaned;
      globalApiCache.payments = { data: cleaned, time: Date.now() };
      return cleaned;
    } else {
      payments = getMockDB().payments;
      return (payments || []).map(p => ({
        ...p,
        month: api.cleanPaymentMonth(p.month)
      }));
    }
  },

  getPaymentProof: async (paymentId: string): Promise<string> => {
    if (USE_REAL_API) {
      const res = await runGasMethod<{ id: string; proofImage: string }>("apiGetPaymentProof", paymentId);
      return res?.proofImage || "";
    } else {
      const db = getMockDB();
      const found = db.payments.find(p => p.id === paymentId);
      return found?.proofImage || "";
    }
  },

  submitPaymentRequest: async (paymentData: Partial<PaymentRecord>): Promise<PaymentRecord> => {
    globalApiCache.payments = null;
    let savedPayment: PaymentRecord;
    if (USE_REAL_API) {
      savedPayment = await runGasMethod<PaymentRecord>("apiSubmitPaymentRequest", paymentData);
      lastMutationTime.payments = Date.now();
      const formattedSaved = {
        ...savedPayment,
        hasProof: Boolean((savedPayment as any).hasProof || paymentData.proofImage),
        month: api.cleanPaymentMonth(savedPayment.month)
      };
      if (optimisticPaymentsCache) {
        optimisticPaymentsCache = [formattedSaved, ...optimisticPaymentsCache.filter(p => p.id !== formattedSaved.id)];
        globalApiCache.payments = { data: optimisticPaymentsCache, time: Date.now() };
      }
      return formattedSaved;
    } else {
      const db = getMockDB();
      const newPay: PaymentRecord = {
        ...paymentData,
        id: makeId(),
        status: 'pending',
        createdAt: new Date().toISOString()
      } as PaymentRecord;
      db.payments.push(newPay);
      saveMockDB(db);
      savedPayment = newPay;
    }
    return {
      ...savedPayment,
      month: api.cleanPaymentMonth(savedPayment.month)
    };
  },

  addPayment: async (payment: Omit<PaymentRecord, 'id' | 'createdAt'>): Promise<PaymentRecord> => {
    return api.submitPaymentRequest(payment);
  },

  updatePaymentStatus: async (paymentId: string, status: PaymentRecord['status'], remarks: string = ''): Promise<PaymentRecord> => {
    globalApiCache.payments = null;
    let updatedPayment: PaymentRecord;
    if (USE_REAL_API) {
      updatedPayment = await runGasMethod<PaymentRecord>("apiUpdatePaymentStatus", paymentId, status, remarks);
      lastMutationTime.payments = Date.now();
      lastMutationTime.users = Date.now();
      const formattedUpdated = {
        ...updatedPayment,
        month: api.cleanPaymentMonth(updatedPayment.month)
      };
      if (optimisticPaymentsCache) {
        optimisticPaymentsCache = optimisticPaymentsCache.map(p => p.id === paymentId ? { ...p, ...formattedUpdated, status, ...(remarks ? { remarks } : {}) } : p);
        globalApiCache.payments = { data: optimisticPaymentsCache, time: Date.now() };
      }
      return formattedUpdated;
    } else {
      const db = getMockDB();
      const idx = db.payments.findIndex(p => p.id === paymentId);
      if (idx === -1) throw new Error("Payment record not found");
      db.payments[idx].status = status;
      if (remarks) {
        db.payments[idx].remarks = remarks;
      }
      
      // Update user global status
      const userIdx = db.users.findIndex(u => u.id === db.payments[idx].studentId);
      if (userIdx !== -1) {
        db.users[userIdx].paymentStatus = status;
      }

      saveMockDB(db);
      updatedPayment = db.payments[idx];
    }
    return {
      ...updatedPayment,
      month: api.cleanPaymentMonth(updatedPayment.month)
    };
  },

  bulkUpdatePaymentStatus: async (paymentIds: string[], status: PaymentRecord['status'], remarks: string = ''): Promise<{ success: boolean; count: number; error?: string }> => {
    globalApiCache.payments = null;
    if (USE_REAL_API) {
      const res = await runGasMethod<{ success: boolean; count: number; error?: string }>("apiBulkUpdatePaymentStatus", paymentIds, status, remarks);
      lastMutationTime.payments = Date.now();
      lastMutationTime.users = Date.now();
      return res;
    } else {
      const db = getMockDB();
      db.payments = db.payments.map(p => paymentIds.includes(p.id) ? { ...p, status, ...(remarks ? { remarks } : {}) } : p);
      saveMockDB(db);
      return { success: true, count: paymentIds.length };
    }
  },

  setStudentExcusedMonths: async (studentId: string, excusedMonths: string[] | string): Promise<{ success: boolean; error?: string }> => {
    globalApiCache.users = null;
    const rawMonths = Array.isArray(excusedMonths) ? excusedMonths.join(', ') : String(excusedMonths || '');
    if (USE_REAL_API) {
      const res = await runGasMethod<{ success: boolean; error?: string }>("apiSetStudentExcusedMonths", studentId, rawMonths);
      lastMutationTime.users = Date.now();
      return res;
    } else {
      const db = getMockDB();
      const u = db.users.find(x => x.id === studentId);
      if (u) (u as any).excusedMonths = rawMonths;
      saveMockDB(db);
      return { success: true };
    }
  },

  // --- 📢 NOTIFICATIONS ---

  getNotifications: async (userId?: string): Promise<NotificationItem[]> => {
    if (USE_REAL_API) {
      if (globalApiCache.notifications && Date.now() - globalApiCache.notifications.time < CACHE_TTL) {
        return dropDeleted(globalApiCache.notifications.data);
      }
      let data: NotificationItem[] | null = null;
      let source = "GAS";

      // Admin must see ALL notifications incl. student→admin messages, which the VPS copy excludes → admin reads from GAS.
      let isAdminUser = false;
      try { isAdminUser = JSON.parse(localStorage.getItem("mc_session_user") || "{}").role === "admin"; } catch (e) {}
      const vpsData = isAdminUser ? null : await fetchFromVps<NotificationItem[]>("/notifications");
      if (vpsData && Array.isArray(vpsData)) {
        data = vpsData;
        source = "VPS (mc-api)";
      } else {
        data = await runGasMethod<NotificationItem[]>("apiGetNotifications");
        source = "GAS (fallback)";
      }
      data = dropDeleted(data);
      console.log(`[API] getNotifications loaded from ${source} (${data.length} notifications)`);

      globalApiCache.notifications = { data, time: Date.now() };
      if (userId) {
        setLocalSwr(userId, 'notifications', data);
      }
      return data;
    } else {
      return getMockDB().notifications;
    }
  },

  createNotification: async (notif: Omit<NotificationItem, 'id' | 'createdAt'>): Promise<NotificationItem> => {
    if (USE_REAL_API) {
      return runGasMethod<NotificationItem>("apiCreateNotification", notif);
    } else {
      const db = getMockDB();
      const newNotif: NotificationItem = {
        ...notif,
        id: makeId(),
        createdAt: new Date().toISOString()
      };
      db.notifications.push(newNotif);
      saveMockDB(db);
      return newNotif;
    }
  },

  updatePaymentAmount: async (paymentId: string, amount: number): Promise<PaymentRecord> => {
    globalApiCache.payments = null;
    let updatedPayment: PaymentRecord;
    if (USE_REAL_API) {
      updatedPayment = await runGasMethod<PaymentRecord>("apiUpdatePaymentAmount", paymentId, amount);
    } else {
      const db = getMockDB();
      const idx = db.payments.findIndex(p => p.id === paymentId);
      if (idx === -1) throw new Error("Payment record not found");
      db.payments[idx].amount = amount;
      saveMockDB(db);
      updatedPayment = db.payments[idx];
    }
    return {
      ...updatedPayment,
      month: api.cleanPaymentMonth(updatedPayment.month)
    };
  },

  clearNotificationsCache: () => { globalApiCache.notifications = null; },

  // --- Exam notification (structured: batch + date + exam ids) ---
  getExamRequestOptions: async (batchId: string, dateIso: string): Promise<ExamRequestOptions> => {
    return runGasMethod<ExamRequestOptions>("apiGetExamRequestOptions", batchId, dateIso || '');
  },
  createExamNotification: async (req: { batchId: string; examDate: string; examIds: string[] }): Promise<any> => {
    globalApiCache.notifications = null;
    globalApiCache.batches = null;
    return runGasMethod<any>("apiCreateExamNotification", req);
  },

  deleteNotification: async (notifId: string): Promise<boolean> => {
    globalApiCache.notifications = null;
    if (USE_REAL_API) {
      markDeleted([notifId]); // hide at once; server delete runs in background
      const ok = await runGasMethod<boolean>("apiDeleteNotification", notifId);
      return ok;
    } else {
      const db = getMockDB();
      const initialLength = db.notifications.length;
      db.notifications = db.notifications.filter(n => n.id !== notifId);
      saveMockDB(db);
      return db.notifications.length < initialLength;
    }
  },

  // --- 📝 EXAMS & ATTENDANCE ---

  getExamSessions: async (forceRefresh = false): Promise<ExamSession[]> => {
    if (!forceRefresh && globalApiCache.examSessions && Date.now() - globalApiCache.examSessions.time < CACHE_TTL) {
      return globalApiCache.examSessions.data;
    }
    if (USE_REAL_API) {
      const data = await runGasMethod<ExamSession[]>("apiGetExamSessions");
      globalApiCache.examSessions = { data, time: Date.now() };
      return data;
    } else {
      return getMockDB().examSessions;
    }
  },

  createExamSession: async (session: Omit<ExamSession, 'id' | 'isActive' | 'participantUids' | 'createdAt'>): Promise<ExamSession> => {
    globalApiCache.examSessions = null;
    if (USE_REAL_API) {
      return runGasMethod<ExamSession>("apiCreateExamSession", session);
    } else {
      const db = getMockDB();
      const newSession: ExamSession = {
        ...session,
        id: makeId(),
        isActive: true,
        participantUids: [],
        createdAt: new Date().toISOString()
      };
      db.examSessions.push(newSession);
      saveMockDB(db);
      return newSession;
    }
  },

  endExamSession: async (sessionId: string): Promise<ExamSession> => {
    globalApiCache.examSessions = null;
    if (USE_REAL_API) {
      return runGasMethod<ExamSession>("apiEndExamSession", sessionId);
    } else {
      const db = getMockDB();
      const idx = db.examSessions.findIndex(s => s.id === sessionId);
      if (idx === -1) throw new Error("Exam session not found");
      db.examSessions[idx].isActive = false;
      saveMockDB(db);
      return db.examSessions[idx];
    }
  },

  joinExamSession: async (sessionId: string, userId: string, studentName: string, studentPhone: string, enteredCode: string): Promise<{ success: boolean; status?: string; error?: string }> => {
    if (USE_REAL_API) {
      return runGasMethod<{ success: boolean; status?: string; error?: string }>("apiJoinExamSession", sessionId, userId, studentName, studentPhone, enteredCode);
    } else {
      const db = getMockDB();
      const sessionIdx = db.examSessions.findIndex(s => s.id === sessionId);
      if (sessionIdx === -1) return { success: false, error: "সেশন পাওয়া যায়নি" };
      
      const session = db.examSessions[sessionIdx];
      if (!session.isActive) return { success: false, error: "সেশন সক্রিয় নয়" };
      if (session.codeEnabled && session.code !== enteredCode) {
        return { success: false, error: "wrong_code" };
      }

      if (!session.participantUids.includes(userId)) {
        session.participantUids.push(userId);
        
        // Append attendance record
        db.attendance.push({
          id: makeId(),
          sessionId,
          studentId: userId,
          studentName,
          studentPhone,
          joinedTime: new Date().toISOString(),
          createdAt: new Date().toISOString()
        });
        saveMockDB(db);
      }

      return { success: true, status: "ok" };
    }
  },

  submitExamResult: async (result: Partial<ExamResult> & { id?: string }): Promise<ExamResult> => {
    globalApiCache.examResults = null;
    if (USE_REAL_API) {
      return runGasMethod<ExamResult>("apiSubmitExamResult", result);
    } else {
      const db = getMockDB();
      const existingIdx = db.examResults.findIndex((r: any) => r.id === result.id);
      if (existingIdx !== -1) {
        return db.examResults[existingIdx];
      }
      const newResult: ExamResult = {
        ...result,
        id: result.id || makeId(),
        submittedAt: result.submittedAt || new Date().toISOString()
      } as ExamResult;
      db.examResults.push(newResult);
      saveMockDB(db);
      return newResult;
    }
  },

  flushExamOutbox: async (userId: string): Promise<number> => {
    if (!userId) return 0;
    const pending = getExamOutbox(userId);
    if (pending.length === 0) return 0;
    let synced = 0;
    for (const item of pending) {
      try {
        await api.submitExamResult(item as any);
        removeExamFromOutbox(userId, item.id);
        synced++;
      } catch (err) {
        console.warn(`[Outbox] Failed to sync exam result ${item.id}:`, err);
      }
    }
    return synced;
  },

  getExamResults: async (userId?: string): Promise<ExamResult[]> => {
    if (USE_REAL_API) {
      if (globalApiCache.examResults && Date.now() - globalApiCache.examResults.time < CACHE_TTL) {
        return globalApiCache.examResults.data;
      }
      const data = await runGasMethod<ExamResult[]>("apiGetExamResults");
      globalApiCache.examResults = { data, time: Date.now() };
      if (userId) {
        setLocalSwr(userId, 'examResults', data);
      }
      return data;
    } else {
      return getMockDB().examResults;
    }
  },


  hasSubmitted: async (examId: string, studentId: string): Promise<boolean> => {
    if (USE_REAL_API) {
      const res = await runGasMethod<boolean>("apiHasSubmitted", examId, studentId);
      return !!res;
    } else {
      const db = getMockDB();
      return (db.examResults || []).some(
        r => r.examId === examId && r.studentId === studentId
      );
    }
  },

  deleteExamResult: async (id: string): Promise<boolean> => {
    globalApiCache.examResults = null;
    if (USE_REAL_API) {
      return runGasMethod<boolean>("apiDeleteExamResult", id);
    } else {
      const db = getMockDB();
      const initialLength = db.examResults.length;
      db.examResults = db.examResults.filter(r => r.id !== id);
      saveMockDB(db);
      return db.examResults.length < initialLength;
    }
  },

  deleteMultipleExamResults: async (ids: string[]): Promise<{ success: boolean; count?: number }> => {
    globalApiCache.examResults = null;
    if (USE_REAL_API) {
      return runGasMethod<{ success: boolean; count?: number }>("apiDeleteMultipleExamResults", ids);
    } else {
      const db = getMockDB();
      const initialLength = db.examResults.length;
      const idsSet = new Set(ids);
      db.examResults = db.examResults.filter(r => !idsSet.has(r.id));
      saveMockDB(db);
      return { success: true, count: initialLength - db.examResults.length };
    }
  },

  getAttendance: async (): Promise<AttendanceRecord[]> => {
    if (USE_REAL_API) {
      if (globalApiCache.attendance && Date.now() - globalApiCache.attendance.time < CACHE_TTL) {
        return globalApiCache.attendance.data;
      }
      const data = await runGasMethod<AttendanceRecord[]>("apiGetAttendance");
      globalApiCache.attendance = { data, time: Date.now() };
      return data;
    } else {
      return getMockDB().attendance;
    }
  },

  getSettings: async (): Promise<any> => {
    if (globalApiCache.settings && Date.now() - globalApiCache.settings.time < CACHE_TTL) {
      return globalApiCache.settings.data;
    }
    const cachedLocal = localStorage.getItem("mc_cached_settings");
    if (cachedLocal) {
      try {
        const parsed = JSON.parse(cachedLocal);
        if (parsed && Date.now() - Number(parsed.time || 0) < CACHE_TTL) {
          globalApiCache.settings = { data: parsed.data, time: Number(parsed.time) };
          return parsed.data;
        }
      } catch (e) {}
    }
    if (USE_REAL_API) {
      const data = await runGasMethod<any>("apiGetSettings");
      globalApiCache.settings = { data, time: Date.now() };
      try {
        localStorage.setItem("mc_cached_settings", JSON.stringify({ data, time: Date.now() }));
      } catch (e) {}
      return data;
    } else {
      const saved = localStorage.getItem("mc_mock_settings");
      if (saved) return JSON.parse(saved);
      return { adminUpiId: "", adminPayeeName: "", enablePaymentSystem: true };
    }
  },

  saveSettings: async (settings: any): Promise<boolean> => {
    globalApiCache.settings = null;
    try {
      localStorage.removeItem("mc_cached_settings");
    } catch (e) {}
    if (USE_REAL_API) {
      return runGasMethod<boolean>("apiSaveSettings", settings);
    } else {
      localStorage.setItem("mc_mock_settings", JSON.stringify(settings));
      return true;
    }
  },

  // --- 🔐 PASSCODE & OTP MANAGEMENT ---

  // Logged-in user তার passcode বদলাবে (current passcode verify করে)
  changePasscode: async (userId: string, currentPasscode: string, newPasscode: string): Promise<{ success: boolean; error?: string }> => {
    if (USE_REAL_API) {
      return runGasMethod<{ success: boolean; error?: string }>("apiChangePasscode", userId, currentPasscode, newPasscode);
    } else {
      const db = getMockDB();
      const idx = db.users.findIndex(u => u.id === userId);
      if (idx === -1) return { success: false, error: "ব্যবহারকারী পাওয়া যায়নি।" };
      const stored = db.users[idx].passcode || cleanPhone(db.users[idx].phone || '');
      if (stored !== currentPasscode.trim()) return { success: false, error: "বর্তমান passcode ভুল।" };
      if (newPasscode.trim().length < 4) return { success: false, error: "নতুন passcode কমপক্ষে ৪ অক্ষরের হতে হবে।" };
      db.users[idx].passcode = newPasscode.trim();
      db.users[idx].updatedAt = new Date().toISOString();
      saveMockDB(db);
      return { success: true };
    }
  },

  // Forgot Passcode Step 1: ফোন নম্বর দিয়ে OTP পাঠানো
  sendOTP: async (phone: string): Promise<{ success: boolean; maskedEmail?: string; error?: string }> => {
    if (USE_REAL_API) {
      return runGasMethod<{ success: boolean; maskedEmail?: string; error?: string }>("apiSendOTP", phone);
    } else {
      // Local dev mock — just pretend it worked
      const db = getMockDB();
      const user = db.users.find(u => cleanPhone(u.phone || '') === cleanPhone(phone));
      if (!user) return { success: false, error: "এই ফোন নম্বরটি নিবন্ধিত নয়।" };
      if (!user.email) return { success: false, error: "এই অ্যাকাউন্টে কোনো email নেই।" };
      // Mock: store OTP "123456" in memory for testing
      (user as any).otpCode = "123456";
      (user as any).otpExpiry = new Date(Date.now() + 10 * 60 * 1000).toISOString();
      saveMockDB(db);
      const masked = user.email.slice(0, 2) + '***@' + user.email.split('@')[1];
      console.log("[DEV] Mock OTP sent: 123456 to", user.email);
      return { success: true, maskedEmail: masked };
    }
  },

  // Forgot Passcode Step 2: OTP verify করে নতুন passcode সেট করা
  verifyOTPAndReset: async (phone: string, otp: string, newPasscode: string): Promise<{ success: boolean; error?: string }> => {
    if (USE_REAL_API) {
      return runGasMethod<{ success: boolean; error?: string }>("apiVerifyOTPAndReset", phone, otp, newPasscode);
    } else {
      const db = getMockDB();
      const user = db.users.find(u => cleanPhone(u.phone || '') === cleanPhone(phone));
      if (!user) return { success: false, error: "ব্যাহারকারী পাওয়া যায়নি।" };
      if ((user as any).otpCode !== otp) return { success: false, error: "ভুল OTP! আবার চেষ্টা করুন।" };
      if (newPasscode.trim().length < 4) return { success: false, error: "নতুন passcode কমপক্ষে ৪ অক্ষরের হতে হবে।" };
      user.passcode = newPasscode.trim();
      (user as any).otpCode = "";
      saveMockDB(db);
      return { success: true };
    }
  },

  // Admin কোনো student-এর passcode force-reset করবে
  adminResetPasscode: async (studentId: string, newPasscode: string): Promise<{ success: boolean; error?: string }> => {
    if (USE_REAL_API) {
      return runGasMethod<{ success: boolean; error?: string }>("apiAdminResetPasscode", studentId, newPasscode);
    } else {
      const db = getMockDB();
      const idx = db.users.findIndex(u => u.id === studentId);
      if (idx === -1) return { success: false, error: "ব্যাহারকারী পাওয়া যায়নি।" };
      db.users[idx].passcode = newPasscode.trim();
      saveMockDB(db);
      return { success: true };
    }
  },

  // --- 📁 GOOGLE DRIVE FILE UPLOAD ---

  uploadFileToDrive: async (base64Data: string, fileName: string, folderId?: string): Promise<{ success: boolean; fileId: string; downloadUrl: string; viewUrl: string }> => {
    if (USE_REAL_API) {
      return runGasMethod<{ success: boolean; fileId: string; downloadUrl: string; viewUrl: string }>("apiUploadFileToDrive", base64Data, fileName, folderId);
    } else {
      console.log("Mocking file upload for:", fileName);
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve({
            success: true,
            fileId: "mock_drive_file_id_" + Math.random().toString(36).substr(2, 9),
            downloadUrl: "https://saikat-tuition.duckdns.org/sample.pdf",
            viewUrl: "https://saikat-tuition.duckdns.org/sample.pdf"
          });
        }, 1500);
      });
    }
  },

  verifyGatewayPayment: async (_paymentId: string, _month: string, _amount: number, _studentId: string): Promise<{ success: boolean; error?: string }> => {
    return { success: false, error: "Razorpay payment gateway has been disabled. Please pay via UPI or Cash." };
  },

  // --- 🚀 SWR & OUTBOX UTILITIES ---
  getLocalSwr,
  setLocalSwr,
  clearLocalSwr,
  clearAllLocalSwr,
  getExamOutbox,
  addExamToOutbox,
  removeExamFromOutbox,
  isExamPendingSync
};

