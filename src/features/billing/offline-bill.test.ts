import { describe, expect, it } from "vitest";
import { priceCart } from "@/lib/accounting";
import { isOutboxEntry, syncRequestOf } from "@/lib/offline/outbox";
import { offlineBill, type OfflineBillParts } from "./offline-bill";

const lines = [
  { serviceId: "hc", staffId: "arshad", dealId: null, dealInstanceId: null, amount: 450, description: null },
  { serviceId: null, staffId: "hamid", dealId: null, dealInstanceId: null, amount: 200, description: "Beard shape" },
];

const priced = priceCart(lines, {
  services: { hc: { id: "hc", name: "Haircut", price: 300, maxPrice: 500 } },
  deals: {},
  specialRates: {},
}, 50);

const parts: OfflineBillParts = {
  clientId: "33333333-3333-4333-8333-333333333333",
  businessDate: "2026-09-24",
  catalogVersion: "c598c580",
  madeBy: "manager",
  madeAt: "2026-09-29T09:05:00.000Z",
  bill: {
    lines,
    customer: { phone: "00000315003", name: "Test customer" },
    cash: 600,
    online: 0,
    bookNo: "T-4",
    discount: 50,
    discountReason: "Regular",
  },
  priced,
  staffNames: { arshad: "Arshad", hamid: "Hamid" },
  customerName: "Test customer",
};

describe("offlineBill", () => {
  const { entry, receipt } = offlineBill(parts);

  it("queues a whole entry, waiting to be sent", () => {
    expect(isOutboxEntry(entry)).toBe(true);
    expect(entry.rejected).toBeNull();
    expect(syncRequestOf(entry)).toEqual({
      v: 1,
      clientId: parts.clientId,
      businessDate: "2026-09-24",
      catalogVersion: "c598c580",
      madeAt: parts.madeAt,
      madeBy: "manager",
      bill: parts.bill,
    });
  });

  it("previews the lines with the names and amounts the browser priced them at", () => {
    expect(entry.preview).toEqual({
      customerName: "Test customer",
      lines: [
        { name: "Haircut", staffName: "Arshad", amount: priced.lines[0].amount },
        { name: priced.lines[1].name, staffName: "Hamid", amount: priced.lines[1].amount },
      ],
      total: 600,
    });
  });

  it("prints the slip number where the bill number would be, and the money as priced", () => {
    expect(receipt.slipNo).toBe("T-4");
    expect(receipt.bookNo).toBe("T-4");
    expect(receipt).not.toHaveProperty("billNo");
    expect(receipt).toMatchObject({ subtotal: 650, discount: 50, total: 600, cash: 600, online: 0 });
    expect(receipt.createdAt).toBe(parts.madeAt);
  });

  it("the slip and the queued bill add up to the same total", () => {
    const slipTotal = receipt.lines.reduce((sum, line) => sum + line.amount, 0);
    const queuedTotal = entry.preview.lines.reduce((sum, line) => sum + line.amount, 0);
    expect(slipTotal).toBe(receipt.total);
    expect(queuedTotal).toBe(entry.preview.total);
  });

  it("leaves a staff name blank rather than inventing one", () => {
    const { entry: unknownStaff } = offlineBill({ ...parts, staffNames: {} });
    expect(unknownStaff.preview.lines.map((line) => line.staffName)).toEqual(["", ""]);
  });
});
