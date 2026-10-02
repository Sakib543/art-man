import { describe, expect, it } from "vitest";
import { cancelLineSchema, deductionSchema, overtimeSchema } from "./schemas";

const staffId = "7f2c3a1e-4b5d-4e6f-8a9b-0c1d2e3f4a5b";
const problem = (schema: { safeParse: (input: unknown) => { success: boolean; error?: { issues: { message: string }[] } } }, input: unknown) => {
  const parsed = schema.safeParse(input);
  return parsed.success ? null : parsed.error?.issues[0]?.message;
};

describe("overtimeSchema (P3.18)", () => {
  const overtime = { staffId, hours: 3, reason: "Wedding party", clientId: null };

  it("takes hours, never rupees", () => {
    expect(problem(overtimeSchema, overtime)).toBeNull();
    expect(problem(overtimeSchema, { ...overtime, hours: 1.5 })).toBeNull();
    const parsed = overtimeSchema.parse({ ...overtime, amount: 99999 });
    expect(parsed).not.toHaveProperty("amount");
  });

  it("refuses no hours, too many, and a third decimal", () => {
    expect(problem(overtimeSchema, { ...overtime, hours: null })).toBe("Enter the hours");
    expect(problem(overtimeSchema, { ...overtime, hours: 0 })).toBe("Enter the hours");
    expect(problem(overtimeSchema, { ...overtime, hours: 25 })).toBe("No more than 24 hours at once");
    expect(problem(overtimeSchema, { ...overtime, hours: 1.333 })).toBe("Use at most two decimals, e.g. 1.5 or 2.25");
  });

  it("wants a reason", () => {
    expect(problem(overtimeSchema, { ...overtime, reason: " " })).toBe("Say what the overtime was for");
  });
});

describe("deductionSchema (P3.18)", () => {
  const deduction = { staffId, amount: 300, reason: "Came late", clientId: null };

  it("takes whole rupees and a reason", () => {
    expect(problem(deductionSchema, deduction)).toBeNull();
    expect(problem(deductionSchema, { ...deduction, amount: 0 })).toBe("Enter an amount");
    expect(problem(deductionSchema, { ...deduction, amount: 300.5 })).toBe("Use whole rupees");
    expect(problem(deductionSchema, { ...deduction, amount: -300 })).toBe("Enter an amount");
    expect(problem(deductionSchema, { ...deduction, reason: "" })).toBe("Say what the deduction is for");
  });
});

describe("cancelLineSchema (P3.18)", () => {
  it("wants the line and a reason", () => {
    expect(problem(cancelLineSchema, { entryId: staffId, reason: "Wrong person" })).toBeNull();
    expect(problem(cancelLineSchema, { entryId: staffId, reason: "no" })).toBe("Say why it is cancelled");
  });
});
