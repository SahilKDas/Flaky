import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json({ ok: true, detail: "Demo state is reset in browser storage." });
}
