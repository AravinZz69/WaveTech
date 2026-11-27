import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { getDb, schema } from "@/db";

export function getAuth() {
  const db = getDb();
  return betterAuth({
    database: drizzleAdapter(db, {
      provider: "pg",
      schema,
    }),
    secret: process.env.BETTER_AUTH_SECRET,
    baseURL: process.env.BETTER_AUTH_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
    emailAndPassword: {
      enabled: true,
    },
  });
}
