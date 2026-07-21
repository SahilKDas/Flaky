import { NextResponse } from "next/server";
import { AIServiceError, diagnoseTest } from "@/lib/ai";
import { getSeedDetail } from "@/lib/demo-data";
import type { Run, TestCase } from "@/lib/types";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const body = await request.json().catch(() => null) as { test?: TestCase; runs?: Run[] } | null;
  const detail = body?.test?.id === id && Array.isArray(body.runs)
    ? { test: body.test, runs: body.runs }
    : getSeedDetail(id);
  if (!detail) return NextResponse.json({ error: "Test not found" }, { status: 404 });
  try {
    return NextResponse.json(await diagnoseTest(detail.test, detail.runs));
  } catch (error) {
    const status = error instanceof AIServiceError ? error.status : 500;
    return NextResponse.json({ error: error instanceof Error ? error.message : "Diagnosis failed" }, { status });
  }
}
