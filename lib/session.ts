import { headers } from "next/headers";
import { getAuth } from "./auth";

export async function getServerSession() {
  const reqHeaders = await headers();
  try {
    const auth = getAuth();
    const session = await auth.api.getSession({
      headers: reqHeaders,
    });
    return session;
  } catch {
    return null;
  }
}
