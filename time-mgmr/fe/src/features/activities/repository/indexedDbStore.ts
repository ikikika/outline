/**
 * Thin IndexedDB promise wrapper for Tempo local-first storage.
 */

const DB_NAME = 'tempo-db';
const DB_VERSION = 2;

export const STORE_ACTIVITY_CATALOG = 'activityCatalog';
export const STORE_TASKS = 'tasks';
export const STORE_TIME_ENTRIES = 'timeEntries';
export const STORE_TEMPLATES = 'templates';

/** @deprecated legacy store name from v1 */
export const STORE_ACTIVITIES = 'activities';

type StoreName =
  | typeof STORE_ACTIVITY_CATALOG
  | typeof STORE_TASKS
  | typeof STORE_TIME_ENTRIES
  | typeof STORE_TEMPLATES
  | typeof STORE_ACTIVITIES;

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;

      if (!db.objectStoreNames.contains(STORE_ACTIVITY_CATALOG)) {
        db.createObjectStore(STORE_ACTIVITY_CATALOG, { keyPath: 'id' });
      }

      if (!db.objectStoreNames.contains(STORE_TASKS)) {
        const store = db.createObjectStore(STORE_TASKS, { keyPath: 'id' });
        store.createIndex('date', 'date', { unique: false });
        store.createIndex('activityId', 'activityId', { unique: false });
      }

      if (!db.objectStoreNames.contains(STORE_TIME_ENTRIES)) {
        const store = db.createObjectStore(STORE_TIME_ENTRIES, { keyPath: 'id' });
        store.createIndex('taskId', 'taskId', { unique: false });
        store.createIndex('startAt', 'startAt', { unique: false });
      } else if (request.transaction) {
        // v1 → v2: ensure taskId index exists when upgrading
        const store = request.transaction.objectStore(STORE_TIME_ENTRIES);
        if (!store.indexNames.contains('taskId')) {
          store.createIndex('taskId', 'taskId', { unique: false });
        }
      }

      if (!db.objectStoreNames.contains(STORE_TEMPLATES)) {
        db.createObjectStore(STORE_TEMPLATES, { keyPath: 'id' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('Failed to open IndexedDB'));
  });
}

function txDone(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error('IndexedDB transaction failed'));
    tx.onabort = () => reject(tx.error ?? new Error('IndexedDB transaction aborted'));
  });
}

export async function idbGetAll<T>(storeName: StoreName): Promise<T[]> {
  const db = await openDb();
  if (!db.objectStoreNames.contains(storeName)) return [];
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const request = tx.objectStore(storeName).getAll();
    request.onsuccess = () => resolve(request.result as T[]);
    request.onerror = () => reject(request.error);
  });
}

export async function idbGetById<T>(storeName: StoreName, id: string): Promise<T | undefined> {
  const db = await openDb();
  if (!db.objectStoreNames.contains(storeName)) return undefined;
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const request = tx.objectStore(storeName).get(id);
    request.onsuccess = () => resolve(request.result as T | undefined);
    request.onerror = () => reject(request.error);
  });
}

export async function idbPut<T>(storeName: StoreName, value: T): Promise<void> {
  const db = await openDb();
  const tx = db.transaction(storeName, 'readwrite');
  tx.objectStore(storeName).put(value);
  await txDone(tx);
}

export async function idbDelete(storeName: StoreName, id: string): Promise<void> {
  const db = await openDb();
  if (!db.objectStoreNames.contains(storeName)) return;
  const tx = db.transaction(storeName, 'readwrite');
  tx.objectStore(storeName).delete(id);
  await txDone(tx);
}

export async function idbGetByIndex<T>(
  storeName: StoreName,
  indexName: string,
  value: IDBValidKey
): Promise<T[]> {
  const db = await openDb();
  if (!db.objectStoreNames.contains(storeName)) return [];
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const index = tx.objectStore(storeName).index(indexName);
    const request = index.getAll(value);
    request.onsuccess = () => resolve(request.result as T[]);
    request.onerror = () => reject(request.error);
  });
}

export async function idbPutMany<T>(storeName: StoreName, values: T[]): Promise<void> {
  if (values.length === 0) return;
  const db = await openDb();
  const tx = db.transaction(storeName, 'readwrite');
  const store = tx.objectStore(storeName);
  for (const value of values) {
    store.put(value);
  }
  await txDone(tx);
}

export async function idbClearStore(storeName: StoreName): Promise<void> {
  const db = await openDb();
  if (!db.objectStoreNames.contains(storeName)) return;
  const tx = db.transaction(storeName, 'readwrite');
  tx.objectStore(storeName).clear();
  await txDone(tx);
}
