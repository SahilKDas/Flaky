import type { CommitTrend, Diagnosis, Run, TestCase, TestSummary } from "./types";

export function trendForRuns(runs: Run[]): CommitTrend[] {
  const byCommit = new Map<string, Run[]>();
  [...runs].sort((a, b) => a.timestamp.localeCompare(b.timestamp)).forEach((run) => {
    byCommit.set(run.commitSha, [...(byCommit.get(run.commitSha) ?? []), run]);
  });
  return [...byCommit.entries()].map(([commitSha, commitRuns]) => {
    const failures = commitRuns.filter((run) => run.status === "fail").length;
    const mixed = failures > 0 && failures < commitRuns.length;
    return {
      commitSha,
      label: commitSha.slice(0, 5),
      score: mixed ? Math.round((failures / commitRuns.length) * 100) : 0,
      failures,
      total: commitRuns.length,
    };
  });
}

export function scoreRuns(runs: Run[]) {
  const byCommit = new Map<string, Run[]>();
  runs.forEach((run) => byCommit.set(run.commitSha, [...(byCommit.get(run.commitSha) ?? []), run]));
  const inconsistent = [...byCommit.values()].filter((items) => {
    const statuses = new Set(items.map((item) => item.status));
    return statuses.size > 1;
  });
  const affectedRuns = inconsistent.reduce((sum, items) => sum + items.length, 0);
  return {
    score: runs.length ? Math.round((affectedRuns / runs.length) * 100) : 0,
    inconsistentCommits: inconsistent.length,
  };
}

export function summarizeTest(test: TestCase, runs: Run[], diagnosis?: Diagnosis): TestSummary {
  const sorted = [...runs].sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  const { score, inconsistentCommits } = scoreRuns(sorted);
  const trend = trendForRuns(sorted);
  const recent = trend.slice(-3);
  const delta = recent.length > 1 ? recent.at(-1)!.score - recent[0].score : 0;
  return {
    ...test,
    score,
    totalRuns: sorted.length,
    failures: sorted.filter((run) => run.status === "fail").length,
    inconsistentCommits,
    latestStatus: sorted.at(-1)?.status ?? "pass",
    history: sorted.map((run) => run.status),
    trend,
    diagnosis,
    direction: delta < 0 ? "improving" : delta > 0 ? "worsening" : "steady",
  };
}
