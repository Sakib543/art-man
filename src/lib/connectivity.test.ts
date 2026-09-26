import { describe, expect, it, vi } from "vitest";
import { nextCheckIn, reachesServer } from "./connectivity";

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
