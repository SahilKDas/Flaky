import type { Run, TestCase, TestStatus } from "./types";

export type ParsedCIImport = {
  test: TestCase;
  run: Run;
  matchedExisting: boolean;
  evidence: string[];
};

function slug(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 48) || "imported-test";
}

function inferCategory(log: string): TestCase["category"] {
  if (/ECONNRESET|ENOTFOUND|ETIMEDOUT|fetch failed|network/i.test(log)) return "network";
  if (/EADDRINUSE|address already in use|worker|parallel/i.test(log)) return "resource";
  if (/previous test|order dependent|shared fixture|expected 200[\s\S]*403/i.test(log)) return "shared-state";
  if (/TimeoutError|timed out|waitForTimeout|not visible|exceeded[\s\S]*ms/i.test(log)) return "timing";
  return "stable";
}

export function parseGitHubActionsLog(log: string, existingTests: TestCase[]): ParsedCIImport {
  const clean = log.replace(/\r/g, "").trim();
  if (!clean) throw new Error("Paste a GitHub Actions, Jest, or Playwright log first.");

  const sha = clean.match(/(?:GITHUB_SHA|commit|sha)\s*[:=]\s*([0-9a-f]{7,40})/i)?.[1]?.slice(0, 7)
    ?? clean.match(/\b[0-9a-f]{7,40}\b/i)?.[0]?.slice(0, 7)
    ?? "imported";
  const failed = /(^|\n)\s*(FAIL|FAILED|✕|×)|##\[error\]|AssertionError|TimeoutError|Error:/im.test(clean);
  const status: TestStatus = failed ? "fail" : "pass";
  const filePath = clean.match(/(?:FAIL|PASS)\s+([^\s]+\.(?:spec|test)\.[jt]sx?)/i)?.[1]
    ?? clean.match(/((?:tests?|__tests__)\/[\w./-]+\.[jt]sx?)/i)?.[1]
    ?? "tests/imported/ci-log.spec.ts";
  const name = clean.match(/^\s*[●]\s+(.+)$/m)?.[1]?.trim()
    ?? clean.match(/^\s*(?:✕|×|✓|√)\s+(.+?)(?:\s+\(\d+\s*m?s\))?\s*$/m)?.[1]?.trim()
    ?? clean.match(/(?:test|it)\(['"]([^'"]+)['"]/i)?.[1]
    ?? filePath.split("/").at(-1)?.replace(/\.(spec|test)\.[jt]sx?$/, "")
    ?? "Imported CI test";
  const durationRaw = clean.match(/(?:duration|time)\s*[:=]\s*(\d+)\s*ms/i)?.[1]
    ?? clean.match(/\((\d+)\s*ms\)/i)?.[1];
  const durationMs = durationRaw ? Number(durationRaw) : failed ? 1450 : 620;
  const parallel = /parallel|worker\s*\d+|shard/i.test(clean);
  const orderIndex = Number(clean.match(/(?:order|position)\s*[:=#]\s*(\d+)/i)?.[1] ?? 0);
  const matched = existingTests.find((test) => test.name.toLowerCase() === name.toLowerCase() || test.filePath.toLowerCase() === filePath.toLowerCase());
  const category = matched?.category ?? inferCategory(clean);
  const test: TestCase = matched ?? {
    id: `imported-${slug(name)}`,
    name,
    filePath,
    sourceSnippet: `// Source was not included in the CI artifact.\n// Connect the repository or paste the test body before diagnosis.\ntest('${name.replace(/'/g, "\\'")}', async () => {\n  // imported from GitHub Actions\n});`,
    category,
    owner: "@unassigned",
  };
  const errorLines = clean.split("\n").filter((line) => /error|expected|received|timeout|ECONN|EADDR|at\s+\S+:/i.test(line)).slice(0, 10);
  const run: Run = {
    id: `${test.id}-import-${Date.now()}`,
    testCaseId: test.id,
    commitSha: sha,
    timestamp: new Date().toISOString(),
    status,
    durationMs,
    errorOutput: status === "fail" ? (errorLines.join("\n") || clean.slice(0, 1800)) : null,
    ranInParallel: parallel,
    orderIndex,
    previousTest: clean.match(/previous test\s*[:=]\s*["']?([^\n"']+)/i)?.[1]?.trim(),
  };
  return {
    test,
    run,
    matchedExisting: Boolean(matched),
    evidence: [
      `Detected ${status.toUpperCase()} outcome`,
      `Commit ${sha}`,
      `${parallel ? "Parallel worker context detected" : "No parallel worker marker"}`,
      `Classified metadata pattern as ${category}`,
    ],
  };
}

export const SAMPLE_GITHUB_LOG = `Run npm test -- checkout.spec.ts
GITHUB_SHA=7b15e4a891c03f
Worker 3 / parallel

FAIL tests/e2e/checkout.spec.ts
  ✕ checkout shows success toast (1812 ms)

TimeoutError: expect(locator).toBeVisible()
Locator: getByText('Order confirmed')
Expected: visible
Received: hidden
Timeout: 500ms
  at tests/e2e/checkout.spec.ts:4:56

##[error]Process completed with exit code 1.`;
