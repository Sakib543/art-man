import { describe, expect, it } from "vitest";
import { createBillSchema } from "./schemas";

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
