import { z } from "zod";

/**
 * Which computer made something offline (backlog P7.10, QA-37).
 *
 * The app is built for one counter computer (spec §10.5), and nothing made
 * sure of it: two browsers offline both numbered their slips from `T-1`, and
 * the server took three `T-1` bills into one day without a word. Each browser
 * now has a tag of its own, made once and kept in its IndexedDB for good
 * (`thisDevice` in `./store.ts`): an id, which goes with everything it keeps
 * for the server, and a three-letter code, which goes on its slips (`T-KXR-5`)
 * and is how the Owner is told which computer is which.
 *
 * Pure.
 */

export interface DeviceTag {
  /** A random UUID, never shown. */
  id: string;
  /** Three capital letters, on this computer's slips and in the Owner's note. */
  code: string;
}

/**
 * Consonants only, and never I or O: no code spells a word or reads as a
 * digit. 20 letters, 8,000 codes; two computers share one about once in 8,000
 * — and if they do, their bills still show as repeated numbers on the day's
 * lists, and the Owner's note still counts two computers, by id.
 */
export const DEVICE_CODE_LETTERS = "BCDFGHJKLMNPQRSTVWXZ";

const CODE = /^[A-Z]{3}$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** A code from three random bytes (`crypto.getRandomValues`). */
export function deviceCodeOf(bytes: ArrayLike<number>): string {
  if (bytes.length < 3) throw new Error("A device code needs three random bytes");
  return Array.from({ length: 3 }, (_, i) => DEVICE_CODE_LETTERS[bytes[i] % DEVICE_CODE_LETTERS.length]).join("");
}

/** A light check of what comes out of IndexedDB or off the network. */
export function isDeviceTag(value: unknown): value is DeviceTag {
  if (typeof value !== "object" || value === null) return false;
  const { id, code } = value as Partial<DeviceTag>;
  return typeof id === "string" && UUID.test(id) && typeof code === "string" && CODE.test(code);
}

/**
 * The tag as the sync routes accept it. Optional wherever it is used: an item
 * kept before P7.10 has none, and is saved as it always was.
 */
export const deviceTagSchema = z.object({
  id: z.uuid(),
  code: z.string().regex(CODE, "A device code is three capital letters"),
});

/** What one computer sent the server, offline, for one business day. */
export interface OfflineDeviceWork {
  id: string;
  code: string;
  /** Bills, folder entries and closes the server saved. */
  saved: number;
  /** Ones it refused and has not saved since. */
  refused: number;
}

const counted = (work: OfflineDeviceWork) => {
  const parts = [`${work.saved} saved`];
  if (work.refused > 0) parts.push(`${work.refused} refused`);
  return `${work.code} (${parts.join(", ")})`;
};

const listed = (items: string[]) =>
  items.length > 1 ? `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}` : (items[0] ?? "");

/**
 * What the Owner is told when more than one computer worked offline on a day
 * (P7.10) — or null with one or none. By id, so two computers that happen to
 * share a code are still two. `day` is how the day is named: "this day" on
 * its own report, its date on the Overview.
 */
export function offlineDevicesNote(work: readonly OfflineDeviceWork[], day = "this day"): string | null {
  const devices = new Map(work.map((device) => [device.id, device]));
  if (devices.size < 2) return null;
  const count = devices.size === 2 ? "Two" : String(devices.size);
  return (
    `${count} computers worked offline on ${day}: ${listed([...devices.values()].map(counted))}. ` +
    "The app expects one counter computer. Each numbers its own slips, and a day closed on one did not " +
    "count what the other kept: check the day's bills and its count against the slips from all of them."
  );
}

/** One audit row of something made offline, as `db/queries/offline-work.ts` reads it. */
export interface OfflineWorkRow {
  deviceId: string;
  deviceCode: string;
  /** The item's id; the same item refused twice and then saved is one item. */
  clientId: string | null;
  /** Saved (true) or refused (false). */
  saved: boolean;
}

/** What each computer sent for one day, counted by item (P7.10). A refused item saved since counts as saved. */
export function offlineWorkOf(rows: readonly OfflineWorkRow[]): OfflineDeviceWork[] {
  const devices = new Map<string, { code: string; items: Map<string, boolean> }>();
  rows.forEach((row, index) => {
    const device = devices.get(row.deviceId) ?? { code: row.deviceCode, items: new Map<string, boolean>() };
    devices.set(row.deviceId, device);
    const key = row.clientId ?? `row-${index}`;
    device.items.set(key, (device.items.get(key) ?? false) || row.saved);
  });
  return [...devices].map(([id, { code, items }]) => {
    const saved = [...items.values()].filter(Boolean).length;
    return { id, code, saved, refused: items.size - saved };
  });
}

/**
 * Added to the refusal of a bill or an entry made offline for a day that has
 * been closed since (P7.10, QA-37): only another computer can have closed it —
 * this one's own close waits behind its own work — and that count did not
 * include this one. `dateLabel` is the day, as the screen writes dates.
 */
export function closedWhileOfflineText(dateLabel: string, what: "bill" | "entry"): string {
  return (
    ` ${dateLabel} was closed while this computer was offline, so its count did not include this ${what}. ` +
    `If its cash was in the drawer then, ask the Owner to reopen ${dateLabel} — possible while it is still ` +
    "the latest day — and send it again."
  );
}
