import { describe, expect, it } from "vitest";
import { readView, reportHref } from "./view";

describe("readView", () => {
  it("reads the register", () => {
    expect(readView("register")).toBe("register");
  });

  it("falls back to the list for anything else, or nothing", () => {
    expect(readView(undefined)).toBe("list");
    expect(readView("list")).toBe("list");
    expect(readView("Register")).toBe("list");
    expect(readView("grid")).toBe("list");
  });
});

describe("reportHref", () => {
  it("leaves the default view out of the URL", () => {
    expect(reportHref("2026-09-24", "list")).toBe("/daily-report?date=2026-09-24");
  });

  it("keeps the register when the day changes", () => {
    expect(reportHref("2026-09-24", "register")).toBe("/daily-report?date=2026-09-24&view=register");
  });
});
