import { defineConfig } from "drizzle-kit";

// drizzle-kit does not read .env.local on its own.
try {
  process.loadEnvFile(".env.local");
} catch {
  // Not present (e.g. CI). DATABASE_URL_UNPOOLED must come from the environment.
}

export default defineConfig({
  schema: "./src/db/schema",
  out: "./drizzle",
  dialect: "postgresql",
  // Migrations use the direct (unpooled) connection.
  dbCredentials: { url: process.env.DATABASE_URL_UNPOOLED! },
});
