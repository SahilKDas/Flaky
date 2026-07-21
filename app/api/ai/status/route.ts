import { NextResponse } from "next/server";
import { getAIStatus } from "@/lib/ai";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(await getAIStatus(), {
    headers: { "Cache-Control": "no-store" },
  });
}
