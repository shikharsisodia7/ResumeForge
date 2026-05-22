import { NextResponse } from "next/server";
import { getPrimaryProfile } from "@/lib/get-profile";

export async function requireProfileId(): Promise<string | NextResponse> {
  const profile = await getPrimaryProfile();
  if (!profile) return NextResponse.json({ error: "No profile" }, { status: 500 });
  return profile.id;
}

export function ok<T>(data: T, init?: ResponseInit) {
  return NextResponse.json(data, init);
}

export function bad(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}
