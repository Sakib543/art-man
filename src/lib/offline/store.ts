import { isCatalogCopy, type CatalogCopy } from "./catalog";
import { isOutboxEntry, type OutboxEntry } from "./outbox";

/**
 * The browser's own database for working offline (backlog P2.2): IndexedDB,
 * which survives a reload and closing the browser — and, with persistent
 * storage (P2.2a), the browser's own clean-ups.
 *
 * Browser only. Nothing here runs until it is called, so importing the file
 * from server code is harmless; calling it there is not.
 *
 * One database, `art-man-offline`. A new object store comes with a bump of
 * `VERSION` and a line in `upgrade()`. **Never delete or rename a store**: the
 * outbox (P2.2c) may hold bills that have not reached the server yet.
 */

const NAME = "art-man-offline";
/** 1: the catalog copy (P2.2b). 2: the outbox (P2.2c). 3: counters, for `T-` numbers (P2.2d). */
const VERSION = 3;

/** One record, under `CURRENT`: the whole copy, replaced in one write so it is never half old, half new. */
const CATALOG = "catalog";
const CURRENT = "current";

/**
 * Plain numbers under string keys (P2.2d): today, the last `T-` number given
 * out on each business day, as `temp:<date>`. Never cleared — not even at
 * sign-out — so a number already on a customer's slip is never given twice.
 */
const COUNTERS = "counters";

/**
 * Bills waiting for the server (P2.2c). Keyed by a number the store counts up
 * by itself, so the order they were made in survives the device's clock being
 * changed. `clientId` is a unique index: one bill cannot be queued twice.
 */
const OUTBOX = "outbox";
const BY_CLIENT_ID = "clientId";

