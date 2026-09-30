import { describe, expect, it, vi } from "vitest";
import { databaseAnswers, nextCheckIn, reachesServer } from "./connectivity";

describe("reachesServer", () => {
  it("is online when the server answers", async () => {
    const fetcher = vi.fn(async () => new Response(null, { status: 200 }));
    expect(await reachesServer(fetcher)).toBe(true);
  });

  it("is still online when the server answers with an error — the connection worked", async () => {
    const fetcher = vi.fn(async () => new Response(null, { status: 500 }));
    expect(await reachesServer(fetcher)).toBe(true);
  });

  it("is offline when the request fails at the network", async () => {
    const fetcher = vi.fn(async () => {
      throw new TypeError("Failed to fetch");
    });
    expect(await reachesServer(fetcher)).toBe(false);
  });

  it("is offline when the server does not answer in time", async () => {
    const fetcher = vi.fn(
      (_url: RequestInfo | URL, init?: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError")));
        }),
    );
    expect(await reachesServer(fetcher as typeof fetch, "/manifest.webmanifest", 10)).toBe(false);
  });

  it("asks with HEAD, skips every cache, and makes each URL unique", async () => {
    const fetcher = vi.fn(async () => new Response(null));
    await reachesServer(fetcher, "/manifest.webmanifest");
    const [url, init] = fetcher.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toMatch(/^\/manifest\.webmanifest\?probe=\d+$/);
    expect(init.method).toBe("HEAD");
    expect(init.cache).toBe("no-store");
  });
});

describe("nextCheckIn", () => {
  it("checks often while offline and rarely while online", () => {
    expect(nextCheckIn(false)).toBeLessThan(nextCheckIn(true));
  });
});

describe("databaseAnswers (P7.11)", () => {
  it("reads the health route's two answers", async () => {
    expect(await databaseAnswers(vi.fn(async () => new Response(null, { status: 204 })))).toBe(true);
    expect(await databaseAnswers(vi.fn(async () => new Response(null, { status: 503 })))).toBe(false);
  });

  it("cannot tell from anything else: a redirect to the login page, a server error, no network", async () => {
    // What `redirect: "manual"` makes of the proxy's redirect to /login.
    const redirected = vi.fn(async () => ({ status: 0, type: "opaqueredirect" }) as Response);
    expect(await databaseAnswers(redirected)).toBeNull();
    expect(await databaseAnswers(vi.fn(async () => new Response(null, { status: 500 })))).toBeNull();
    const failing = vi.fn(async () => {
      throw new TypeError("Failed to fetch");
    });
    expect(await databaseAnswers(failing)).toBeNull();
  });

  it("asks the health route, uncached, without following a redirect", async () => {
    const fetcher = vi.fn(async () => new Response(null, { status: 204 }));
    await databaseAnswers(fetcher);
    const [url, init] = fetcher.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("/api/health");
    expect(init).toMatchObject({ cache: "no-store", redirect: "manual" });
  });
});
