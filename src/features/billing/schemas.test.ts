import { describe, expect, it } from "vitest";
import { createBillSchema, discardOfflineBillSchema, findSavedBillSchema, syncBillSchema } from "./schemas";

const bill = (bookNo?: unknown) => ({
  lines: [
    {
      serviceId: "11111111-1111-4111-8111-111111111111",
      staffId: "22222222-2222-4222-8222-222222222222",
      dealId: null,
      dealInstanceId: null,
    },
  ],
  customer: null,
  cash: 500,
  online: 0,
  ...(bookNo === undefined ? {} : { bookNo }),
});

/** The paper bill book number (spec 5.5, backlog P2.1). */
describe("createBillSchema bookNo", () => {
  it("is null on an ordinary bill, which is what most bills are", () => {
    const parsed = createBillSchema.parse(bill());
    expect(parsed.bookNo).toBeNull();
  });

  it("stores null rather than an empty string, so a blank field is not a book number", () => {
    // The billing screen always sends the input's value, so a bill rung up here arrives as "".
    expect(createBillSchema.parse(bill("")).bookNo).toBeNull();
    expect(createBillSchema.parse(bill("   ")).bookNo).toBeNull();
    expect(createBillSchema.parse(bill(null)).bookNo).toBeNull();
  });

  it("trims what was typed, so ' 45 ' and '45' are the same book number", () => {
    expect(createBillSchema.parse(bill(" 45 ")).bookNo).toBe("45");
  });

  it("keeps a number that is not just digits, because bill books are labelled by hand", () => {
    expect(createBillSchema.parse(bill("B-2/104")).bookNo).toBe("B-2/104");
  });

  it("refuses one long enough to be something else pasted in by mistake", () => {
    const result = createBillSchema.safeParse(bill("4".repeat(21)));
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toContain("at most 20");
  });
});

/** Money off the bill (backlog P3.10). */
describe("createBillSchema discount", () => {
  const withDiscount = (over: Record<string, unknown>) => ({ ...bill(), ...over });

  it("is 0 when the field was never touched", () => {
    expect(createBillSchema.parse(bill()).discount).toBe(0);
  });

  it("keeps the reason beside the amount", () => {
    const parsed = createBillSchema.parse(withDiscount({ discount: 200, discountReason: "Regular customer" }));
    expect(parsed).toMatchObject({ discount: 200, discountReason: "Regular customer" });
  });

  it("refuses a discount with no reason", () => {
    const result = createBillSchema.safeParse(withDiscount({ discount: 200 }));
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].message).toContain("why");
  });

  it("refuses a reason too short to mean anything", () => {
    expect(createBillSchema.safeParse(withDiscount({ discount: 200, discountReason: "ok" })).success).toBe(false);
  });

  it("does not ask for a reason when nothing was taken off", () => {
    expect(createBillSchema.safeParse(withDiscount({ discount: 0, discountReason: "" })).success).toBe(true);
  });

  it("refuses a negative or fractional amount before it ever reaches pricing", () => {
    expect(createBillSchema.safeParse(withDiscount({ discount: -100, discountReason: "no" })).success).toBe(false);
    expect(createBillSchema.safeParse(withDiscount({ discount: 10.5, discountReason: "half a rupee" })).success).toBe(false);
  });
});

/** An "Other" line: extra work at whatever the counter charges (P3.12). */
describe("createBillSchema Other line", () => {
  const other = (amount: unknown, description?: unknown) => ({
    ...bill(),
    lines: [
      {
        serviceId: null,
        staffId: "22222222-2222-4222-8222-222222222222",
        dealId: null,
        dealInstanceId: null,
        amount,
        ...(description === undefined ? {} : { description }),
      },
    ],
  });

  it("accepts an amount with no description — it is optional", () => {
    const parsed = createBillSchema.parse(other(300));
    expect(parsed.lines[0].amount).toBe(300);
    expect(parsed.lines[0].description).toBeNull();
  });

  it("keeps a description, trimmed, and treats a blank one as none", () => {
    expect(createBillSchema.parse(other(300, "  Beard shape  ")).lines[0].description).toBe("Beard shape");
    expect(createBillSchema.parse(other(300, "   ")).lines[0].description).toBeNull();
  });

  it("refuses an Other with no amount, or 0", () => {
    for (const amount of [null, undefined, 0]) {
      const result = createBillSchema.safeParse(other(amount));
      expect(result.success).toBe(false);
      expect(result.error?.issues[0].message).toBe("Enter the amount for Other");
    }
  });

  it("refuses a description too long for a receipt line", () => {
    expect(createBillSchema.safeParse(other(300, "x".repeat(61))).success).toBe(false);
  });

  it("still needs a staff member, like any line", () => {
    const noStaff = other(300);
    noStaff.lines[0].staffId = "";
    expect(createBillSchema.safeParse(noStaff).success).toBe(false);
  });
});

