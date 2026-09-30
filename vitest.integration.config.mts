import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

/**
 * The integration suite (backlog P7.9): the services, Server Actions, Route
 * Handlers and triggers against a real PostgreSQL. `pnpm test` stays pure and
 * needs no database; this one is `pnpm test:db`, and it needs a PostgreSQL
 * server on this computer — never live:
 *
 *   TEST_DATABASE_URL=postgres://postgres@127.0.0.1:5544/postgres pnpm test:db
 *
 * `global-setup.ts` makes a migrated template database there; `setup.ts` gives
 * every test file its own copy of it, so files run side by side and none sees
 * another's rows. All of them are dropped at the end.
 */
export default defineConfig({
  test: {
    include: ["tests/integration/**/*.test.ts"],
    globalSetup: ["tests/integration/global-setup.ts"],
    setupFiles: ["tests/integration/setup.ts"],
    // Real sign-ins hash passwords with scrypt, and a scenario closes days one
    // transaction at a time: seconds, not the milliseconds of a pure test.
    testTimeout: 60_000,
    hookTimeout: 120_000,
  },
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
});
