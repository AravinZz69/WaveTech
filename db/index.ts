import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

let cachedDb: ReturnType<typeof drizzle<typeof schema>> | null = null;

export function getDb() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      "DATABASE_URL is missing. Add your Neon PostgreSQL connection string to .env.local."
    );
  }
  if (!cachedDb) {
    const sql = neon(connectionString);
    cachedDb = drizzle(sql, { schema });
  }
  return cachedDb;
}

export { schema };
