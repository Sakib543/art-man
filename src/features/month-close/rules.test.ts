import { describe, expect, it } from "vitest";
import { closeBlockers, type CloseCheckInput } from "./rules";

const ready: CloseCheckInput = {
  month: "2026-09",
  alreadyClosed: false,
  closedDays: 26,
  openDays: [],
  earlierOpenMonths: [],
  sharesValid: true,
};

describe("closeBlockers", () => {
  it("has nothing in the way when every day is closed", () => {
    expect(closeBlockers(ready)).toEqual([]);
  });

  it("refuses a month that is already closed", () => {
    expect(closeBlockers({ ...ready, alreadyClosed: true })).toEqual(["September 2026 is already closed."]);
  });

  it("waits for the open day to be closed", () => {
    const blockers = closeBlockers({ ...ready, openDays: ["2026-09-27"] });
    expect(blockers).toHaveLength(1);
    expect(blockers[0]).toContain("27 Sep");
  });

  it("asks for earlier months first, oldest first", () => {
    expect(closeBlockers({ ...ready, earlierOpenMonths: ["2026-07", "2026-08"] })[0]).toBe("Close July 2026 first.");
  });

  it("refuses a month with no closed days", () => {
    expect(closeBlockers({ ...ready, closedDays: 0 })).toEqual(["This month has no closed days yet."]);
  });

  it("wants the partners' shares to add up to 100%", () => {
    expect(closeBlockers({ ...ready, sharesValid: false })[0]).toContain("100%");
  });

  it("lists every problem at once", () => {
    const blockers = closeBlockers({ ...ready, openDays: ["2026-09-27"], earlierOpenMonths: ["2026-08"], sharesValid: false });
    expect(blockers).toHaveLength(3);
  });
});
