import { describe, expect, it } from "vitest";
import type { OutboxBill, OutboxEntry } from "@/lib/offline/outbox";
import { draftOfEntry } from "./outbox-draft";

const entry = (bill: Partial<OutboxBill> = {}): OutboxEntry => ({
  v: 1,
  clientId: "33333333-3333-4333-8333-333333333333",
  businessDate: "2026-09-24",
  catalogVersion: "c598c580",
  madeAt: "2026-09-24T09:05:00.000Z",
  madeBy: "manager",
  bill: {
    lines: [
      { serviceId: "hc", staffId: "arshad", dealId: null, dealInstanceId: null, amount: 450, description: null },
      { serviceId: "hc", staffId: "hamid", dealId: "vip", dealInstanceId: "d1", amount: null, description: null },
      { serviceId: "bd", staffId: "hamid", dealId: "vip", dealInstanceId: "d1", amount: null, description: null },
      { serviceId: null, staffId: "arshad", dealId: null, dealInstanceId: null, amount: 200, description: "Beard shape" },
    ],
    customer: { phone: "00000315003" },
    cash: 1500,
    online: 0,
    bookNo: null,
    discount: 0,
    discountReason: null,
    ...bill,
  },
  preview: { customerName: null, lines: [], total: 1500 },
  rejected: { reason: "Payment is Rs 50 short of the total", at: "2026-09-24T10:00:00.000Z" },
});

describe("draftOfEntry", () => {
  it("puts every line back as it was sent: a range's amount, a deal's instance, an Other's price and note", () => {
    const { lines } = draftOfEntry(entry());
    const withoutKeys = lines.map(({ serviceId, staffId, dealId, dealInstanceId, amount, description }) => ({
      serviceId,
      staffId,
      dealId,
      dealInstanceId,
      amount,
      description,
    }));
    expect(withoutKeys).toEqual([
      { serviceId: "hc", staffId: "arshad", dealId: null, dealInstanceId: null, amount: 450, description: "" },
      { serviceId: "hc", staffId: "hamid", dealId: "vip", dealInstanceId: "d1", amount: null, description: "" },
      { serviceId: "bd", staffId: "hamid", dealId: "vip", dealInstanceId: "d1", amount: null, description: "" },
      { serviceId: null, staffId: "arshad", dealId: null, dealInstanceId: null, amount: 200, description: "Beard shape" },
    ]);
  });

  it("gives every line a key of its own, even two lines of one service", () => {
    const keys = draftOfEntry(entry()).lines.map((line) => line.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("opens on the way it was paid, and types the amounts only for a split", () => {
    expect(draftOfEntry(entry())).toMatchObject({ payMode: "cash", typedCash: "", typedOnline: "" });
    expect(draftOfEntry(entry({ cash: 0, online: 1500 }))).toMatchObject({ payMode: "online" });
    expect(draftOfEntry(entry({ cash: 1000, online: 500 }))).toMatchObject({
      payMode: "split",
      typedCash: "1000",
      typedOnline: "500",
    });
  });

  it("keeps the discount with its reason, and the paper book number", () => {
    expect(draftOfEntry(entry({ discount: 50, discountReason: "Regular", bookNo: "B-2/45" }))).toMatchObject({
      discountText: "50",
      discountReason: "Regular",
      bookNo: "B-2/45",
    });
    expect(draftOfEntry(entry())).toMatchObject({ discountText: "", discountReason: "", bookNo: "" });
  });
});
