import { NextResponse } from "next/server";
import { getSeedSummaries } from "@/lib/demo-data";

export async function GET() {
  return NextResponse.json(getSeedSummaries());
}
