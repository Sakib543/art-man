import { describe, expect, it } from "vitest";
import { failureWords, loadFailureOf } from "./load-failure";

describe("why a screen could not load (P7.11, QA-30)", () => {
  it("is the internet when the server cannot be reached, whatever else is known", () => {
    expect(loadFailureOf(false, null)).toBe("offline");
    expect(loadFailureOf(false, true)).toBe("offline");
    expect(loadFailureOf(false, false)).toBe("offline");
  });

  it("is the database only when the server said so", () => {
    expect(loadFailureOf(true, false)).toBe("database");
  });

  it("is the screen when the server and its database both answer — or when that cannot be told", () => {
    expect(loadFailureOf(true, true)).toBe("screen");
    expect(loadFailureOf(true, null)).toBe("screen");
  });
});

describe("what the error screen says", () => {
  it("never blames the database, nor sends the counter to paper, for a fault in the screen", () => {
    const words = failureWords("screen");
    const text = `${words.title} ${words.cause} ${words.advice}`;
    expect(text).not.toMatch(/database/i);
    expect(text).not.toMatch(/paper/i);
    expect(words.offerOffline).toBe(false);
    expect(words.cause).toMatch(/not something you did/);
    expect(words.advice).toMatch(/reference/);
  });

  it("offers offline billing and the paper bill book when billing here cannot work", () => {
    for (const failure of ["offline", "database"] as const) {
      const words = failureWords(failure);
      expect(words.offerOffline).toBe(true);
      expect(words.advice).toMatch(/offline/);
      expect(words.advice).toMatch(/paper bill book/);
    }
  });

  it("names the database only when it was the database", () => {
    expect(failureWords("database").cause).toMatch(/database did not answer/);
    expect(`${failureWords("offline").cause} ${failureWords("offline").advice}`).not.toMatch(/database/i);
  });
});