/** The id a bill is sent under, so a Save whose answer was lost can be asked about (P3.15). */
describe("createBillSchema clientId", () => {
  const id = "33333333-3333-4333-8333-333333333333";

  it("keeps the id the screen sent", () => {
    expect(createBillSchema.parse({ ...bill(), clientId: id }).clientId).toBe(id);
  });

  it("is null when a screen from before P3.15 sends none, so that screen still saves", () => {
    expect(createBillSchema.parse(bill()).clientId).toBeNull();
    expect(createBillSchema.parse({ ...bill(), clientId: null }).clientId).toBeNull();
  });

  it("refuses anything that is not a uuid, since the database column is one", () => {
    expect(createBillSchema.safeParse({ ...bill(), clientId: "bill-1" }).success).toBe(false);
  });
});

describe("findSavedBillSchema", () => {
  it("needs the id, and only a uuid will do", () => {
    expect(findSavedBillSchema.safeParse({ clientId: "33333333-3333-4333-8333-333333333333" }).success).toBe(true);
    expect(findSavedBillSchema.safeParse({}).success).toBe(false);
    expect(findSavedBillSchema.safeParse({ clientId: "32" }).success).toBe(false);
  });
});

/** A bill made offline, sent later by the sync (P2.2c). */
describe("syncBillSchema", () => {
  const synced = (change: Record<string, unknown> = {}) => ({
    v: 1,
    clientId: "33333333-3333-4333-8333-333333333333",
    businessDate: "2026-09-24",
    catalogVersion: "c598c580",
    madeAt: "2026-09-24T09:05:00.000Z",
    madeBy: "manager",
    bill: bill(),
    ...change,
  });

  it("takes a bill with what the browser knew when it made it", () => {
    const parsed = syncBillSchema.parse(synced());
    expect(parsed.businessDate).toBe("2026-09-24");
    expect(parsed.bill.cash).toBe(500);
  });

  it("takes a bill made before the counter had an offline copy", () => {
    expect(syncBillSchema.safeParse(synced({ catalogVersion: null })).success).toBe(true);
  });

  it("checks the bill itself exactly as a Save from the screen is checked", () => {
    const noLines = synced({ bill: { ...bill(), lines: [] } });
    const result = syncBillSchema.safeParse(noLines);
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe("Add a service or deal to start the bill");
  });

  it.each([
    ["no id", { clientId: undefined }],
    ["an id that is not a uuid", { clientId: "bill-1" }],
    ["a day that is not a date", { businessDate: "24 Sep" }],
    ["a time that is not a time", { madeAt: "yesterday" }],
  ])("refuses %s", (_, change) => {
    expect(syncBillSchema.safeParse(synced(change)).success).toBe(false);
  });

  it("says so when a bill was kept by a version of the app it no longer reads", () => {
    const result = syncBillSchema.safeParse(synced({ v: 2 }));
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toContain("version of the app");
  });
});

describe("discardOfflineBillSchema", () => {
  const discard = (change: Record<string, unknown> = {}) => ({
    clientId: "33333333-3333-4333-8333-333333333333",
    reason: "Customer came back and paid again",
    entry: { clientId: "33333333-3333-4333-8333-333333333333", total: 300 },
    ...change,
  });

  it("needs a reason, as a cancellation does", () => {
    expect(discardOfflineBillSchema.safeParse(discard()).success).toBe(true);
    const result = discardOfflineBillSchema.safeParse(discard({ reason: " x " }));
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe("Write why this bill is being removed");
  });

  it("records the bill in any shape, but not an endless one", () => {
    expect(discardOfflineBillSchema.safeParse(discard({ entry: { anything: [1, "two"] } })).success).toBe(true);
    expect(discardOfflineBillSchema.safeParse(discard({ entry: { note: "x".repeat(20_001) } })).success).toBe(false);
    expect(discardOfflineBillSchema.safeParse(discard({ entry: "a string" })).success).toBe(false);
  });
});
