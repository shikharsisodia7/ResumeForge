import { NextResponse } from "next/server";

export function jsonErr(error: string, status: number) {
  return NextResponse.json({ error }, { status });
}
