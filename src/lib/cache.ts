import { getDocs, getDoc, Query, DocumentReference } from 'firebase/firestore';

const globalCache = new Map<string, { snap: any, time: number }>();
const CACHE_TTL = 15 * 60 * 1000; // 15 minutes

export async function cachedGetDocs(q: Query, cacheKey: string) {
    const cached = globalCache.get(cacheKey);
    if (cached && Date.now() - cached.time < CACHE_TTL) {
        return cached.snap;
    }
    const snap = await getDocs(q);
    globalCache.set(cacheKey, { snap, time: Date.now() });
    return snap;
}

// Single-document read with same 15-min in-memory TTL
export async function cachedGetDoc(docRef: DocumentReference, cacheKey: string) {
    const cached = globalCache.get(cacheKey);
    if (cached && Date.now() - cached.time < CACHE_TTL) {
        return cached.snap;
    }
    const snap = await getDoc(docRef);
    globalCache.set(cacheKey, { snap, time: Date.now() });
    return snap;
}

export function clearCache(key?: string) {
    if (key) globalCache.delete(key);
    else globalCache.clear();
}

// =========================================================================
// 🚀 STALE-WHILE-REVALIDATE (SWR) ENGINE (LocalStorage with userId isolation)
// =========================================================================

export interface SwrEntry<T> {
  data: T;
  timestamp: number;
}

export function getLocalSwr<T>(userId: string, resource: string): T | null {
  if (!userId) return null;
  try {
    const raw = localStorage.getItem(`mc_swr_${userId}_${resource}`);
    if (!raw) return null;
    const entry: SwrEntry<T> = JSON.parse(raw);
    return entry.data;
  } catch (e) {
    return null;
  }
}

export function setLocalSwr<T>(userId: string, resource: string, data: T): void {
  if (!userId) return;
  try {
    const entry: SwrEntry<T> = { data, timestamp: Date.now() };
    localStorage.setItem(`mc_swr_${userId}_${resource}`, JSON.stringify(entry));
  } catch (e) {
    console.warn(`[SWR] Failed to write cache for ${resource}:`, e);
  }
}

export function clearLocalSwr(userId: string, resource?: string): void {
  try {
    if (resource) {
      localStorage.removeItem(`mc_swr_${userId}_${resource}`);
    } else {
      const prefix = `mc_swr_${userId}_`;
      const toRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith(prefix)) toRemove.push(k);
      }
      toRemove.forEach(k => localStorage.removeItem(k));
    }
  } catch (e) {}
}

export function clearAllLocalSwr(): void {
  try {
    const toRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith('mc_swr_')) toRemove.push(k);
    }
    toRemove.forEach(k => localStorage.removeItem(k));
  } catch (e) {}
}

// =========================================================================
// 📦 EXAM SUBMISSION OUTBOX (Offline resilience & Idempotent background sync)
// =========================================================================

export interface ExamOutboxItem {
  id: string; // client generated UUID (resultId)
  examId: string;
  studentId: string;
  studentName: string;
  studentPhone: string;
  studentBatchId: string;
  score: number;
  totalQuestions: number;
  correctAnswers: number;
  wrongAnswers: number;
  skippedAnswers: number;
  answersMap: string;
  answersJSON: string;
  submittedAt: string;
  retryCount?: number;
  lastAttempt?: number;
}

export function getExamOutbox(userId: string): ExamOutboxItem[] {
  if (!userId) return [];
  try {
    const raw = localStorage.getItem(`mc_exam_outbox_${userId}`);
    if (!raw) return [];
    const list = JSON.parse(raw);
    return Array.isArray(list) ? list : [];
  } catch (e) {
    return [];
  }
}

export function addExamToOutbox(userId: string, item: ExamOutboxItem): void {
  if (!userId || !item) return;
  try {
    const outbox = getExamOutbox(userId);
    if (!outbox.some(i => i.id === item.id)) {
      outbox.push(item);
      localStorage.setItem(`mc_exam_outbox_${userId}`, JSON.stringify(outbox));
    }
  } catch (e) {
    console.warn('[Outbox] Failed to add item to outbox:', e);
  }
}

export function removeExamFromOutbox(userId: string, resultId: string): void {
  if (!userId || !resultId) return;
  try {
    const outbox = getExamOutbox(userId).filter(i => i.id !== resultId);
    localStorage.setItem(`mc_exam_outbox_${userId}`, JSON.stringify(outbox));
  } catch (e) {}
}

export function isExamPendingSync(userId: string, examId: string): boolean {
  if (!userId || !examId) return false;
  const outbox = getExamOutbox(userId);
  return outbox.some(i => i.examId === examId);
}
