import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { getDb, schema } from "@/db";

function resolveBaseURL(): string {
  const configured = process.env.BETTER_AUTH_URL || process.env.NEXT_PUBLIC_APP_URL;
  if (configured && !configured.includes("localhost")) {
    return configured;
  }
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  return configured || "http://localhost:3000";
}

export function getAuth() {
  const db = getDb();
  const trustedOrigins = [
    process.env.BETTER_AUTH_URL,
    process.env.NEXT_PUBLIC_APP_URL,
    process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : undefined,
    process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined,
    "http://localhost:3000",
  ].filter((origin): origin is string => Boolean(origin));

  return betterAuth({
    database: drizzleAdapter(db, {
      provider: "pg",
      schema,
    }),
    secret: process.env.BETTER_AUTH_SECRET,
    baseURL: resolveBaseURL(),
    trustedOrigins,
    emailAndPassword: {
      enabled: true,
    },
  });
}
