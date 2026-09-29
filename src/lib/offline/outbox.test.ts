import { describe, expect, it } from "vitest";
import {
  CLOSE_SYNC_URL,
  closeOf,
  countOf,
  describeCounts,
  FOLDER_SYNC_URL,
  heldBack,
  isBillItem,
  isCloseItem,
  isFolderItem,
  isOutboxCloseEntry,
  isOutboxEntry,
  isOutboxFolderEntry,
  isOutboxItem,
  nextToSend,
  NO_COUNTS,
  outboxCounts,
  outboxTally,
  outcomeOf,
  SYNC_URL,
  syncOf,
  syncRequestOf,
  waitingBills,
  waitingFolderEntries,
  workOfDay,
  type OutboxCloseEntry,
  type OutboxEntry,
  type OutboxFolderEntry,
  type OutboxItem,
} from "./outbox";

const entry = (clientId: string, rejected: OutboxEntry["rejected"] = null): OutboxEntry => ({
  v: 1,
  clientId,
  businessDate: "2026-09-24",
  catalogVersion: "c598c580",
  madeAt: "2026-09-24T09:05:00.000Z",
  madeBy: "manager",
  bill: {
    lines: [
      { serviceId: "s-wash", staffId: "st-arshad", dealId: null, dealInstanceId: null, amount: null, description: null },
    ],
    customer: { phone: "00000315003" },
    cash: 300,
    online: 0,
    bookNo: null,
    discount: 0,
    discountReason: null,
  },
  preview: {
    customerName: "Test customer P3.15 C",
    lines: [{ name: "Hair wash", staffName: "Arshad", amount: 300 }],
    total: 300,
  },
  rejected,
});

const refused = { reason: "Payment is Rs 50 short of the total", at: "2026-09-24T10:00:00.000Z" };

describe("outcomeOf", () => {
  it("takes a 200 with a bill number as saved", () => {
    expect(outcomeOf({ status: 200 }, { billNo: 36, alreadySaved: false })).toEqual({
      kind: "saved",
      billNo: 36,
      alreadySaved: false,
    });
    expect(outcomeOf({ status: 200 }, { billNo: 36, alreadySaved: true })).toMatchObject({ alreadySaved: true });
  });

  it("takes a 422 with a reason as the server's refusal", () => {
    expect(outcomeOf({ status: 422 }, { reason: "Payment is Rs 50 short of the total" })).toEqual({
      kind: "rejected",
      reason: "Payment is Rs 50 short of the total",
    });
  });

  it("takes a 401, or the proxy's redirect to /login, as nobody signed in", () => {
    expect(outcomeOf({ status: 401 }, { error: "Not signed in" })).toEqual({ kind: "signed-out" });
    expect(outcomeOf({ status: 0, type: "opaqueredirect" }, null)).toEqual({ kind: "signed-out" });
  });

  it.each([
    ["a server error", 500, { error: "Something went wrong" }],
    ["maintenance", 503, { error: "The system is under maintenance" }],
    ["a cross-site refusal", 403, { error: "Cross-site request refused" }],
    ["a route that is not there (a deploy rolled back)", 404, null],
    ["a 200 that is not a bill (an HTML page)", 200, null],
    ["a 200 without a whole bill number", 200, { billNo: "36", alreadySaved: false }],
    ["a 422 with no reason", 422, { reason: "" }],
  ])("keeps the bill for later on %s", (_, status, body) => {
    expect(outcomeOf({ status }, body)).toEqual({ kind: "later" });
  });
});

describe("nextToSend", () => {
  it("sends the oldest bill first", () => {
    expect(nextToSend([entry("a"), entry("b")])?.clientId).toBe("a");
  });

  it("does not let a refused bill hold up the ones behind it", () => {
    expect(nextToSend([entry("a", refused), entry("b")])?.clientId).toBe("b");
  });

  it("has nothing to send when every bill waits for a person, or there are none", () => {
    expect(nextToSend([entry("a", refused)])).toBeNull();
    expect(nextToSend([])).toBeNull();
  });
});

describe("outboxCounts", () => {
  it("counts the waiting and the refused apart", () => {
    expect(outboxCounts([entry("a"), entry("b", refused), entry("c")])).toEqual({ waiting: 2, refused: 1 });
    expect(outboxCounts([])).toEqual({ waiting: 0, refused: 0 });
  });
});

