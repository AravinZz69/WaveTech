import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const payload = await req.json();
    if (payload && typeof payload.name === "string" && typeof payload.value === "number") {
      if (payload.value > 2500) {
        console.warn(
          JSON.stringify({
            type: "web_vital_slow",
            name: payload.name,
            value: payload.value,
            rating: payload.rating,
          })
        );
      }
    }
  } catch {
    // Ignore malformed telemetry beacons
  }
  return NextResponse.json({ ok: true });
}
