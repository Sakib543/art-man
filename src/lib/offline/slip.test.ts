import { describe, expect, it } from "vitest";
import { isTempNo, slipLabel, tempNo } from "./slip";

describe("slip numbers", () => {
  it("writes an offline bill's temporary number", () => {
    expect(tempNo(1)).toBe("T-1");
    expect(tempNo(27)).toBe("T-27");
  });

  it("tells an offline number from a paper book number", () => {
    expect(isTempNo("T-5")).toBe(true);
    expect(isTempNo("B-2/45")).toBe(false);
    expect(isTempNo("45")).toBe(false);
    // Typed by hand into the book field, these are the paper book's.
    expect(isTempNo("T-")).toBe(false);
    expect(isTempNo("T-5a")).toBe(false);
  });

  it("labels the number beside a bill by where it came from", () => {
    expect(slipLabel("T-5")).toBe("Offline T-5");
    expect(slipLabel("B-2/45")).toBe("Book B-2/45");
    expect(slipLabel(null)).toBeNull();
    expect(slipLabel("")).toBeNull();
  });
});