describe("syncRequestOf", () => {
  it("sends the bill and what the server checks, not what only the browser needs", () => {
    const request = syncRequestOf(entry("a", refused));
    expect(Object.keys(request).sort()).toEqual(
      ["bill", "businessDate", "catalogVersion", "clientId", "madeAt", "madeBy", "v"].sort(),
    );
    expect(request).not.toHaveProperty("preview");
    expect(request).not.toHaveProperty("rejected");
  });
});

describe("isOutboxEntry", () => {
  it("accepts an entry, waiting or refused, and one the store numbered", () => {
    expect(isOutboxEntry(entry("a"))).toBe(true);
    expect(isOutboxEntry(entry("a", refused))).toBe(true);
    expect(isOutboxEntry({ ...entry("a"), seq: 7 })).toBe(true);
    expect(isOutboxEntry({ ...entry("a"), catalogVersion: null })).toBe(true);
  });

  it.each([
    ["nothing", null],
    ["a string", "entry"],
    ["another version", { ...entry("a"), v: 2 }],
    ["no id", { ...entry("a"), clientId: undefined }],
    ["no bill", { ...entry("a"), bill: null }],
    ["no preview", { ...entry("a"), preview: undefined }],
    ["a refusal with no reason", { ...entry("a"), rejected: { at: "2026-09-24T10:00:00.000Z" } }],
  ])("refuses %s", (_, value) => {
    expect(isOutboxEntry(value)).toBe(false);
  });
});

/* Folder entries, which share the outbox with the bills since P2.2e. */

const folder = (clientId: string, over: Partial<OutboxFolderEntry> = {}): OutboxFolderEntry => ({
  v: 1,
  type: "folder",
  clientId,
  businessDate: "2026-09-24",
  madeAt: "2026-09-24T09:10:00.000Z",
  madeBy: "manager",
  entry: { kind: "expense", amount: 150, description: "Tea", paidFrom: "drawer" },
  preview: { staffName: null },
  rejected: null,
  ...over,
});

describe("folder entries in the outbox (P2.2e)", () => {
  it("are told from bills, which carry no type", () => {
    expect(isFolderItem(folder("f"))).toBe(true);
    expect(isBillItem(folder("f"))).toBe(false);
    expect(isBillItem(entry("b"))).toBe(true);
    expect(isFolderItem(entry("b"))).toBe(false);
  });

  it("are read back from the store, and a bill is not mistaken for one or the other way round", () => {
    expect(isOutboxFolderEntry(folder("f"))).toBe(true);
    expect(isOutboxFolderEntry({ ...folder("f"), seq: 3 })).toBe(true);
    expect(isOutboxFolderEntry(folder("f", { entry: { kind: "staff_advance", amount: 500, staffId: "st" } }))).toBe(true);
    expect(isOutboxFolderEntry(entry("b"))).toBe(false);
    expect(isOutboxEntry(folder("f"))).toBe(false);
    expect(isOutboxItem(folder("f"))).toBe(true);
    expect(isOutboxItem(entry("b"))).toBe(true);
  });

  it.each([
    ["the Owner's own cash, which is never kept offline", { entry: { kind: "owner_took", amount: 100, description: "Bank" } }],
    ["an expense with no paid-from", { entry: { kind: "expense", amount: 100, description: "Tea" } }],
    ["an advance with no staff member", { entry: { kind: "staff_advance", amount: 100 } }],
    ["no preview", { preview: undefined }],
    ["another version", { v: 2 }],
    ["a refusal with no reason", { rejected: { at: "2026-09-24T10:00:00.000Z" } }],
  ])("refuses %s", (_, over) => {
    expect(isOutboxFolderEntry({ ...folder("f"), ...over })).toBe(false);
    expect(isOutboxItem({ ...folder("f"), ...over })).toBe(false);
  });

  it("go to their own route, with what the server checks", () => {
    const { url, body, kind } = syncOf(folder("f", { rejected: refused }));
    expect(url).toBe(FOLDER_SYNC_URL);
    expect(kind).toBe("folder");
    expect(Object.keys(body).sort()).toEqual(["businessDate", "clientId", "entry", "madeAt", "madeBy", "type", "v"]);
    expect(syncOf(entry("b"))).toMatchObject({ url: SYNC_URL, kind: "bill" });
  });

  it("are saved on a 200 that says whether they had arrived before — no number to give back", () => {
    expect(outcomeOf({ status: 200 }, { alreadySaved: false }, "folder")).toEqual({ kind: "saved", alreadySaved: false });
    expect(outcomeOf({ status: 200 }, { alreadySaved: true }, "folder")).toEqual({ kind: "saved", alreadySaved: true });
    expect(outcomeOf({ status: 422 }, { reason: "That staff member is not available" }, "folder")).toEqual({
      kind: "rejected",
      reason: "That staff member is not available",
    });
  });

  it("keep a bill's answer strict: a 200 without a bill number is not a saved bill", () => {
    expect(outcomeOf({ status: 200 }, { alreadySaved: false }, "bill")).toEqual({ kind: "later" });
    expect(outcomeOf({ status: 200 }, null, "folder")).toEqual({ kind: "later" });
  });

  it("wait in one line with the bills, in the order they were made", () => {
    const items: OutboxItem[] = [entry("b1", refused), folder("f1"), entry("b2")];
    expect(nextToSend(items)?.clientId).toBe("f1");
  });
});

