import { describe, expect, it } from "vitest";
import {
  cancelBlocker,
  describeAdjustment,
  directionQuestion,
  isStaffKind,
  KIND_CHOICES,
  khataCancelLabel,
  khataLabel,
  recordBlocker,
  recordedBy,
  signedAmount,
  type CancelContext,
  type RecordContext,
} from "./rules";

const ready: RecordContext = { corrects: "2026-09", correctsClosed: true, current: "2026-10", currentClosed: false };

describe("recordBlocker (backlog P3.4)", () => {
  it("lets the Owner correct a closed month from the open one", () => {
    expect(recordBlocker(ready)).toBeNull();
  });

  it("an open month is put right in place, not with an adjustment", () => {
    expect(recordBlocker({ ...ready, correctsClosed: false })).toContain("September 2026 is not closed");
  });

  it("needs an open month to count in: between a month's close and the next day, there is none", () => {
    // September closed on its last day, 30 Sep; 1 Oct not started yet.
    const blocker = recordBlocker({ ...ready, current: "2026-09", currentClosed: true });
    expect(blocker).toContain("Start it in Day close first");
  });

  it("needs a business day at all", () => {
    expect(recordBlocker({ ...ready, current: null })).toBe("No business day has been opened yet.");
  });

  it("never counts an adjustment in or before the month it corrects", () => {
    expect(recordBlocker({ ...ready, corrects: "2026-10" })).toBe("An adjustment can only correct an earlier month.");
  });

  it("may correct a month further back than the last one", () => {
    expect(recordBlocker({ ...ready, corrects: "2026-07" })).toBeNull();
  });
});

describe("cancelBlocker", () => {
  const open: CancelContext = { isCancellation: false, cancelled: false, countsIn: "2026-10", countsInClosed: false };

  it("an adjustment is cancelled while the month it counts in is open", () => {
    expect(cancelBlocker(open)).toBeNull();
  });

  it("once that month is closed, the adjustment is frozen with it", () => {
    expect(cancelBlocker({ ...open, countsInClosed: true })).toContain("October 2026 is closed");
  });

  it("only once", () => {
    expect(cancelBlocker({ ...open, cancelled: true })).toBe("This adjustment is already cancelled.");
  });

  it("a cancellation is never cancelled itself", () => {
    expect(cancelBlocker({ ...open, isCancellation: true })).toBe("A cancellation cannot be cancelled.");
  });
});

describe("signedAmount", () => {
  it("more than recorded is plus, less is minus", () => {
    expect(signedAmount("more", 500)).toBe(500);
    expect(signedAmount("less", 500)).toBe(-500);
  });
});

describe("khata lines", () => {
  it("name the month corrected and keep the Owner's words", () => {
    expect(khataLabel("2026-09", "  commission on bill #45 was too high ")).toBe(
      "Adjustment for September 2026: commission on bill #45 was too high",
    );
    expect(khataCancelLabel("2026-09", "wrong person")).toBe("Adjustment for September 2026 cancelled: wrong person");
  });
});

describe("describeAdjustment", () => {
  const none = { online: null, paidFrom: null, staffName: null };

  it("says what the closed month should have read", () => {
    expect(describeAdjustment({ ...none, kind: "sale", amount: -1000, online: true })).toBe(
      "Sales were Rs 1,000 less than recorded (online)",
    );
    expect(describeAdjustment({ ...none, kind: "sale", amount: 300, online: false })).toBe("Sales were Rs 300 more than recorded (cash)");
    expect(describeAdjustment({ ...none, kind: "expense", amount: 500, paidFrom: "owner" })).toBe(
      "Expenses were Rs 500 more than recorded (paid by the Owner)",
    );
    expect(describeAdjustment({ ...none, kind: "expense", amount: -200, paidFrom: "drawer" })).toBe("Expenses were Rs 200 less than recorded");
  });

  it("names the staff member", () => {
    expect(describeAdjustment({ ...none, kind: "staff_earning", amount: -100, staffName: "Arshad" })).toBe(
      "Arshad earned Rs 100 less than recorded",
    );
    expect(describeAdjustment({ ...none, kind: "staff_taken", amount: -2000, staffName: "Sherry" })).toBe(
      "Sherry took Rs 2,000 less than recorded",
    );
  });
});

describe("the form's words", () => {
  it("offers every kind once, each with a hint", () => {
    expect(KIND_CHOICES.map((choice) => choice.value)).toEqual(["sale", "expense", "staff_earning", "staff_taken"]);
    expect(KIND_CHOICES.every((choice) => choice.hint.length > 0)).toBe(true);
  });

  it("asks the more-or-less question about the right thing", () => {
    expect(directionQuestion("sale", null)).toBe("The sales were");
    expect(directionQuestion("staff_earning", "Arshad")).toBe("Arshad earned");
    expect(directionQuestion("staff_taken", null)).toBe("They took");
  });

  it("knows which kinds belong in the khata", () => {
    expect(KIND_CHOICES.map((choice) => choice.value).filter(isStaffKind)).toEqual(["staff_earning", "staff_taken"]);
  });
});

describe("recordedBy", () => {
  // The developer, under the name they have now and one they had before.
  const developers = new Set(["sakib", "developer"]);

  it("shows a developer's account as System, never as a person", () => {
    expect(recordedBy("sakib", developers)).toBe("System");
    expect(recordedBy("developer", developers)).toBe("System");
  });

  it("matches the name however it was written", () => {
    expect(recordedBy("Sakib", developers)).toBe("System");
  });

  it("leaves the Owner and the Manager as they are", () => {
    expect(recordedBy("owner", developers)).toBe("owner");
    expect(recordedBy("manager", new Set())).toBe("manager");
  });
});
