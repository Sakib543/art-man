import { describe, expect, it } from "vitest";
import { isTempNo, repeatedSlipNos, slipKey, slipLabel, tempNo } from "./slip";

describe("slip numbers", () => {
  it("writes an offline bill's temporary number with the computer's code", () => {
    expect(tempNo(1, "KXR")).toBe("T-KXR-1");
    expect(tempNo(27, "BCD")).toBe("T-BCD-27");
    // Without a code, as every slip before P7.10 was written.
    expect(tempNo(5)).toBe("T-5");
  });

  it("tells an offline number from a paper book number", () => {
    expect(isTempNo("T-KXR-5")).toBe(true);
    expect(isTempNo("T-5")).toBe(true);
    expect(isTempNo("B-2/45")).toBe(false);
    expect(isTempNo("45")).toBe(false);
    // Typed by hand into the book field, these are the paper book's.
    expect(isTempNo("T-")).toBe(false);
    expect(isTempNo("T-5a")).toBe(false);
    expect(isTempNo("T-kxr-5")).toBe(false);
    expect(isTempNo("T-KX-5")).toBe(false);
    expect(isTempNo("T-KXR-")).toBe(false);
  });

  it("labels the number beside a bill by where it came from", () => {
    expect(slipLabel("T-KXR-5")).toBe("Offline T-KXR-5");
    expect(slipLabel("T-5")).toBe("Offline T-5");
    expect(slipLabel("B-2/45")).toBe("Book B-2/45");
    expect(slipLabel(null)).toBeNull();
    expect(slipLabel("")).toBeNull();
  });
});

describe("repeated slip numbers (P7.10, QA-28)", () => {
  it("compares numbers as the slip reads, whatever the case or spacing", () => {
    expect(slipKey("b-2/45")).toBe(slipKey("B-2 / 45"));
    expect(slipKey("45")).not.toBe(slipKey("46"));
  });

  it("finds a number two bills in force carry", () => {
    const repeated = repeatedSlipNos([
      { bookNo: "B-2/45", status: "active" },
      { bookNo: "b-2/45", status: "active" },
      { bookNo: "B-2/46", status: "active" },
      { bookNo: null, status: "active" },
      { bookNo: null, status: "active" },
    ]);
    expect([...repeated]).toEqual(["B-2/45"]);
  });

  it("does not count a cancelled bill or its reversal: a corrected bill hands its number on", () => {
    const repeated = repeatedSlipNos([
      { bookNo: "T-KXR-1", status: "cancelled" },
      { bookNo: "T-KXR-1", status: "reversal" },
      { bookNo: "T-KXR-1", status: "active" },
    ]);
    expect(repeated.size).toBe(0);
  });

  it("finds the audit's case: two computers offline, each with a T-1", () => {
    const repeated = repeatedSlipNos([
      { bookNo: "T-1", status: "active" },
      { bookNo: "T-1", status: "active" },
      { bookNo: "T-KXR-1", status: "active" },
      { bookNo: "T-MTP-1", status: "active" },
    ]);
    expect([...repeated]).toEqual(["T-1"]);
  });
});
