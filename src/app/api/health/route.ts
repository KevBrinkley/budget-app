import { NextResponse } from "next/server";
import { getAppPassword, hasGoogleCredentials } from "@/lib/env";

export async function GET() {
  return NextResponse.json({
    ok: true,
    configured: hasGoogleCredentials(),
    passwordRequired: Boolean(getAppPassword()),
  });
}
