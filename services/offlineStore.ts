
const DB_NAME = 'vidyasetu_offline_db';
const DB_VERSION = 1;
const CACHE_STORE = 'api_cache';
const QUEUE_STORE = 'mutation_queue';

export interface QueueItem {
  id?: number;
  type: 'SUBMIT_ATTENDANCE' | 'SUBMIT_PERIOD' | 'APPLY_LEAVE' | 'APPLY_STUDENT_LEAVE' | 'VISITOR_ENTRY' | 'SUBMIT_HOMEWORK_STATUS';
  payload: any;
  timestamp: number;
}

const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = (event) => {
      console.error("IndexedDB error:", (event.target as any).error);
      reject('IndexedDB error');
    };

    request.onsuccess = (event) => {
      resolve((event.target as IDBOpenDBRequest).result);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(CACHE_STORE)) {
        db.createObjectStore(CACHE_STORE, { keyPath: 'key' });
      }
      if (!db.objectStoreNames.contains(QUEUE_STORE)) {
        db.createObjectStore(QUEUE_STORE, { keyPath: 'id', autoIncrement: true });
      }
    };
  });
};

export const offlineStore = {
  // --- CACHE METHODS (Read Strategy) ---
  async set<T>(key: string, data: T): Promise<void> {
    try {
      const db = await openDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(CACHE_STORE, 'readwrite');
        const store = tx.objectStore(CACHE_STORE);
        store.put({ key, data, timestamp: Date.now() });
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    } catch (e) {
      console.warn("Offline Store Set Error:", e);
    }
  },

  async get<T>(key: string): Promise<T | null> {
    try {
      const db = await openDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(CACHE_STORE, 'readonly');
        const store = tx.objectStore(CACHE_STORE);
        const request = store.get(key);
        request.onsuccess = () => resolve(request.result ? request.result.data : null);
        request.onerror = () => reject(request.error);
      });
    } catch (e) {
      return null;
    }
  },

  // --- QUEUE METHODS (Write Strategy) ---
  async addToQueue(type: QueueItem['type'], payload: any): Promise<void> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(QUEUE_STORE, 'readwrite');
      const store = tx.objectStore(QUEUE_STORE);
      store.add({ type, payload, timestamp: Date.now() });
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  },

  async getQueue(): Promise<QueueItem[]> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(QUEUE_STORE, 'readonly');
      const store = tx.objectStore(QUEUE_STORE);
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  },

  async removeFromQueue(id: number): Promise<void> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(QUEUE_STORE, 'readwrite');
      const store = tx.objectStore(QUEUE_STORE);
      store.delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  },
  
  async clearCache(): Promise<void> {
      const db = await openDB();
      return new Promise((resolve, reject) => {
          const tx = db.transaction(CACHE_STORE, 'readwrite');
          tx.objectStore(CACHE_STORE).clear();
          tx.oncomplete = () => resolve();
          tx.onerror = () => reject();
      });
  }
};
