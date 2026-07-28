import { defineConfig } from "drizzle-kit";

const databaseUrl = process.env.DATABASE_URL ?? process.env.POSTGRES_URL;
const isGenerateCommand = process.argv.includes("generate");

function getDatabaseUrl() {
  if (databaseUrl) return databaseUrl;
  if (isGenerateCommand) return "postgres://deskcat:deskcat@localhost:5432/deskcat";
  throw new Error("DATABASE_URL or POSTGRES_URL is required for Drizzle database commands.");
}

export default defineConfig({
  schema: "./app/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: getDatabaseUrl()
  },
  strict: true,
  verbose: true
});
