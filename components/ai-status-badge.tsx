"use client";

import { useEffect, useState } from "react";
import { Bot, CircleAlert, LoaderCircle } from "lucide-react";
import type { AIStatus } from "@/lib/types";

export function AIStatusBadge() {
  const [status, setStatus] = useState<AIStatus | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/ai/status", { cache: "no-store", signal: controller.signal })
      .then(async (response) => response.json() as Promise<AIStatus>)
      .then(setStatus)
      .catch(() => setStatus({ configured: false, mode: "unavailable", model: "Gemini", detail: "Health check unavailable.", checkedAt: new Date().toISOString() }));
    return () => controller.abort();
  }, []);

  if (!status) return <span className="mobile-hide inline-flex items-center gap-1.5 rounded-full border border-[#dce3dd] bg-white px-2.5 py-1 text-[10px] font-semibold text-[#748078]"><LoaderCircle size={10} className="animate-spin" />Checking AI</span>;
  const tone = status.mode === "live" ? "border-[#c8ddce] bg-[#edf7f0] text-[#31704b]" : status.mode === "demo" ? "border-[#ead7ad] bg-[#fff7e7] text-[#95611d]" : "border-[#efc7c3] bg-[#fff1ef] text-[#a83f3b]";
  return (
    <span title={status.detail} className={`mobile-hide inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-semibold ${tone}`}>
      {status.mode === "unavailable" ? <CircleAlert size={10} /> : <Bot size={10} />}
      {status.mode === "live" ? `${status.model} · Live` : status.mode === "demo" ? "Demo investigator" : "Gemini unavailable"}
    </span>
  );
}
