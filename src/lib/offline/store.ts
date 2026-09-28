import { isCatalogCopy, type CatalogCopy } from "./catalog";

/**
 * The browser's own database for working offline (backlog P2.2): IndexedDB,
 * which survives a reload and closing the browser — and, with persistent
 * storage (P2.2a), the browser's own clean-ups.
 *
 * Browser only. Nothing here runs until it is called, so importing the file
 * from server code is harmless; calling it there is not.
 *
 * One database, `art-man-offline`. A new object store comes with a bump of
 * `VERSION` and a line in `upgrade()`. **Never delete or rename a store**: from
 * P2.2c a counter may hold bills in one that have not reached the server yet.
 */

const NAME = "art-man-offline";
const VERSION = 1;

/** One record, under `CURRENT`: the whole copy, replaced in one write so it is never half old, half new. */
const CATALOG = "catalog";
const CURRENT = "current";

function upgrade(db: IDBDatabase) {
  if (!db.objectStoreNames.contains(CATALOG)) db.createObjectStore(CATALOG);
}

let opening: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  if (typeof indexedDB === "undefined") return Promise.reject(new Error("IndexedDB is not available here"));

  opening ??= new Promise((resolve, reject) => {
    const request = indexedDB.open(NAME, VERSION);
    request.onupgradeneeded = () => upgrade(request.result);
    request.onsuccess = () => {
      const db = request.result;
      // A newer build open in another tab needs to upgrade: step aside for it
      // rather than block it. The next call here opens the new version.
      db.onversionchange = () => {
        db.close();
        opening = null;
      };
      resolve(db);
    };
    request.onerror = () => {
      opening = null;
      reject(request.error);
    };
  });
  return opening;
}

/** Resolves when the transaction has been written, not merely queued. */
function finished(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error ?? new Error("IndexedDB transaction aborted"));
  });
}

export async function saveCatalog(copy: CatalogCopy): Promise<void> {
  const db = await openDb();
  const tx = db.transaction(CATALOG, "readwrite");
  tx.objectStore(CATALOG).put(copy, CURRENT);
  await finished(tx);
}

/** The copy, or null when there is none — or when what is stored is not a copy any more. */
export async function readCatalog(): Promise<CatalogCopy | null> {
  const db = await openDb();
  const request = db.transaction(CATALOG, "readonly").objectStore(CATALOG).get(CURRENT);
  const value = await new Promise<unknown>((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  return isCatalogCopy(value) ? value : null;
}

/** On sign-out: the copy belongs to a signed-in session, and holds customers' numbers. */
export async function clearCatalog(): Promise<void> {
  const db = await openDb();
  const tx = db.transaction(CATALOG, "readwrite");
  tx.objectStore(CATALOG).delete(CURRENT);
  await finished(tx);
}