/** Only adds what is missing, so it serves every older version as well as a new database. */
function upgrade(db: IDBDatabase) {
  if (!db.objectStoreNames.contains(CATALOG)) db.createObjectStore(CATALOG);
  if (!db.objectStoreNames.contains(OUTBOX)) {
    db.createObjectStore(OUTBOX, { keyPath: "seq", autoIncrement: true }).createIndex(BY_CLIENT_ID, "clientId", {
      unique: true,
    });
  }
  if (!db.objectStoreNames.contains(COUNTERS)) db.createObjectStore(COUNTERS);
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

function resultOf<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * The copy as this browser keeps it: with the moment it was saved, by this
 * device's clock. That moment is the last time the server confirmed the
 * sign-in, and starts the 12 hours of offline billing (`./session.ts`).
 */
export type StoredCatalog = CatalogCopy & { savedAt: number };

export async function saveCatalog(copy: CatalogCopy): Promise<void> {
  const db = await openDb();
  const tx = db.transaction(CATALOG, "readwrite");
  tx.objectStore(CATALOG).put({ ...copy, savedAt: Date.now() } satisfies StoredCatalog, CURRENT);
  await finished(tx);
  catalogListeners.forEach((listener) => listener());
}

/** The copy, or null when there is none — or when what is stored is not a copy any more. */
export async function readCatalog(): Promise<StoredCatalog | null> {
  const db = await openDb();
  const value = await resultOf(db.transaction(CATALOG, "readonly").objectStore(CATALOG).get(CURRENT));
  return isCatalogCopy(value) && typeof (value as Partial<StoredCatalog>).savedAt === "number"
    ? (value as StoredCatalog)
    : null;
}

/** This tab is told when a new copy is saved (the offline banner, the offline screen). */
const catalogListeners = new Set<() => void>();

export function onCatalogSaved(listener: () => void): () => void {
  catalogListeners.add(listener);
  return () => {
    catalogListeners.delete(listener);
  };
}

/**
 * The next `T-` number of a business day (P2.2d), counted up in one
 * transaction: IndexedDB runs two tabs' read-and-write of the same store one
 * after the other, so two bills never get the same number.
 */
export async function nextTempNo(businessDate: string): Promise<number> {
  const db = await openDb();
  const tx = db.transaction(COUNTERS, "readwrite");
  const store = tx.objectStore(COUNTERS);
  const key = `temp:${businessDate}`;
  let next = 1;
  const last = store.get(key);
  last.onsuccess = () => {
    next = (typeof last.result === "number" ? last.result : 0) + 1;
    store.put(next, key);
  };
  await finished(tx);
  return next;
}

/**
 * On sign-out: the copy belongs to a signed-in session, and holds customers'
 * numbers. With it goes offline billing, until the next sign-in fetches one.
 */
export async function clearCatalog(): Promise<void> {
  const db = await openDb();
  const tx = db.transaction(CATALOG, "readwrite");
  tx.objectStore(CATALOG).delete(CURRENT);
  await finished(tx);
  catalogListeners.forEach((listener) => listener());
}

/*
 * The outbox (P2.2c). There is deliberately no way to empty it: sign-out
 * leaves it alone, and a bill leaves it only through `removeFromOutbox` —
 * called when the server has the bill, or after a person removed it with a
 * reason the server recorded.
 */

/**
 * Every change to the outbox is announced, to this tab and to the others, so
 * the sync and the screens that list it read it again. A BroadcastChannel never
 * delivers to the object that posted, so this tab's listeners are called
 * directly and one channel per tab does both jobs.
 */
const CHANNEL = "art-man-outbox";
const listeners = new Set<() => void>();
let channel: BroadcastChannel | null | undefined;

function theChannel(): BroadcastChannel | null {
  if (channel === undefined) {
    channel = typeof BroadcastChannel === "undefined" ? null : new BroadcastChannel(CHANNEL);
    if (channel) channel.onmessage = () => listeners.forEach((listener) => listener());
  }
  return channel;
}

function announce() {
  listeners.forEach((listener) => listener());
  theChannel()?.postMessage("changed");
}

/** Called whenever the outbox changes, in this tab or another. Returns the way to stop. */
export function onOutboxChange(listener: () => void): () => void {
  listeners.add(listener);
  theChannel();
  return () => {
    listeners.delete(listener);
  };
}

/**
 * Queue a bill for the server. A bill that is already queued — the same id —
 * is left as it is: queueing it again is not an error.
 */
export async function queueBill(entry: OutboxEntry): Promise<void> {
  const db = await openDb();
  const tx = db.transaction(OUTBOX, "readwrite");
  const request = tx.objectStore(OUTBOX).add(entry);
  request.onerror = (event) => {
    // The unique index refusing a second copy must not abort the transaction.
    if (request.error?.name === "ConstraintError") event.preventDefault();
  };
  await finished(tx);
  announce();
}

/** Every bill in the outbox, in the order it was queued. */
export async function readOutbox(): Promise<OutboxEntry[]> {
  const db = await openDb();
  const rows = await resultOf(db.transaction(OUTBOX, "readonly").objectStore(OUTBOX).getAll());
  // A row this build cannot read (a newer build wrote it) is left in place,
  // untouched, for the build that can.
  return rows.filter(isOutboxEntry);
}

/** One bill, by its id, or null when it is not in the outbox (sent, or removed). */
export async function readOutboxEntry(clientId: string): Promise<OutboxEntry | null> {
  const db = await openDb();
  const value = await resultOf(db.transaction(OUTBOX, "readonly").objectStore(OUTBOX).index(BY_CLIENT_ID).get(clientId));
  return isOutboxEntry(value) ? value : null;
}

/** The bill has reached the server, or a person removed it: it leaves the outbox. */
export async function removeFromOutbox(clientId: string): Promise<void> {
  const db = await openDb();
  const tx = db.transaction(OUTBOX, "readwrite");
  const store = tx.objectStore(OUTBOX);
  const key = store.index(BY_CLIENT_ID).getKey(clientId);
  key.onsuccess = () => {
    if (key.result !== undefined) store.delete(key.result);
  };
  await finished(tx);
  announce();
}

/**
 * Record the server's refusal of a bill — or, with null, put it back in line
 * to be sent again ("Send again", once whatever was wrong has been put right).
 */
export async function setRejected(clientId: string, rejected: OutboxEntry["rejected"]): Promise<void> {
  const db = await openDb();
  const tx = db.transaction(OUTBOX, "readwrite");
  const store = tx.objectStore(OUTBOX);
  const found = store.index(BY_CLIENT_ID).get(clientId);
  found.onsuccess = () => {
    if (found.result) store.put({ ...found.result, rejected });
  };
  await finished(tx);
  announce();
}
