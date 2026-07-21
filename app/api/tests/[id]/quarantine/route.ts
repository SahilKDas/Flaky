import { NextResponse } from "next/server";
import { AIServiceError, generateQuarantineDescription } from "@/lib/ai";
import type { Diagnosis, Run, TestCase } from "@/lib/types";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const body = await request.json().catch(() => null) as { test?: TestCase; runs?: Run[]; diagnosis?: Diagnosis } | null;
  if (!body?.test || body.test.id !== id || !Array.isArray(body.runs) || !body.diagnosis) return NextResponse.json({ error: "Test evidence and diagnosis are required" }, { status: 400 });
  try {
    return NextResponse.json(await generateQuarantineDescription(body.test, body.runs, body.diagnosis));
  } catch (error) {
    const status = error instanceof AIServiceError ? error.status : 500;
    return NextResponse.json({ error: error instanceof Error ? error.message : "Quarantine generation failed" }, { status });
  }
}
