import { describe, expect, it } from "vitest";
import { isUniqueViolation } from "./errors";

/** What `pg` throws: an Error carrying the SQLSTATE in `code`, and the constraint's name in `constraint`. */
const pgError = (code: string, constraint?: string) =>
  Object.assign(new Error("duplicate key value violates unique constraint"), { code, constraint });

describe("isUniqueViolation", () => {
  it("recognises the driver's own error", () => {
    expect(isUniqueViolation(pgError("23505"))).toBe(true);
  });

  it("recognises it inside Drizzle's wrapper, which keeps the original as cause", () => {
    const wrapped = new Error("Failed query: insert into bills ...", { cause: pgError("23505") });
    expect(isUniqueViolation(wrapped)).toBe(true);
  });

  it("matches a named constraint, and only that one", () => {
    const wrapped = new Error("Failed query", { cause: pgError("23505", "cash_entries_voids_entry_id_unique") });
    expect(isUniqueViolation(wrapped, "cash_entries_voids_entry_id_unique")).toBe(true);
    expect(isUniqueViolation(wrapped, "day_snapshots_pkey")).toBe(false);
    expect(isUniqueViolation(pgError("23503", "cash_entries_voids_entry_id_unique"), "cash_entries_voids_entry_id_unique")).toBe(false);
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
