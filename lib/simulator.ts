import type { Run, Store } from "./types";

export function createSimulatedRun(store: Store, testCaseId?: string): Run {
  const candidates = store.testCases.filter((test) => test.category !== "stable");
  const test = store.testCases.find((item) => item.id === testCaseId) ?? candidates[Math.floor(Math.random() * candidates.length)];
  const prior = store.runs.filter((run) => run.testCaseId === test.id).sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  const commitSha = prior.at(-1)?.commitSha ?? "7b15e4a";
  const failChance = test.category === "timing" ? 0.38 : test.category === "network" ? 0.3 : test.category === "resource" ? 0.45 : 0.34;
  const status = Math.random() < failChance ? "fail" : "pass";
  const errorMap: Record<string, string> = {
    timing: "TimeoutError: Order confirmed was not visible after 500ms\nWorker CPU: 94%",
    "shared-state": "AssertionError: expected 200 to equal 403\nPrevious test: admin can update settings",
    network: "FetchError: read ECONNRESET from sandbox.taxjar.com",
    resource: "Error: listen EADDRINUSE: address already in use :::4100",
  };
  return {
    id: `${test.id}-demo-${Date.now()}`,
    testCaseId: test.id,
    commitSha,
    timestamp: new Date().toISOString(),
    status,
    durationMs: Math.round(500 + Math.random() * 2800 + (status === "fail" ? 600 : 0)),
    errorOutput: status === "fail" ? errorMap[test.category] : null,
    ranInParallel: Math.random() > 0.25,
    orderIndex: Math.floor(2 + Math.random() * 22),
    previousTest: test.category === "shared-state" ? "admin can update settings" : undefined,
  };
}
