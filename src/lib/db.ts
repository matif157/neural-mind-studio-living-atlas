import { openDB, type IDBPDatabase } from 'idb';

const DB_NAME = 'neural-mind-atlas';
const DB_VERSION = 1;
const STORE = 'kv';

let dbPromise: Promise<IDBPDatabase> | null = null;

function db(): Promise<IDBPDatabase> {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(database) {
        if (!database.objectStoreNames.contains(STORE)) database.createObjectStore(STORE);
      },
    }).catch((error) => {
      dbPromise = null;
      throw error;
    });
  }
  return dbPromise;
}

export async function readLocal<T>(key: string): Promise<T | null> {
  try {
    const value = await (await db()).get(STORE, key);
    return (value ?? null) as T | null;
  } catch {
    return null;
  }
}

export async function writeLocal(key: string, value: unknown): Promise<boolean> {
  try {
    await (await db()).put(STORE, value, key);
    return true;
  } catch {
    return false;
  }
}

export async function deleteLocal(key: string): Promise<void> {
  try { await (await db()).delete(STORE, key); } catch { /* storage unavailable */ }
}

export async function clearAllLocalData(): Promise<void> {
  try { await (await db()).clear(STORE); } catch { /* storage unavailable */ }
  try { localStorage.clear(); sessionStorage.clear(); } catch { /* storage unavailable */ }
}

export const STORAGE_KEYS = {
  graph: 'graph-v2',
  conversation: 'conversation-v2',
  settings: 'settings-v2',
  legacyGraph: 'neural-mind-studio-project-v1',
} as const;
