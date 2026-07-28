import "server-only";

import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

type Database = ReturnType<typeof drizzle<typeof schema>>;

function getDatabaseUrl() {
  const databaseUrl = process.env.DATABASE_URL ?? process.env.POSTGRES_URL;

  if (!databaseUrl) {
    throw new Error("DATABASE_URL or POSTGRES_URL is required to use the database.");
  }

  return databaseUrl;
}

let database: Database | null = null;

export function getDb() {
  if (!database) {
    const sql = neon(getDatabaseUrl());
    database = drizzle(sql, { schema });
  }

  return database;
}
