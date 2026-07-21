import { summarizeTest } from "./analytics";
import { createSeedStore } from "./seed";

export function getSeedStore() {
  return createSeedStore();
}

export function getSeedSummaries() {
  const store = getSeedStore();
  return store.testCases
    .map((test) => summarizeTest(test, store.runs.filter((run) => run.testCaseId === test.id)))
    .sort((a, b) => b.score - a.score || b.failures - a.failures);
}

export function getSeedDetail(id: string) {
  const store = getSeedStore();
  const test = store.testCases.find((item) => item.id === id);
  if (!test) return null;
  const runs = store.runs.filter((run) => run.testCaseId === id).sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  return { test, runs, summary: summarizeTest(test, runs) };
}
