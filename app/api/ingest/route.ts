import { NextResponse } from "next/server";
import { getSeedStore } from "@/lib/demo-data";
import { createSimulatedRun } from "@/lib/simulator";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({})) as { testCaseId?: string };
  return NextResponse.json(createSimulatedRun(getSeedStore(), body.testCaseId));
}
