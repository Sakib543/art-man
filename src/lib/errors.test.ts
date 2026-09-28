import { describe, expect, it } from "vitest";
import { isUniqueViolation } from "./errors";

/** What `pg` throws: an Error carrying the SQLSTATE in `code`. */
const pgError = (code: string) => Object.assign(new Error("duplicate key value violates unique constraint"), { code });

describe("isUniqueViolation", () => {
  it("recognises the driver's own error", () => {
    expect(isUniqueViolation(pgError("23505"))).toBe(true);
  });

  it("recognises it inside Drizzle's wrapper, which keeps the original as cause", () => {
    const wrapped = new Error("Failed query: insert into bills ...", { cause: pgError("23505") });
    expect(isUniqueViolation(wrapped)).toBe(true);
  });

  it.each([
    ["a foreign key violation", pgError("23503")],
    ["a plain error", new Error("boom")],
    ["a wrapped error of another kind", new Error("Failed query", { cause: pgError("40001") })],
    ["something that is not an error", "23505"],
    ["nothing", undefined],
  ])("is false for %s", (_what, error) => {
    expect(isUniqueViolation(error)).toBe(false);
  });
});
