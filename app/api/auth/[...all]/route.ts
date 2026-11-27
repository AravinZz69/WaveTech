import { NextRequest } from "next/server";
import { toNextJsHandler } from "better-auth/next-js";
import { getAuth } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const handler = toNextJsHandler(getAuth());
  return handler.GET(req);
}

export async function POST(req: NextRequest) {
  const handler = toNextJsHandler(getAuth());
  return handler.POST(req);
}
