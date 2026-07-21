"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Bot, Check, CircleAlert, Clipboard, Clock3, Copy, FileCode2, GitCommitHorizontal, LoaderCircle, Play, ShieldAlert, Sparkles, Terminal, TestTube2, X, Zap } from "lucide-react";
import { summarizeTest } from "@/lib/analytics";
import { useDemoStore } from "@/lib/client-store";
import { createSimulatedRun } from "@/lib/simulator";
import type { Diagnosis, QuarantineArtifact, Store } from "@/lib/types";
import { ScorePill } from "./score-pill";
import { TrendChart } from "./trend-chart";

export function TestDetailClient({ testId, initialStore }: { testId: string; initialStore: Store }) {
  const { store, setStore, hydrated } = useDemoStore(initialStore);
  const [diagnosing, setDiagnosing] = useState(false);
  const [ingesting, setIngesting] = useState(false);
  const [quarantine, setQuarantine] = useState<QuarantineArtifact | null>(null);
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState<"pr" | "fix" | null>(null);
  const [loadingStep, setLoadingStep] = useState(0);
  const [aiError, setAiError] = useState<string | null>(null);

  const test = store.testCases.find((item) => item.id === testId);
  const runs = useMemo(() => store.runs.filter((run) => run.testCaseId === testId).sort((a, b) => b.timestamp.localeCompare(a.timestamp)), [store.runs, testId]);
  const diagnosis = store.diagnoses.filter((item) => item.testCaseId === testId).at(-1);
  const summary = test ? summarizeTest(test, runs, diagnosis) : null;

  useEffect(() => {
    if (!diagnosing) return;
    const timer = window.setInterval(() => setLoadingStep((step) => Math.min(step + 1, 2)), 750);
    return () => window.clearInterval(timer);
  }, [diagnosing]);

  if (!test || !summary) {
    return <main className="grid min-h-[65vh] place-items-center px-6"><div className="text-center">{!hydrated ? <LoaderCircle size={24} className="mx-auto animate-spin text-[#4b7259]" /> : <CircleAlert size={24} className="mx-auto text-[#9a5f2e]" />}<h1 className="mt-4 text-xl font-semibold">{hydrated ? "Case file not found" : "Loading case file"}</h1><p className="mt-2 text-xs text-[#7c8880]">{hydrated ? "The imported test may have been reset from this browser." : "Checking browser-persisted CI evidence..."}</p><Link href="/" className="mt-5 inline-flex items-center gap-2 rounded-lg bg-[#1e3025] px-4 py-2.5 text-xs font-semibold text-white"><ArrowLeft size={13} />Dashboard</Link></div></main>;
  }

  const diagnose = async () => {
    setLoadingStep(0); setDiagnosing(true); setAiError(null);
    try {
      const response = await fetch(`/api/tests/${test.id}/diagnose`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ test, runs }) });
      const data = await response.json() as Diagnosis | { error: string };
      if (!response.ok || "error" in data) throw new Error("error" in data ? data.error : "Diagnosis failed.");
      setStore((current) => ({ ...current, diagnoses: [...current.diagnoses, data] }));
    } catch (error) { setAiError(error instanceof Error ? error.message : "Gemini could not complete the diagnosis."); }
    finally { setDiagnosing(false); }
  };
  const ingest = () => {
    setIngesting(true);
    const run = createSimulatedRun(store, test.id);
    setStore((current) => ({ ...current, runs: [...current.runs, run] }));
    window.setTimeout(() => setIngesting(false), 350);
  };
  const generateQuarantine = async () => {
    if (!diagnosis) return;
    setGenerating(true); setAiError(null);
    try {
      const response = await fetch(`/api/tests/${test.id}/quarantine`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ test, runs, diagnosis }) });
      const data = await response.json() as QuarantineArtifact | { error: string };
      if (!response.ok || "error" in data) throw new Error("error" in data ? data.error : "PR description generation failed.");
      setQuarantine(data);
    } catch (error) { setAiError(error instanceof Error ? error.message : "Gemini could not generate the PR description."); }
    finally { setGenerating(false); }
  };
  const copyText = async (value: string, kind: "pr" | "fix") => { await navigator.clipboard.writeText(value); setCopied(kind); window.setTimeout(() => setCopied(null), 1600); };
  const failedRuns = runs.filter((run) => run.status === "fail");
  const selectedError = failedRuns[0]?.errorOutput;
  const median = runs.length ? Math.round([...runs].map((run) => run.durationMs).sort((a, b) => a - b)[Math.floor(runs.length / 2)] / 100) / 10 : 0;

  return (
    <main className="mx-auto max-w-[1500px] px-4 py-6 sm:px-6 lg:py-8">
      <Link href="/" className="mb-5 inline-flex items-center gap-1.5 text-xs font-semibold text-[#68766e] hover:text-[#28563a]"><ArrowLeft size={14} />All test cases</Link>
      <section className="mb-6 flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0"><div className="mb-2 flex items-center gap-2"><ScorePill score={summary.score} /><span className="text-[11px] font-semibold uppercase tracking-[.08em] text-[#7c8880]">Flakiness score</span></div><h1 className="max-w-4xl text-[27px] font-semibold tracking-[-.035em] sm:text-[34px]">{test.name}</h1><div className="mono mt-2 flex flex-wrap items-center gap-2 text-[11px] text-[#7b8780]"><FileCode2 size={13} /><span>{test.filePath}</span><span>·</span><span className="font-sans">owned by {test.owner}</span></div></div>
        <div className="flex flex-wrap gap-2"><button onClick={ingest} disabled={ingesting} className="flex h-10 items-center gap-2 rounded-xl border border-[#dbe1dc] bg-white px-3.5 text-xs font-semibold text-[#445149] shadow-sm hover:bg-[#f9faf9] disabled:opacity-60">{ingesting ? <LoaderCircle size={14} className="animate-spin" /> : <Play size={14} />}Simulate retry</button><button onClick={diagnose} disabled={diagnosing} className="flex h-10 items-center gap-2 rounded-xl bg-[#1e3025] px-4 text-xs font-semibold text-white shadow-sm hover:bg-[#294232] disabled:opacity-75">{diagnosing ? <LoaderCircle size={15} className="animate-spin" /> : <Sparkles size={15} />}{diagnosing ? "Investigating..." : diagnosis ? "Run diagnosis again" : "Diagnose case"}</button></div>
      </section>

      {aiError && <div className="mb-5 flex items-start gap-3 rounded-xl border border-[#efc7c3] bg-[#fff2f0] px-4 py-3"><CircleAlert size={16} className="mt-0.5 shrink-0 text-[#b3403c]" /><div><div className="text-xs font-semibold text-[#963b38]">Gemini request did not complete</div><div className="mt-1 text-[11px] leading-5 text-[#795b59]">{aiError} The result was not replaced with demo output. Check the status badge, then retry.</div></div><button onClick={() => setAiError(null)} className="ml-auto"><X size={14} /></button></div>}

      <section className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><MiniMetric label="Run history" value={`${runs.length} runs`} meta={`${summary.trend.length} commits`} icon={<TestTube2 size={15} />} /><MiniMetric label="Outcome flips" value={`${summary.inconsistentCommits} commits`} meta="same SHA, mixed result" icon={<GitCommitHorizontal size={15} />} /><MiniMetric label="Failure rate" value={`${Math.round((summary.failures / Math.max(summary.totalRuns, 1)) * 100)}%`} meta={`${summary.failures} observed failures`} icon={<ShieldAlert size={15} />} /><MiniMetric label="Median duration" value={`${median}s`} meta="all recent runs" icon={<Clock3 size={15} />} /></section>

      {diagnosing && <section className="panel mb-5 overflow-hidden rounded-2xl border-[#ccddd1]"><div className="grid-texture px-6 py-6 sm:px-8"><div className="flex items-center gap-3"><span className="pulse-ring grid h-9 w-9 place-items-center rounded-xl bg-[#e7f3ea] text-[#32734d]"><Bot size={18} /></span><div><div className="text-sm font-semibold">The investigator is working the case</div><div className="mt-0.5 text-xs text-[#728078]">Comparing source, execution context, and failure signatures</div></div></div><div className="mt-6 grid gap-2 sm:grid-cols-3">{["Grouping same-commit flips", "Correlating metadata", "Drafting a concrete fix"].map((label, index) => <div key={label} className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-[11px] ${index <= loadingStep ? "border-[#c9dfd0] bg-white text-[#315b40]" : "border-[#e5e9e5] bg-white/50 text-[#96a098]"}`}>{index < loadingStep ? <Check size={13} /> : index === loadingStep ? <LoaderCircle size={13} className="animate-spin" /> : <span className="h-3 w-3 rounded-full border" />}{label}</div>)}</div></div></section>}

      {diagnosis && !diagnosing && <DiagnosisPanel diagnosis={diagnosis} onQuarantine={generateQuarantine} generating={generating} onCopyFix={() => copyText(diagnosis.suggestedFix, "fix")} copiedFix={copied === "fix"} />}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.18fr)_minmax(380px,.82fr)]">
        <div className="space-y-5"><section className="panel overflow-hidden rounded-2xl"><PanelHeader icon={<FileCode2 size={15} />} title="Test source" meta={test.filePath} /><CodeBlock code={test.sourceSnippet} /></section><section className="panel overflow-hidden rounded-2xl"><PanelHeader icon={<Terminal size={15} />} title="Failure evidence" meta={`${failedRuns.length} samples`} />{selectedError ? <div className="bg-[#17201b] p-5"><div className="mb-3 flex items-center gap-2 text-[10px] text-[#91a097]"><span className="rounded bg-[#db514b]/15 px-2 py-1 font-semibold text-[#f28b84]">LATEST FAILURE</span><span className="mono">{failedRuns[0].commitSha}</span></div><pre className="code-scroll overflow-x-auto whitespace-pre-wrap font-mono text-[11px] leading-6 text-[#d8dfda]">{selectedError}</pre></div> : <div className="px-5 py-10 text-center text-xs text-[#7c8880]">No failure output captured.</div>}</section></div>
        <div className="space-y-5"><section className="panel rounded-2xl p-5"><div className="mb-4"><div className="text-sm font-semibold">Flakiness by commit</div><div className="mt-1 text-[11px] text-[#7f8a83]">Score is zero when outcomes are consistent—even if they fail.</div></div><TrendChart data={summary.trend} /></section><section className="panel overflow-hidden rounded-2xl"><PanelHeader icon={<Clock3 size={15} />} title="Run history" meta={`${runs.length} events`} /><div className="max-h-[470px] overflow-auto"><table className="w-full border-collapse text-left"><thead className="sticky top-0 bg-[#fafbfa] text-[9px] uppercase tracking-[.08em] text-[#8a958e]"><tr><th className="px-4 py-2.5">Result</th><th className="px-3 py-2.5">Commit</th><th className="px-3 py-2.5">Duration</th><th className="px-3 py-2.5">Context</th></tr></thead><tbody>{runs.map((run) => <tr key={run.id} className="border-t border-[#eaedea] text-[10px]"><td className="px-4 py-3"><span className={`inline-flex items-center gap-1.5 font-semibold ${run.status === "fail" ? "text-[#bc413e]" : "text-[#397451]"}`}><span className={`h-1.5 w-1.5 rounded-full ${run.status === "fail" ? "bg-[#d44d48]" : "bg-[#459265]"}`} />{run.status.toUpperCase()}</span></td><td className="mono px-3 py-3 text-[#66736b]">{run.commitSha}</td><td className="px-3 py-3 tabular-nums text-[#66736b]">{run.durationMs} ms</td><td className="px-3 py-3 text-[#8a958e]">#{run.orderIndex} · {run.ranInParallel ? "parallel" : "serial"}</td></tr>)}</tbody></table></div></section></div>
      </div>
      {quarantine && <QuarantineModal artifact={quarantine} onClose={() => setQuarantine(null)} onCopy={() => copyText(quarantine.markdown, "pr")} copied={copied === "pr"} />}
    </main>
  );
}

function MiniMetric({ label, value, meta, icon }: { label: string; value: string; meta: string; icon: React.ReactNode }) { return <div className="panel rounded-xl p-4"><div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[.08em] text-[#7f8a83]"><span className="text-[#64736a]">{icon}</span>{label}</div><div className="mt-2 text-lg font-semibold tracking-[-.02em]">{value}</div><div className="mt-0.5 text-[10px] text-[#909a93]">{meta}</div></div>; }
function PanelHeader({ icon, title, meta }: { icon: React.ReactNode; title: string; meta: string }) { return <div className="flex items-center gap-2 border-b border-[#e5e9e5] px-4 py-3"><span className="text-[#65736a]">{icon}</span><span className="text-xs font-semibold">{title}</span><span className="mono ml-auto truncate text-[9px] text-[#8d9890]">{meta}</span></div>; }
function CodeBlock({ code }: { code: string }) { return <div className="bg-[#17201b] p-5"><pre className="code-scroll overflow-x-auto text-[11px] leading-6"><code>{code.split("\n").map((line, index) => <span key={index} className="block"><span className="mr-5 inline-block w-4 select-none text-right text-[#5f6e64]">{index + 1}</span><span className="text-[#d7dfd9]">{line}</span></span>)}</code></pre></div>; }

function DiagnosisPanel({ diagnosis, onQuarantine, generating, onCopyFix, copiedFix }: { diagnosis: Diagnosis; onQuarantine: () => void; generating: boolean; onCopyFix: () => void; copiedFix: boolean }) {
  return <section className={`panel mb-5 overflow-hidden rounded-2xl ${diagnosis.aiMode === "live" ? "border-[#cadbce]" : "border-[#ead8b7]"}`}>
    <div className={`flex flex-col gap-4 border-b px-5 py-4 sm:flex-row sm:items-center ${diagnosis.aiMode === "live" ? "border-[#dce6de] bg-[#f4faf5]" : "border-[#ece1ca] bg-[#fffaf0]"}`}><div className="flex items-center gap-3"><span className={`grid h-9 w-9 place-items-center rounded-xl ${diagnosis.aiMode === "live" ? "bg-[#dfeee3] text-[#2f7049]" : "bg-[#f5e9ce] text-[#8f6228]"}`}><Sparkles size={17} /></span><div><div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.1em] text-[#52705c]">AI diagnosis <span className="rounded border border-current/20 bg-white px-1.5 py-0.5 text-[8px]">{diagnosis.aiMode === "live" ? `${diagnosis.model} · LIVE` : "DEMO INVESTIGATOR"}</span></div><div className="mt-1 text-[17px] font-semibold tracking-[-.02em]">{diagnosis.rootCause}</div></div></div><div className="sm:ml-auto"><div className="text-right text-[10px] text-[#748178]">Confidence</div><div className="mt-1 flex items-center gap-2"><div className="h-1.5 w-24 overflow-hidden rounded-full bg-[#dce4de]"><div className="h-full rounded-full bg-[#3c8659]" style={{ width: `${diagnosis.confidence * 100}%` }} /></div><span className="text-xs font-bold tabular-nums">{Math.round(diagnosis.confidence * 100)}%</span></div></div></div>
    <div className="grid lg:grid-cols-[.88fr_1.12fr]"><div className="border-b border-[#e4e9e5] p-5 lg:border-b-0 lg:border-r"><div className="mb-3 text-[10px] font-bold uppercase tracking-[.09em] text-[#7c8880]">Evidence → inference</div><p className="text-[12px] leading-6 text-[#4f5d54]">{diagnosis.reasoning}</p><div className="relative mt-5 space-y-0">{diagnosis.signals.map((signal, index) => <div key={signal} className="relative flex gap-3 pb-4 last:pb-0"><div className="relative z-10 grid h-5 w-5 shrink-0 place-items-center rounded-full border border-[#bcd3c3] bg-white text-[9px] font-bold text-[#417557]">{index + 1}</div>{index < diagnosis.signals.length - 1 && <span className="absolute left-[9px] top-5 h-full w-px bg-[#dce7df]" />}<div className="pt-0.5 text-[11px] leading-5 text-[#66736b]">{signal}</div></div>)}</div>{diagnosis.quarantineRecommended && <div className="mt-5 rounded-xl border border-[#efd7ab] bg-[#fff8e8] p-3"><div className="flex items-center gap-2 text-[11px] font-semibold text-[#98601b]"><ShieldAlert size={14} />Temporary quarantine recommended</div><p className="mt-1.5 text-[10px] leading-5 text-[#7c6a4c]">Keep the signal out of blocking CI while the uncontrolled dependency is replaced. The generated PR includes an exit criterion.</p><button onClick={onQuarantine} disabled={generating} className="mt-3 flex h-8 w-full items-center justify-center gap-2 rounded-lg bg-[#9b651f] text-[10px] font-semibold text-white hover:bg-[#855515] disabled:opacity-70">{generating ? <LoaderCircle size={12} className="animate-spin" /> : <Clipboard size={12} />}{generating ? "Generating PR body..." : "Generate quarantine PR description"}</button></div>}</div><FixDiff code={diagnosis.suggestedFix} onCopy={onCopyFix} copied={copiedFix} mode={diagnosis.aiMode} /></div>
    <div className="border-t border-[#e4e9e5] px-5 py-2 text-[9px] text-[#919b94]">Generated {new Date(diagnosis.createdAt).toLocaleString()} · {diagnosis.model} · {diagnosis.aiMode === "live" ? "Live Gemini response" : "Deterministic demo output"} · Review before applying</div>
  </section>;
}

function FixDiff({ code, onCopy, copied, mode }: { code: string; onCopy: () => void; copied: boolean; mode: Diagnosis["aiMode"] }) {
  const lines = code.split("\n");
  const before = lines.filter((line) => !line.startsWith("+")).map((line) => line.startsWith("-") ? line.slice(1) : line);
  const after = lines.filter((line) => !line.startsWith("-")).map((line) => line.startsWith("+") ? line.slice(1) : line);
  return <div className="min-w-0 bg-[#17201b] p-5"><div className="mb-3 flex items-center gap-2"><Zap size={13} className="text-[#9dcea9]" /><span className="text-[10px] font-bold uppercase tracking-[.09em] text-[#a8b5ac]">Suggested fix</span><span className="rounded bg-[#263329] px-2 py-1 text-[8px] font-semibold text-[#9fc0aa]">{mode === "live" ? "✨ GEMINI" : "DEMO"}</span><button onClick={onCopy} className="ml-auto flex items-center gap-1.5 rounded-md border border-white/10 px-2 py-1 text-[9px] font-semibold text-[#b8c4bc] hover:bg-white/5">{copied ? <Check size={10} /> : <Copy size={10} />}{copied ? "Copied" : "Copy fix"}</button></div><div className="grid gap-px overflow-hidden rounded-lg border border-white/10 bg-white/10 sm:grid-cols-2"><DiffPane label="Before" lines={before} tone="red" /><DiffPane label="Proposed" lines={after} tone="green" /></div></div>;
}
function DiffPane({ label, lines, tone }: { label: string; lines: string[]; tone: "red" | "green" }) { return <div className="min-w-0 bg-[#17201b]"><div className={`border-b border-white/10 px-3 py-2 text-[9px] font-bold uppercase tracking-wider ${tone === "red" ? "text-[#e69b95]" : "text-[#9bc7a7]"}`}>{label}</div><pre className="code-scroll max-h-[300px] overflow-auto p-3 font-mono text-[10px] leading-5 text-[#d9e2dc]">{lines.map((line, index) => <span key={index} className="block whitespace-pre">{line || " "}</span>)}</pre></div>; }

function QuarantineModal({ artifact, onClose, onCopy, copied }: { artifact: QuarantineArtifact; onClose: () => void; onCopy: () => void; copied: boolean }) { return <div className="fixed inset-0 z-50 grid place-items-center bg-[#111812]/55 p-4 backdrop-blur-sm" onMouseDown={(event) => { if (event.currentTarget === event.target) onClose(); }}><div className="panel flex max-h-[88vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl shadow-2xl"><div className="flex items-center border-b px-5 py-4"><div><div className="flex items-center gap-2 text-sm font-semibold"><Clipboard size={15} />Quarantine PR description <span className={`rounded px-2 py-1 text-[8px] font-bold uppercase tracking-wider ${artifact.aiMode === "live" ? "bg-[#edf6ef] text-[#3c7753]" : "bg-[#fff3da] text-[#90601f]"}`}>{artifact.aiMode === "live" ? `${artifact.model} · live` : "Demo generated"}</span></div><p className="mt-1 text-[10px] text-[#818c84]">Ready to paste into GitHub. Review and adjust ownership before opening.</p></div><button onClick={onClose} className="ml-auto grid h-8 w-8 place-items-center rounded-lg hover:bg-[#f2f4f2]" aria-label="Close PR description"><X size={16} /></button></div><div className="code-scroll overflow-auto bg-[#17201b] p-5"><pre className="whitespace-pre-wrap font-mono text-[11px] leading-6 text-[#d8e0da]">{artifact.markdown}</pre></div><div className="flex items-center justify-between border-t px-5 py-3"><span className="text-[10px] text-[#8b958e]">Markdown · {artifact.markdown.length} characters</span><button onClick={onCopy} className="flex h-9 items-center gap-2 rounded-lg bg-[#1e3025] px-4 text-[11px] font-semibold text-white">{copied ? <Check size={13} /> : <Copy size={13} />}{copied ? "Copied" : "Copy PR body"}</button></div></div></div>; }
