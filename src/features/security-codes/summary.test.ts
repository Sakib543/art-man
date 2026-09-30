import { describe, expect, it } from "vitest";
import { checkSummary } from "./summary";

const day = (businessDate: string, ok: boolean) => ({ businessDate, code: "AAAA-BBBB-CCCC", ok });

describe("checkSummary", () => {
  it("says when every closed day matches", () => {
    expect(checkSummary([day("2026-09-01", true), day("2026-09-02", true)], "September 2026")).toEqual({
      ok: true,
      text: "All 2 closed days of September 2026 match their records.",
    });
    expect(checkSummary([day("2026-09-01", true)], "September 2026").text).toBe("The closed day of September 2026 matches its records.");
  });

  it("names the days that do not", () => {
    expect(checkSummary([day("2026-09-01", false), day("2026-09-02", true), day("2026-09-03", false)], "September 2026")).toEqual({
      ok: false,
      text: "2 of 3 closed days do not match their records: 1 Sep, 3 Sep. Something in them was changed after the day was closed, outside the app.",
    });
    expect(checkSummary([day("2026-09-01", false), day("2026-09-02", true)], "September 2026").text).toBe(
      "1 of 2 closed days does not match its records: 1 Sep. Something in it was changed after the day was closed, outside the app.",
    );
  });

  it("says when nothing is closed yet", () => {
    expect(checkSummary([], "October 2026")).toEqual({ ok: true, text: "No day of October 2026 has been closed yet." });
  });
});
