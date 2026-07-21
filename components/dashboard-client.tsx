"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowDown, ArrowUp, Bot, CheckCircle2, ChevronRight, CircleDot, FileUp, FlaskConical, GitPullRequestArrow, LoaderCircle, RotateCcw, Search, ShieldAlert, Sparkles, Upload, X } from "lucide-react";
import { summarizeTest } from "@/lib/analytics";
import { parseGitHubActionsLog, SAMPLE_GITHUB_LOG } from "@/lib/ci-parser";
import { useDemoStore } from "@/lib/client-store";
import { createSimulatedRun } from "@/lib/simulator";
import type { Run, Store } from "@/lib/types";
import { ScorePill } from "./score-pill";
import { Sparkline } from "./sparkline";

export function DashboardClient({ initialStore }: { initialStore: Store }) {
  const { store, setStore, resetStore } = useDemoStore(initialStore);
  const [filter, setFilter] = useState<"all" | "flaky" | "stable">("all");
  const [query, setQuery] = useState("");
  const [ingesting, setIngesting] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [latestRun, setLatestRun] = useState<(Run & { testName?: string; source?: string }) | null>(null);
  const [importOpen, setImportOpen] = useState(false);

  const tests = useMemo(() => store.testCases.map((test) => summarizeTest(
    test,
    store.runs.filter((run) => run.testCaseId === test.id),
    store.diagnoses.filter((item) => item.testCaseId === test.id).at(-1),
  )).sort((a, b) => b.score - a.score || b.failures - a.failures), [store]);

  const ingest = () => {
    setIngesting(true);
    const run = createSimulatedRun(store);
    const target = store.testCases.find((test) => test.id === run.testCaseId);
    setStore((current) => ({ ...current, runs: [...current.runs, run] }));
    setLatestRun({ ...run, testName: target?.name, source: "mock-ci/v2" });
    window.setTimeout(() => setIngesting(false), 350);
  };
  const reset = () => {
    setResetting(true);
    resetStore();
    setLatestRun(null);
    window.setTimeout(() => setResetting(false), 350);
  };
  const imported = (log: string) => {
    const parsed = parseGitHubActionsLog(log, store.testCases);
    setStore((current) => ({
      ...current,
      testCases: current.testCases.some((test) => test.id === parsed.test.id) ? current.testCases : [...current.testCases, parsed.test],
      runs: [...current.runs, parsed.run],
    }));
    setLatestRun({ ...parsed.run, testName: parsed.test.name, source: "GitHub Actions log" });
    setImportOpen(false);
  };

  const visible = useMemo(() => tests.filter((test) => {
    if (filter === "flaky" && test.score === 0) return false;
    if (filter === "stable" && test.score > 0) return false;
    return `${test.name} ${test.filePath}`.toLowerCase().includes(query.toLowerCase());
  }), [tests, filter, query]);
  const flaky = tests.filter((test) => test.score > 0);
  const totalRuns = tests.reduce((sum, test) => sum + test.totalRuns, 0);
  const avgScore = Math.round(flaky.reduce((sum, test) => sum + test.score, 0) / Math.max(flaky.length, 1));

  return (
    <main className="mx-auto max-w-[1500px] px-4 py-7 sm:px-6 lg:py-9">
      <section className="mb-7 flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-[#708077]"><span>CI RELIABILITY</span><ChevronRight size={12} /><span className="text-[#29372f]">OVERVIEW</span></div>
          <h1 className="text-[30px] font-semibold tracking-[-0.035em] sm:text-[36px]">Find the failure behind the failure.</h1>
          <p className="mt-2 max-w-2xl text-[14px] leading-6 text-[#68756d]">Same code. Different result. Flaky connects run-level evidence and tells you what to fix next.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button onClick={reset} disabled={resetting} className="grid h-10 w-10 place-items-center rounded-xl border border-[#dce2dd] bg-white text-[#647168] shadow-sm hover:bg-[#f8faf8] disabled:opacity-50" title="Reset pristine demo data"><RotateCcw size={15} className={resetting ? "animate-spin" : ""} /></button>
          <button onClick={() => setImportOpen(true)} className="flex h-10 items-center gap-2 rounded-xl border border-[#dbe1dc] bg-white px-3.5 text-xs font-semibold text-[#445149] shadow-sm hover:bg-[#f9faf9]"><FileUp size={14} />Import CI log</button>
          <button onClick={ingest} disabled={ingesting} className="flex h-10 items-center gap-2 rounded-xl bg-[#1e3025] px-4 text-xs font-semibold text-white shadow-sm transition hover:bg-[#294232] disabled:opacity-70">
            {ingesting ? <LoaderCircle size={15} className="animate-spin" /> : <FlaskConical size={15} />}{ingesting ? "Ingesting CI event..." : "Ingest new run"}<span className="rounded bg-white/12 px-1.5 py-0.5 text-[9px] tracking-wide">DEMO</span>
          </button>
        </div>
      </section>

      {latestRun && (
        <div className={`mb-5 flex flex-wrap items-center gap-3 rounded-xl border px-4 py-3 text-xs ${latestRun.status === "fail" ? "border-[#efcac7] bg-[#fff4f2]" : "border-[#cee2d4] bg-[#eff8f1]"}`}>
          <span className={`h-2 w-2 rounded-full ${latestRun.status === "fail" ? "bg-[#cc4642]" : "bg-[#32855a]"}`} />
          <span className="font-semibold">New CI event ingested</span><span className="text-[#647168]">{latestRun.testName}</span>
          <span className="mono ml-auto text-[10px] uppercase">{latestRun.commitSha} · {latestRun.status} · {latestRun.durationMs}ms · {latestRun.source}</span>
        </div>
      )}

      <section className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric icon={<ShieldAlert size={16} />} label="Flaky tests" value={`${flaky.length}`} note={`of ${tests.length} tracked`} tone="red" />
        <Metric icon={<CircleDot size={16} />} label="Avg. flakiness" value={`${avgScore}%`} note="on affected tests" tone="amber" />
        <Metric icon={<CheckCircle2 size={16} />} label="Runs analyzed" value={totalRuns.toLocaleString()} note="browser-persisted" tone="green" />
        <Metric icon={<Bot size={16} />} label="Cases diagnosed" value={`${tests.filter((test) => test.diagnosis).length}`} note={`${Math.max(0, flaky.length - tests.filter((test) => test.diagnosis).length)} await review`} tone="neutral" />
      </section>

      <section className="panel overflow-hidden rounded-2xl">
        <div className="flex flex-col gap-3 border-b border-[#e1e6e1] px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-1 rounded-lg bg-[#f1f4f1] p-1">
            {(["all", "flaky", "stable"] as const).map((item) => <button key={item} onClick={() => setFilter(item)} className={`rounded-md px-3 py-1.5 text-[11px] font-semibold capitalize transition ${filter === item ? "bg-white text-[#213029] shadow-sm" : "text-[#79847d] hover:text-[#34423a]"}`}>{item} {item === "flaky" ? flaky.length : item === "stable" ? tests.length - flaky.length : tests.length}</button>)}
          </div>
          <label className="flex h-8 w-full items-center gap-2 rounded-lg border border-[#dfe4df] bg-white px-2.5 text-[#849087] sm:w-64"><Search size={13} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Filter tests or files..." className="w-full bg-transparent text-xs text-[#2c3931] outline-none placeholder:text-[#9aa49d]" /></label>
        </div>

        <div className="overflow-x-auto"><div className="min-w-[1050px]">
          <div className="grid grid-cols-[minmax(310px,1.9fr)_110px_140px_115px_140px_160px_34px] items-center gap-4 border-b border-[#e5e9e5] bg-[#fafbfa] px-5 py-2.5 text-[10px] font-bold uppercase tracking-[0.09em] text-[#87918a]"><span>Test case</span><span>Flakiness</span><span>Recent history</span><span>Failures</span><span>Trend</span><span>Diagnosis</span><span /></div>
          {visible.map((test) => (
            <Link href={`/tests/${test.id}`} key={test.id} className="group grid grid-cols-[minmax(310px,1.9fr)_110px_140px_115px_140px_160px_34px] items-center gap-4 border-b border-[#e9ece9] px-5 py-4 transition last:border-0 hover:bg-[#fafcf9]">
              <div className="min-w-0"><div className="truncate text-[13px] font-semibold text-[#25322b] group-hover:text-[#17613c]">{test.name}</div><div className="mono mt-1 truncate text-[10px] text-[#89938c]">{test.filePath} <span className="ml-2 font-sans">· {test.owner}</span></div></div>
              <ScorePill score={test.score} /><Sparkline history={test.history} />
              <div><div className="text-xs font-semibold tabular-nums">{test.failures} <span className="font-normal text-[#919b94]">/ {test.totalRuns}</span></div><div className="mt-1 text-[10px] text-[#89938c]">{test.inconsistentCommits} mixed commits</div></div>
              <div className={`flex items-center gap-1.5 text-[11px] font-medium ${test.direction === "improving" ? "text-[#347552]" : test.direction === "worsening" ? "text-[#b14942]" : "text-[#7d8881]"}`}>{test.direction === "improving" ? <ArrowDown size={13} /> : test.direction === "worsening" ? <ArrowUp size={13} /> : <span className="h-px w-3 bg-current" />}{test.direction}</div>
              <div>{test.diagnosis ? <span className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-semibold ${test.diagnosis.aiMode === "live" ? "bg-[#edf5ef] text-[#397052]" : "bg-[#fff5df] text-[#96621f]"}`}><Sparkles size={10} />{test.diagnosis.aiMode === "live" ? "Gemini reviewed" : "Demo reviewed"}</span> : test.score > 0 ? <span className="text-[10px] text-[#8a948d]">Needs review</span> : <span className="text-[10px] text-[#9aa39d]">Not needed</span>}</div>
              <ChevronRight size={15} className="text-[#adb5af] transition group-hover:translate-x-0.5 group-hover:text-[#3d6d50]" />
            </Link>
          ))}
        </div></div>
        {visible.length === 0 && <div className="px-5 py-14 text-center text-sm text-[#7e8981]">No tests match this filter.</div>}
      </section>

      <div className="mt-4 flex items-center justify-between text-[10px] text-[#89948c]"><span>Flakiness = runs on commits with both pass and fail outcomes ÷ total runs</span><span className="mono">local-first demo state · mock-ci/v2</span></div>
      {importOpen && <ImportModal onClose={() => setImportOpen(false)} onImport={imported} />}
    </main>
  );
}

function ImportModal({ onClose, onImport }: { onClose: () => void; onImport: (log: string) => void }) {
  const [log, setLog] = useState("");
  const [error, setError] = useState<string | null>(null);
  const submit = () => {
    try { onImport(log); } catch (caught) { setError(caught instanceof Error ? caught.message : "Could not parse this log."); }
  };
  const upload = async (file?: File) => { if (file) { setLog(await file.text()); setError(null); } };
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-[#111812]/55 p-4 backdrop-blur-sm" onMouseDown={(event) => { if (event.currentTarget === event.target) onClose(); }}>
      <div className="panel w-full max-w-3xl overflow-hidden rounded-2xl shadow-2xl">
        <div className="flex items-center border-b px-5 py-4"><span className="grid h-9 w-9 place-items-center rounded-xl bg-[#e7f2e9] text-[#397453]"><GitPullRequestArrow size={17} /></span><div className="ml-3"><div className="text-sm font-semibold">Import a GitHub Actions log</div><p className="mt-0.5 text-[10px] text-[#818c84]">Jest and Playwright output supported. Nothing leaves your browser until diagnosis.</p></div><button onClick={onClose} className="ml-auto grid h-8 w-8 place-items-center rounded-lg hover:bg-[#f2f4f2]" aria-label="Close importer"><X size={16} /></button></div>
        <div className="p-5">
          <div className="mb-3 flex items-center justify-between"><span className="text-[10px] font-bold uppercase tracking-[.09em] text-[#7d8981]">CI output</span><div className="flex gap-2"><button onClick={() => { setLog(SAMPLE_GITHUB_LOG); setError(null); }} className="text-[10px] font-semibold text-[#3e7252] hover:underline">Load sample failure</button><label className="flex cursor-pointer items-center gap-1.5 text-[10px] font-semibold text-[#3e7252] hover:underline"><Upload size={11} />Upload .log<input type="file" accept=".log,.txt,text/plain" className="hidden" onChange={(event) => upload(event.target.files?.[0])} /></label></div></div>
          <textarea value={log} onChange={(event) => { setLog(event.target.value); setError(null); }} placeholder="Paste output from a GitHub Actions test step..." className="mono h-72 w-full resize-none rounded-xl border border-[#dfe5df] bg-[#17201b] p-4 text-[11px] leading-5 text-[#d7dfd9] outline-none focus:border-[#8faf98]" />
          {error && <div className="mt-2 rounded-lg border border-[#efcbc7] bg-[#fff3f1] px-3 py-2 text-[10px] text-[#a83f3b]">{error}</div>}
        </div>
        <div className="flex items-center justify-between border-t bg-[#fafbfa] px-5 py-3"><span className="text-[10px] text-[#8b958e]">Extracts test, SHA, status, duration, error, and worker context</span><button onClick={submit} className="flex h-9 items-center gap-2 rounded-lg bg-[#1e3025] px-4 text-[11px] font-semibold text-white"><FileUp size={13} />Parse and ingest</button></div>
      </div>
    </div>
  );
}

function Metric({ icon, label, value, note, tone }: { icon: React.ReactNode; label: string; value: string; note: string; tone: "red" | "amber" | "green" | "neutral" }) {
  const color = tone === "red" ? "bg-[#fff0ee] text-[#bb3d3b]" : tone === "amber" ? "bg-[#fff5e2] text-[#aa6413]" : tone === "green" ? "bg-[#edf7f0] text-[#367451]" : "bg-[#eff2f0] text-[#647168]";
  return <div className="panel flex items-center gap-3 rounded-xl px-4 py-3.5"><span className={`grid h-8 w-8 place-items-center rounded-lg ${color}`}>{icon}</span><div><div className="text-[10px] font-semibold uppercase tracking-[.08em] text-[#7b867f]">{label}</div><div className="mt-0.5 text-xl font-semibold tracking-[-.03em]">{value} <span className="text-[10px] font-normal tracking-normal text-[#8d9790]">{note}</span></div></div></div>;
}