describe("outboxTally and describeCounts", () => {
  const items: OutboxItem[] = [
    entry("b1"),
    entry("b2", refused),
    folder("f1"),
    folder("f2"),
    folder("f3", { rejected: refused }),
    close("c1"),
  ];

  it("counts waiting and refused, bills, entries and closes, apart", () => {
    expect(outboxTally(items)).toEqual({
      waiting: { bills: 1, entries: 2, closes: 1 },
      refused: { bills: 1, entries: 1, closes: 0 },
    });
    expect(outboxTally([])).toEqual({ waiting: NO_COUNTS, refused: NO_COUNTS });
    expect(countOf({ bills: 1, entries: 2, closes: 1 })).toBe(4);
  });

  it("says it in words", () => {
    expect(describeCounts({ bills: 1, entries: 0, closes: 0 })).toBe("1 bill");
    expect(describeCounts({ bills: 0, entries: 2, closes: 0 })).toBe("2 folder entries");
    expect(describeCounts({ bills: 2, entries: 1, closes: 0 })).toBe("2 bills and 1 folder entry");
    expect(describeCounts({ bills: 0, entries: 0, closes: 1 })).toBe("1 day close");
    expect(describeCounts({ bills: 3, entries: 1, closes: 1 })).toBe("3 bills, 1 folder entry and 1 day close");
    expect(describeCounts(NO_COUNTS)).toBe("");
  });
});

/* A day's close, which waits in the same outbox since P2.2f. */

function close(clientId: string, over: Partial<OutboxCloseEntry> = {}): OutboxCloseEntry {
  return {
    v: 1,
    type: "close",
    clientId,
    businessDate: "2026-09-24",
    madeAt: "2026-09-24T23:10:00.000Z",
    madeBy: "manager",
    close: { attendance: { "st-arshad": true }, payouts: { "st-arshad": 500 }, counted: 5000, reason: null, expected: 5000 },
    preview: {
      breakdown: [{ label: "Opening cash (from yesterday)", amount: 5000 }],
      onlineSales: 0,
      payouts: [{ name: "Arshad", amount: 500 }],
    },
    rejected: null,
    ...over,
  };
}

