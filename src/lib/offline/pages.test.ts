import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { OFFLINE_PAGES, offlinePage, offlinePageFor } from "./pages";

describe("offlinePageFor", () => {
  it("opens each screen's own offline page", () => {
    expect(offlinePageFor("/billing").href).toBe("/offline-billing");
    expect(offlinePageFor("/").href).toBe("/offline-billing");
    expect(offlinePageFor("/folders").href).toBe("/offline-folders");
    expect(offlinePageFor("/daily-report").href).toBe("/offline-register");
    expect(offlinePageFor("/worksheet").href).toBe("/offline-register");
  });

  it("falls back to offline billing for a screen with no offline page", () => {
    expect(offlinePageFor("/staff-khata").view).toBe("billing");
    expect(offlinePageFor("/overview").view).toBe("billing");
  });

  it("knows every view", () => {
    expect(offlinePage("register").label).toBe("Register");
    expect(new Set(OFFLINE_PAGES.map((page) => page.href)).size).toBe(OFFLINE_PAGES.length);
  });
});

/**
 * The service worker is plain JavaScript and cannot import `pages.ts`, so it
 * keeps its own list. Read it, and fail when the two disagree — a page the
 * worker never keeps opens as "No internet" instead of working offline.
 */
describe("public/sw.js keeps the same pages", () => {
  const worker = readFileSync(join(process.cwd(), "public/sw.js"), "utf8");

  it.each(OFFLINE_PAGES.map((page) => [page.href]))("keeps %s", (href) => {
    const shells = worker.match(/const SHELL_URLS = \[([^\]]*)\]/)?.[1] ?? "";
    expect(shells).toContain(`"${href}"`);
  });

  it.each(OFFLINE_PAGES.flatMap((page) => page.standsInFor.map((path) => [path, page.href])))(
    "opens %s as %s with no network",
    (path, href) => {
      expect(worker).toContain(`["${path}", "${href}"]`);
    },
  );
});
