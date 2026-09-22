import { describe, expect, it } from "vitest";
import { lastVisitOf, visitLabel } from "./last-visit";
import type { LastVisitLine } from "./types";

const line = (name: string, amount: number, staffName: string): LastVisitLine => ({ name, amount, staffName });

describe("lastVisitOf", () => {
  it("totals the lines it was given", () => {
    const visit = lastVisitOf({ billNo: 12, businessDate: "2026-09-21" }, [
      line("Haircut", 800, "Sherry"),
      line("Hair wash", 300, "Arshad"),
    ]);

    expect(visit).toEqual({
      billNo: 12,
      businessDate: "2026-09-21",
      total: 1100,
      lines: [line("Haircut", 800, "Sherry"), line("Hair wash", 300, "Arshad")],
    });
  });

  it("keeps the lines in the order they arrived", () => {
    const visit = lastVisitOf({ billNo: 3, businessDate: "2026-09-20" }, [
      line("Beard trim", 200, "Arshad"),
      line("Haircut", 800, "Sherry"),
    ]);

    expect(visit?.lines.map((l) => l.name)).toEqual(["Beard trim", "Haircut"]);
  });

  it("names whoever performed each service", () => {
    const visit = lastVisitOf({ billNo: 7, businessDate: "2026-09-19" }, [line("Haircut", 800, "Sherry")]);

    expect(visit?.lines[0].staffName).toBe("Sherry");
  });

  it("is null when there is no bill that counts", () => {
    // A brand new customer, or one whose only bill was cancelled.
    expect(lastVisitOf(null, [])).toBeNull();
  });

  it("totals a deal's zero-priced lines without breaking", () => {
    // A deal charges on one line and leaves its other services at 0.
    const visit = lastVisitOf({ billNo: 9, businessDate: "2026-09-18" }, [
      line("Facial (deal)", 1500, "Sherry"),
      line("Haircut (deal)", 0, "Sherry"),
    ]);

    expect(visit?.total).toBe(1500);
    expect(visit?.lines).toHaveLength(2);
  });
});

describe("visitLabel", () => {
  it("says how many visits", () => {
    expect(visitLabel(3)).toBe("3 visits");
  });

  it("does not say '1 visits'", () => {
    expect(visitLabel(1)).toBe("1 visit");
  });

  it("covers a customer whose only bill was cancelled", () => {
    // The count excludes cancelled bills, so a saved customer can have none.
    expect(visitLabel(0)).toBe("No visits yet");
  });
});
