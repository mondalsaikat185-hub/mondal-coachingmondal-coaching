// =========================================================================
// ⚡ IndexedDB Persistent Client Cache (Zero-Quota Limits, Ultra-Fast Async)
// Replaces 5MB-limited localStorage for heavy datasets (Exams, Library, Questions)
// =========================================================================

const DB_NAME = 'mc_storage_v2';
const DB_VERSION = 1;
const STORE_NAME = 'cache';

const memFallback = new Map<string, any>();

function getDb(): Promise<IDBDatabase | null> {
  if (typeof window === 'undefined' || !window.indexedDB) {
    return Promise.resolve(null);
  }
  return new Promise((resolve) => {
    try {
      const req = window.indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => {
        console.warn('[IDB] Failed to open IndexedDB, falling back to memory');
        resolve(null);
      };
    } catch (e) {
      resolve(null);
    }
  });
}

export async function idbGet<T = any>(key: string): Promise<T | null> {
  try {
    const db = await getDb();
    if (!db) return memFallback.has(key) ? (memFallback.get(key) as T) : null;

    return new Promise((resolve) => {
      try {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const req = store.get(key);
        req.onsuccess = () => resolve(req.result !== undefined ? (req.result as T) : null);
        req.onerror = () => resolve(memFallback.has(key) ? (memFallback.get(key) as T) : null);
      } catch (err) {
        resolve(memFallback.has(key) ? (memFallback.get(key) as T) : null);
      }
    });
  } catch (e) {
    return memFallback.has(key) ? (memFallback.get(key) as T) : null;
  }
}

export async function idbSet<T = any>(key: string, value: T): Promise<boolean> {
  memFallback.set(key, value);
  try {
    const db = await getDb();
    if (!db) return true;

    return new Promise((resolve) => {
      try {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const req = store.put(value, key);
        req.onsuccess = () => resolve(true);
        req.onerror = () => resolve(false);
      } catch (err) {
        resolve(false);
      }
    });
  } catch (e) {
    return false;
  }
}

export async function idbDel(key: string): Promise<boolean> {
  memFallback.delete(key);
  try {
    const db = await getDb();
    if (!db) return true;

    return new Promise((resolve) => {
      try {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const req = store.delete(key);
        req.onsuccess = () => resolve(true);
        req.onerror = () => resolve(false);
      } catch (err) {
        resolve(false);
      }
    });
  } catch (e) {
    return false;
  }
}

export async function idbClear(): Promise<boolean> {
  memFallback.clear();
  try {
    const db = await getDb();
    if (!db) return true;

    return new Promise((resolve) => {
      try {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const req = store.clear();
        req.onsuccess = () => resolve(true);
        req.onerror = () => resolve(false);
      } catch (err) {
        resolve(false);
      }
    });
  } catch (e) {
    return false;
  }
}
