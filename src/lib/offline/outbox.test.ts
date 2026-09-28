import { describe, expect, it } from "vitest";
import { isOutboxEntry, nextToSend, outboxCounts, outcomeOf, syncRequestOf, type OutboxEntry } from "./outbox";

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
