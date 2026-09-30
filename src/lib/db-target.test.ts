import { describe, expect, it } from "vitest";
import { describeDatabase, directDatabaseUrl, isLocalDatabase } from "./db-target";

const LIVE_POOLED = "postgresql://owner:secret@ep-live-pooler.neon.tech/neondb?sslmode=require";
const LIVE_DIRECT = "postgresql://owner:secret@ep-live.neon.tech/neondb?sslmode=require";
const LOCAL = "postgres://postgres@127.0.0.1:5544/copy";
/** `.env.local` as it is today: both strings, both live. */
const file = { DATABASE_URL: LIVE_POOLED, DATABASE_URL_UNPOOLED: LIVE_DIRECT };

describe("directDatabaseUrl", () => {
  it("uses the file's direct string when nothing is named on the command line", () => {
    expect(directDatabaseUrl({}, file)).toBe(LIVE_DIRECT);
  });

  it("uses DATABASE_URL named on the command line, not the file's live direct string (QA-01)", () => {
    // The environment wins over the file for DATABASE_URL; the file still filled in UNPOOLED.
    expect(directDatabaseUrl({ DATABASE_URL: LOCAL }, { ...file, DATABASE_URL: LOCAL })).toBe(LOCAL);
  });

  it("uses a direct string named on the command line", () => {
    expect(directDatabaseUrl({ DATABASE_URL_UNPOOLED: LOCAL }, { ...file, DATABASE_URL_UNPOOLED: LOCAL })).toBe(LOCAL);
    const both = { DATABASE_URL: LIVE_POOLED, DATABASE_URL_UNPOOLED: LIVE_DIRECT };
    expect(directDatabaseUrl(both, both)).toBe(LIVE_DIRECT);
  });

  it("falls back to DATABASE_URL when there is no direct string, and to nothing", () => {
    expect(directDatabaseUrl({}, { DATABASE_URL: LIVE_POOLED, DATABASE_URL_UNPOOLED: "" })).toBe(LIVE_POOLED);
    expect(directDatabaseUrl({}, {})).toBeUndefined();
  });
});

describe("isLocalDatabase", () => {
  it.each([LOCAL, "postgres://postgres@localhost/x", "postgres://postgres@[::1]:5432/x", "postgres://u@127.0.0.2/x"])("%s is on this computer", (url) => {
    expect(isLocalDatabase(url)).toBe(true);
  });

  it.each([LIVE_POOLED, "postgres://u:p@203.0.113.7/x", "postgres://u@localhost.example.com/x", "not a url"])("%s may be live", (url) => {
    expect(isLocalDatabase(url)).toBe(false);
  });
});

describe("describeDatabase", () => {
  it("names the host and database, never the password", () => {
    expect(describeDatabase(LIVE_POOLED)).toBe("ep-live-pooler.neon.tech/neondb");
    expect(describeDatabase(LIVE_POOLED)).not.toContain("secret");
    expect(describeDatabase("nope")).toBe("an unreadable connection string");
  });
});
