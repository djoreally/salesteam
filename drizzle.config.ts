import { defineConfig } from "drizzle-kit";

const url = process.env.DATABASE_URL;

if (!url) {
  throw new Error("DATABASE_URL is required for Drizzle schema operations");
}

export default defineConfig({
  dialect: "postgresql",
  schema: ["./src/db/schema.ts", "./src/db/infrastructure.ts"],
  dbCredentials: { url },
  verbose: true,
  strict: true,
});
