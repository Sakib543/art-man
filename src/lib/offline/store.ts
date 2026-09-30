import { isCatalogCopy, type CatalogCopy } from "./catalog";
import { isDayCopy, type DayCopy } from "./day";
import { deviceCodeOf, isDeviceTag, type DeviceTag } from "./device";
import {
  isOutboxEntry,
  isOutboxItem,
  type OutboxCloseEntry,
  type OutboxEntry,
  type OutboxFolderEntry,
  type OutboxItem,
} from "./outbox";

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

/**
 * What the server last told this browser, each record replaced whole in one
 * write so it is never half old, half new: the catalog copy under `CURRENT`
 * (P2.2b), and the open day's bills and entries under `DAY` (P2.2e) — in the
 * same store, so the day needed no new version of the database.
 */
const CATALOG = "catalog";
const CURRENT = "current";
const DAY = "day";

/**
 * Plain values under string keys (P2.2d): the last `T-` number given out on
 * each business day, as `temp:<date>`, and this computer's tag under `DEVICE`
 * (P7.10). Never cleared — not even at sign-out — so a number already on a
 * customer's slip is never given twice, and the computer keeps its code.
 */
const COUNTERS = "counters";
const DEVICE = "device";

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
 * This computer's tag (P7.10): made the first time it is asked for, in one
 * transaction — two tabs asking at once get the same one — and kept for good.
 * It goes with everything this computer keeps for the server (`queue`), and
 * its code goes on this computer's slips (`tempNo`).
 */
export async function thisDevice(): Promise<DeviceTag> {
  const db = await openDb();
  const tx = db.transaction(COUNTERS, "readwrite");
  const store = tx.objectStore(COUNTERS);
  let device: DeviceTag | null = null;
  const found = store.get(DEVICE);
  found.onsuccess = () => {
    if (isDeviceTag(found.result)) {
      device = found.result;
      return;
    }
    device = { id: crypto.randomUUID(), code: deviceCodeOf(crypto.getRandomValues(new Uint8Array(3))) };
    store.put(device, DEVICE);
  };
  await finished(tx);
  return device!;
}

/** Stamped with this computer's tag, unless it already carries one (a refused item sent again keeps its own). */
const stamped = async <T extends OutboxItem>(item: T): Promise<T> => (item.device ? item : { ...item, device: await thisDevice() });

/**
 * On sign-out: the copies belong to a signed-in session, and hold customers'
 * numbers and the day's money. With them goes working offline, until the next
 * sign-in fetches them again.
 */
export async function clearCatalog(): Promise<void> {
  const db = await openDb();
  const tx = db.transaction(CATALOG, "readwrite");
  tx.objectStore(CATALOG).delete(CURRENT);
  tx.objectStore(CATALOG).delete(DAY);
  await finished(tx);
  catalogListeners.forEach((listener) => listener());
  dayListeners.forEach((listener) => listener());
}

/**
 * The open day as this browser keeps it (P2.2e): with the moment it was
 * saved, by this device's clock.
 */
export type StoredDay = DayCopy & { savedAt: number };

export async function saveDay(copy: DayCopy): Promise<void> {
  const db = await openDb();
  const tx = db.transaction(CATALOG, "readwrite");
  tx.objectStore(CATALOG).put({ ...copy, savedAt: Date.now() } satisfies StoredDay, DAY);
  await finished(tx);
  dayListeners.forEach((listener) => listener());
}

/** The day, or null when there is none — or when what is stored is not a day copy any more. */
export async function readDay(): Promise<StoredDay | null> {
  const db = await openDb();
  const value = await resultOf(db.transaction(CATALOG, "readonly").objectStore(CATALOG).get(DAY));
  return isDayCopy(value) && typeof (value as Partial<StoredDay>).savedAt === "number" ? (value as StoredDay) : null;
}

/** This tab is told when a new day copy is saved (the offline screens). */
const dayListeners = new Set<() => void>();

export function onDaySaved(listener: () => void): () => void {
  dayListeners.add(listener);
  return () => {
    dayListeners.delete(listener);
  };
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
 * Queue something for the server. Anything already queued under the same id
 * is left as it is: queueing it again is not an error.
 */
async function queue(item: OutboxItem): Promise<void> {
  const kept = await stamped(item);
  const db = await openDb();
  const tx = db.transaction(OUTBOX, "readwrite");
  const request = tx.objectStore(OUTBOX).add(kept);
  request.onerror = (event) => {
    // The unique index refusing a second copy must not abort the transaction.
    if (request.error?.name === "ConstraintError") event.preventDefault();
  };
  await finished(tx);
  announce();
}

/** Queue a bill (P2.2c). */
export const queueBill = (entry: OutboxEntry): Promise<void> => queue(entry);

/** Queue a folder entry (P2.2e), in the same line as the bills: they are sent in the order they were made. */
export const queueEntry = (item: OutboxFolderEntry): Promise<void> => queue(item);

/**
 * Keep a day's close (P2.2f), behind the day's bills and entries: it is sent
 * only once none of them is left (`heldBack` in `./outbox.ts`).
 *
 * A close the server refused and the manager closed again keeps its id, so
 * the day is still closed once whichever of the two reaches the server — and
 * it takes the refused one's place in the line rather than joining it: one
 * close per day waits here, never two.
 */
export async function queueClose(item: OutboxCloseEntry): Promise<void> {
  const kept = await stamped(item);
  const db = await openDb();
  const tx = db.transaction(OUTBOX, "readwrite");
  const store = tx.objectStore(OUTBOX);
  const found = store.index(BY_CLIENT_ID).get(kept.clientId);
  found.onsuccess = () => {
    const seq = (found.result as { seq?: unknown } | undefined)?.seq;
    if (typeof seq === "number") store.put({ ...kept, seq });
    else store.add(kept);
  };
  await finished(tx);
  announce();
}

/** Everything in the outbox — bills, folder entries and closes — in the order it was queued. */
export async function readOutbox(): Promise<OutboxItem[]> {
  const db = await openDb();
  const rows = await resultOf(db.transaction(OUTBOX, "readonly").objectStore(OUTBOX).getAll());
  // A row this build cannot read (a newer build wrote it) is left in place,
  // untouched, for the build that can.
  return rows.filter(isOutboxItem);
}

/** One bill, by its id, or null when it is not in the outbox (sent, or removed) — or is not a bill. */
export async function readOutboxEntry(clientId: string): Promise<OutboxEntry | null> {
  const db = await openDb();
  const value = await resultOf(db.transaction(OUTBOX, "readonly").objectStore(OUTBOX).index(BY_CLIENT_ID).get(clientId));
  return isOutboxEntry(value) ? value : null;
}

/** It has reached the server, or a person removed it: it leaves the outbox. A bill, a folder entry or a close alike. */
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
 * Record the server's refusal of a bill, a folder entry or a close — or, with null,
 * put it back in line to be sent again ("Send again", once whatever was wrong
 * has been put right).
 */
export async function setRejected(clientId: string, rejected: OutboxItem["rejected"]): Promise<void> {
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