describe("a day's close in the outbox (P2.2f)", () => {
  it("is told from a bill and a folder entry", () => {
    expect(isCloseItem(close("c"))).toBe(true);
    expect(isBillItem(close("c"))).toBe(false);
    expect(isFolderItem(close("c"))).toBe(false);
    expect(isCloseItem(entry("b"))).toBe(false);
    expect(isCloseItem(folder("f"))).toBe(false);
  });

  it("is read back from the store, and never mistaken for a bill or an entry", () => {
    expect(isOutboxCloseEntry(close("c"))).toBe(true);
    expect(isOutboxCloseEntry({ ...close("c"), seq: 9 })).toBe(true);
    expect(isOutboxCloseEntry(close("c", { rejected: refused }))).toBe(true);
    expect(isOutboxItem(close("c"))).toBe(true);
    expect(isOutboxEntry(close("c"))).toBe(false);
    expect(isOutboxFolderEntry(close("c"))).toBe(false);
    expect(isOutboxCloseEntry(entry("b"))).toBe(false);
    expect(isOutboxCloseEntry(folder("f"))).toBe(false);
  });

  it.each([
    ["no count", { close: { ...close("c").close, counted: undefined } }],
    ["no expected cash", { close: { ...close("c").close, expected: "5000" } }],
    ["a payout that is not a number", { close: { ...close("c").close, payouts: { st: "500" } } }],
    ["attendance that is not yes or no", { close: { ...close("c").close, attendance: { st: 1 } } }],
    ["no preview", { preview: undefined }],
    ["another version", { v: 2 }],
    ["a refusal with no reason", { rejected: { at: "2026-09-24T10:00:00.000Z" } }],
  ])("refuses one with %s", (_, over) => {
    expect(isOutboxCloseEntry({ ...close("c"), ...over })).toBe(false);
  });

  it("goes to its own route, without what only this browser needs", () => {
    const { url, body, kind } = syncOf(close("c", { rejected: refused }));
    expect(url).toBe(CLOSE_SYNC_URL);
    expect(kind).toBe("close");
    expect(Object.keys(body).sort()).toEqual(["businessDate", "clientId", "close", "madeAt", "madeBy", "type", "v"]);
  });

  it("is saved on a 200 that carries the server's security code", () => {
    expect(outcomeOf({ status: 200 }, { securityCode: "A3F9-7C21-0B8E", alreadySaved: false }, "close")).toEqual({
      kind: "saved",
      securityCode: "A3F9-7C21-0B8E",
      alreadySaved: false,
    });
    expect(outcomeOf({ status: 200 }, { alreadySaved: true }, "close")).toEqual({ kind: "later" });
    expect(outcomeOf({ status: 200 }, { securityCode: "", alreadySaved: true }, "close")).toEqual({ kind: "later" });
    expect(outcomeOf({ status: 422 }, { reason: "The day's cash changed" }, "close")).toEqual({
      kind: "rejected",
      reason: "The day's cash changed",
    });
  });

  it("waits behind its day's bills and entries, waiting or refused, and only its own day's", () => {
    const day = close("c");
    expect(heldBack(day, [entry("b1"), day])).toBe(true);
    expect(heldBack(day, [folder("f1", { rejected: refused }), day])).toBe(true);
    expect(heldBack(day, [{ ...entry("b2"), businessDate: "2026-09-25" }, day])).toBe(false);
    expect(heldBack(day, [day])).toBe(false);
    // Bills are never held back by a close.
    expect(heldBack(entry("b1"), [day, entry("b1")])).toBe(false);
  });

  it("is sent once nothing of its day is left, and a refused bill of the day keeps it waiting", () => {
    expect(nextToSend([entry("b1"), close("c")])?.clientId).toBe("b1");
    expect(nextToSend([close("c"), entry("b1")])?.clientId).toBe("b1");
    expect(nextToSend([close("c")])?.clientId).toBe("c");
    expect(nextToSend([entry("b1", refused), close("c")])).toBeNull();
    // Another day's work goes ahead meanwhile.
    expect(nextToSend([entry("b1", refused), close("c"), { ...entry("b2"), businessDate: "2026-09-25" }])?.clientId).toBe(
      "b2",
    );
  });

  it("is found for its day, waiting or refused, with the work that holds it back", () => {
    const items: OutboxItem[] = [entry("b1"), folder("f1", { rejected: refused }), close("c", { rejected: refused })];
    expect(closeOf(items, "2026-09-24")?.clientId).toBe("c");
    expect(closeOf(items, "2026-09-25")).toBeNull();
    expect(workOfDay(items, "2026-09-24").map((item) => item.clientId)).toEqual(["b1", "f1"]);
    expect(workOfDay(items, "2026-09-25")).toEqual([]);
  });
});

describe("waitingBills and waitingFolderEntries", () => {
  const items: OutboxItem[] = [
    entry("b1"),
    entry("b2", refused),
    { ...entry("b3"), businessDate: "2026-09-25" },
    entry("b4"),
    folder("f1"),
    folder("f2", { rejected: refused }),
    folder("f3"),
  ];

  it("keep the day's waiting ones of their own kind, in order", () => {
    expect(waitingBills(items, "2026-09-24", new Set()).map((item) => item.clientId)).toEqual(["b1", "b4"]);
    expect(waitingFolderEntries(items, "2026-09-24", new Set()).map((item) => item.clientId)).toEqual(["f1", "f3"]);
  });

  it("leave out what the server already listed", () => {
    expect(waitingBills(items, "2026-09-24", new Set(["b1"])).map((item) => item.clientId)).toEqual(["b4"]);
    expect(waitingFolderEntries(items, "2026-09-24", new Set(["f3"])).map((item) => item.clientId)).toEqual(["f1"]);
  });
});
