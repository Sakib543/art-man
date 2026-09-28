import { describe, expect, it } from "vitest";
import { isSameOrigin } from "./same-origin";

const request = (headers: Record<string, string>) => new Headers(headers);

describe("isSameOrigin", () => {
  it("lets a page of the same host through", () => {
    expect(isSameOrigin(request({ origin: "http://localhost:3000", host: "localhost:3000" }))).toBe(true);
    expect(isSameOrigin(request({ origin: "https://art-man-drab.vercel.app", host: "art-man-drab.vercel.app" }))).toBe(
      true,
    );
  });

  it("refuses a page of another site", () => {
    expect(isSameOrigin(request({ origin: "https://evil.example", host: "art-man-drab.vercel.app" }))).toBe(false);
  });

  it("goes by the port as well as the name", () => {
    expect(isSameOrigin(request({ origin: "http://localhost:4000", host: "localhost:3000" }))).toBe(false);
  });

  it("behind a proxy, compares with the first X-Forwarded-Host rather than Host", () => {
    const behindProxy = { host: "internal:8080", "x-forwarded-host": "art-man-drab.vercel.app, internal:8080" };
    expect(isSameOrigin(request({ ...behindProxy, origin: "https://art-man-drab.vercel.app" }))).toBe(true);
    expect(isSameOrigin(request({ ...behindProxy, origin: "http://internal:8080" }))).toBe(false);
  });

  it("lets a request with no Origin through, as Next does for a Server Action", () => {
    expect(isSameOrigin(request({ host: "localhost:3000" }))).toBe(true);
  });

  it("refuses Origin: null and an Origin that is not a URL", () => {
    expect(isSameOrigin(request({ origin: "null", host: "localhost:3000" }))).toBe(false);
    expect(isSameOrigin(request({ origin: "not a url", host: "localhost:3000" }))).toBe(false);
  });

  it("refuses when there is no host to compare with", () => {
    expect(isSameOrigin(request({ origin: "http://localhost:3000" }))).toBe(false);
  });
});
