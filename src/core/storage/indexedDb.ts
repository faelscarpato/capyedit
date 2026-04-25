import type { EditState } from '../../types/editor';

const DB_NAME = 'capy-retouching-projects';
const STORE = 'projects';

export type SavedProject = {
  id: string;
  name: string;
  edit: EditState;
  updatedAt: number;
};

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: 'id' });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveProject(project: SavedProject): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put(project);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

export async function loadProjects(): Promise<SavedProject[]> {
  const db = await openDb();
  const result = await new Promise<SavedProject[]>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly');
    const request = tx.objectStore(STORE).getAll();
    request.onsuccess = () => resolve(request.result as SavedProject[]);
    request.onerror = () => reject(request.error);
  });
  db.close();
  return result.sort((a, b) => b.updatedAt - a.updatedAt);
}
