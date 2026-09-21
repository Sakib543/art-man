import { describe, expect, it } from "vitest";
import type { DayBill } from "@/db/queries/day-bills";
import { summarizeBills } from "./summary";

const bill = (status: DayBill["status"], cash: number, online = 0): DayBill => ({
  id: `${status}-${cash}`,
  billNo: 1,
  createdAt: "2026-09-21T08:00:00.000Z",
  customerName: null,
  total: cash + online,
  cash,
  online,
  status,
  cancelReason: null,
  reversesBillNo: null,
  lines: [],
});

describe("summarizeBills", () => {
  it("counts paid and cancelled bills separately, and ignores reversals in the counts", () => {
    const s = summarizeBills([bill("active", 800), bill("cancelled", 500), bill("reversal", -500), bill("active", 4000, 1000)]);
    expect(s).toMatchObject({ paidBills: 2, cancelledBills: 1 });
  });

  it("totals are net: a cancelled bill and its reversal cancel out", () => {
    const s = summarizeBills([bill("active", 800), bill("cancelled", 500), bill("reversal", -500), bill("active", 4000, 1000)]);
    expect(s).toMatchObject({ cash: 4800, online: 1000, total: 5800 });
  });

  it("an empty day is all zeros", () => {
    expect(summarizeBills([])).toEqual({ total: 0, cash: 0, online: 0, paidBills: 0, cancelledBills: 0 });
  });
});
