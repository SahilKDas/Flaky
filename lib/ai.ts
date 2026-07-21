import type { AIStatus, Diagnosis, QuarantineArtifact, Run, TestCase } from "./types";

type GeminiResponse = {
  candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
};

type DiagnosisPayload = Pick<Diagnosis, "rootCause" | "confidence" | "suggestedFix" | "quarantineRecommended" | "reasoning" | "signals">;

export const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-3.5-flash";
const demoFallbackEnabled = process.env.AI_DEMO_FALLBACK === "true";

export class AIServiceError extends Error {
  constructor(message: string, public readonly status = 503) {
    super(message);
    this.name = "AIServiceError";
  }
}

function apiKey() {
  return process.env.GEMINI_API_KEY?.trim() || null;
}

async function geminiFetch(path: string, init?: RequestInit) {
  const key = apiKey();
  if (!key) throw new AIServiceError("Gemini is not configured. Add GEMINI_API_KEY or enable explicit demo mode.", 503);
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", "x-goog-api-key": key, ...init?.headers },
    signal: AbortSignal.timeout(20_000),
  });
  if (!response.ok) {
    const body = await response.json().catch(() => null) as { error?: { message?: string } } | null;
    const detail = body?.error?.message?.slice(0, 220) || `HTTP ${response.status}`;
    throw new AIServiceError(`Gemini request failed: ${detail}`, response.status >= 500 ? 503 : 502);
  }
  return response;
}

async function callGemini(prompt: string): Promise<string> {
  const response = await geminiFetch(`models/${GEMINI_MODEL}:generateContent`, {
    method: "POST",
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.15, responseMimeType: "application/json" },
    }),
  });
  const data = (await response.json()) as GeminiResponse;
  const text = data.candidates?.[0]?.content?.parts?.map((part) => part.text ?? "").join("");
  if (!text) throw new AIServiceError("Gemini returned an empty response.", 502);
  return text;
}

function extractJson(raw: string) {
  return raw.replace(/^```json\s*/i, "").replace(/\s*```$/, "").trim();
}

function fallbackDiagnosis(test: TestCase, runs: Run[]): DiagnosisPayload {
  const failures = runs.filter((run) => run.status === "fail");
  const variants: Record<TestCase["category"], DiagnosisPayload> = {
    timing: {
      rootCause: "Race condition / timing assumption",
      confidence: 0.94,
      quarantineRecommended: false,
      signals: [
        "The assertion runs after a fixed 500 ms delay instead of waiting for the UI state.",
        `${failures.length} failures cluster at higher durations while the same commit also passes.`,
        "Failure output shows the confirmation element is present but still hidden.",
      ],
      reasoning: "A fixed sleep assumes the backend response and render will complete inside one timing window. Under worker load that assumption stops holding, which explains why identical code passes on a later retry. This is directly fixable by synchronizing on the observable state.",
      suggestedFix: `- await page.waitForTimeout(500);
+ await expect(page.getByText('Order confirmed')).toBeVisible({ timeout: 5_000 });
+ await expect(page.getByTestId('order-status')).toHaveAttribute('data-state', 'complete');`,
    },
    "shared-state": {
      rootCause: "Test-order dependency from shared mutable fixture",
      confidence: 0.97,
      quarantineRecommended: false,
      signals: [
        "Every failing run records 'admin can update settings' as the previous test.",
        "The preceding test mutates sharedFixtures.member.role in place.",
        "The expected 403 becomes 200, consistent with leaked admin permissions.",
      ],
      reasoning: "The module-scoped user object survives between tests. When the admin test runs first, it promotes the same object that the member test later reuses. Fresh per-test fixtures remove the order coupling rather than hiding it with retries.",
      suggestedFix: `- const user = sharedFixtures.member;
+ let user: User;
+ beforeEach(() => {
+   user = structuredClone(sharedFixtures.member);
+ });

  test('admin can update settings', async () => {
-   user.role = 'admin';
+   const admin = { ...user, role: 'admin' };
  });`,
    },
    network: {
      rootCause: "Uncontrolled external service dependency",
      confidence: 0.91,
      quarantineRecommended: true,
      signals: [
        "Failures are ECONNRESET errors before an application response is received.",
        "The test calls a public sandbox endpoint from the test body.",
        "Pass/fail flips occur on identical commits with no source change.",
      ],
      reasoning: "This test measures availability of the TaxJar sandbox as well as your tax behavior. CI cannot control that network boundary. Replace it with a contract fixture and keep one separately scheduled provider smoke test. Quarantine is justified until the call is isolated because retries would only conceal the dependency.",
      suggestedFix: `+ server.use(
+  http.post('https://sandbox.taxjar.com/v2/taxes', () =>
+    HttpResponse.json({ tax: { amount_to_collect: 8.25 } })
+  )
+ );
  const response = await calculateTax(californiaOrder);`,
    },
    resource: {
      rootCause: "Parallel worker resource collision",
      confidence: 0.96,
      quarantineRecommended: false,
      signals: [
        "All failures report EADDRINUSE on the same hard-coded port 4100.",
        "Failures occur only in runs marked as parallel.",
        "The listener owns a process-wide resource rather than a per-test resource.",
      ],
      reasoning: "Parallel workers compete for port 4100. Letting the OS assign an available port makes each test instance independent and preserves parallel execution.",
      suggestedFix: `- await server.listen(4100);
- await sendTestWebhook('http://localhost:4100/hook');
+ await server.listen(0);
+ const { port } = server.address() as AddressInfo;
+ await sendTestWebhook(\`http://localhost:\${port}/hook\`);`,
    },
    stable: {
      rootCause: "No non-determinism detected",
      confidence: 0.88,
      quarantineRecommended: false,
      signals: ["Outcomes are consistent within each commit.", "No repeated transient error signature is present."],
      reasoning: "The available history does not meet the same-commit outcome-flip criterion. A deterministic failure on one commit is more likely a regression than flakiness.",
      suggestedFix: "// No flaky-test fix recommended.\n// Investigate the failed commit as a normal regression.",
    },
  };
  return variants[test.category];
}

function demoDiagnosis(test: TestCase, runs: Run[]): Diagnosis {
  return {
    ...fallbackDiagnosis(test, runs),
    id: `diag-${test.id}-${Date.now()}`,
    testCaseId: test.id,
    createdAt: new Date().toISOString(),
    model: "Deterministic demo investigator",
    aiMode: "demo",
  };
}

export async function getAIStatus(): Promise<AIStatus> {
  const checkedAt = new Date().toISOString();
  if (!apiKey()) return { configured: false, mode: "demo", model: GEMINI_MODEL, detail: "No API key; explicit demo investigator is active.", checkedAt };
  try {
    await geminiFetch(`models/${GEMINI_MODEL}`, { method: "GET" });
    return { configured: true, mode: "live", model: GEMINI_MODEL, detail: "API key and model access verified.", checkedAt };
  } catch (error) {
    return { configured: true, mode: "unavailable", model: GEMINI_MODEL, detail: error instanceof Error ? error.message : "Gemini health check failed.", checkedAt };
  }
}

export async function diagnoseTest(test: TestCase, runs: Run[]): Promise<Diagnosis> {
  if (!apiKey()) return demoDiagnosis(test, runs);
  const compactRuns = runs.map(({ commitSha, status, durationMs, errorOutput, ranInParallel, orderIndex, previousTest }) => ({ commitSha, status, durationMs, errorOutput, ranInParallel, orderIndex, previousTest }));
  const prompt = `You are Flaky, a senior CI test reliability investigator. Diagnose only from supplied evidence.

Classify the likely root cause as one of: race condition/timing issue, test-order dependency, external network/service dependency, shared/leftover state, resource contention, or no flakiness detected.

Return ONLY valid JSON matching:
{"rootCause":"string","confidence":0.0,"suggestedFix":"unified diff or code snippet","quarantineRecommended":false,"reasoning":"evidence-based paragraph","signals":["specific signal"]}

Rules: same commit with different outcomes is the core flakiness signal. Give a concrete fix. Recommend quarantine only when the cause cannot be safely removed immediately. Do not invent facts.

TEST: ${test.name}\nFILE: ${test.filePath}\nSOURCE:\n${test.sourceSnippet}\nRUNS:\n${JSON.stringify(compactRuns, null, 2)}`;
  try {
    const payload = JSON.parse(extractJson(await callGemini(prompt))) as DiagnosisPayload;
    return {
      ...payload,
      confidence: Math.max(0, Math.min(1, Number(payload.confidence))),
      id: `diag-${test.id}-${Date.now()}`,
      testCaseId: test.id,
      createdAt: new Date().toISOString(),
      model: GEMINI_MODEL,
      aiMode: "live",
    };
  } catch (error) {
    console.error("Gemini diagnosis failed:", error);
    if (demoFallbackEnabled) return demoDiagnosis(test, runs);
    throw error instanceof AIServiceError ? error : new AIServiceError("Gemini diagnosis could not be completed. Retry the request.");
  }
}

function quarantineFallback(test: TestCase, runs: Run[], diagnosis: Diagnosis) {
  return `## Quarantine: \`${test.name}\`

### Why this is being quarantined
This test is non-deterministic on identical commit SHAs. Flaky classified the likely cause as **${diagnosis.rootCause}** (${Math.round(diagnosis.confidence * 100)}% confidence).

${diagnosis.reasoning}

### Evidence
${diagnosis.signals.map((signal) => `- ${signal}`).join("\n")}
- Observed ${runs.filter((run) => run.status === "fail").length} failures across ${runs.length} recent runs.

### Remediation tried / proposed
\`\`\`diff
${diagnosis.suggestedFix}
\`\`\`

### Exit criteria
- Remove or isolate the non-deterministic dependency.
- Re-enable after 20 consecutive CI runs with no same-commit outcome flips.
- Owner: ${test.owner}

> Generated by Flaky - temporary quarantine, not a permanent skip.`;
}

export async function generateQuarantineDescription(test: TestCase, runs: Run[], diagnosis: Diagnosis): Promise<QuarantineArtifact> {
  const fallback = quarantineFallback(test, runs, diagnosis);
  if (!apiKey()) return { markdown: fallback, aiMode: "demo", model: "Deterministic demo investigator" };
  const prompt = `Create a concise ready-to-paste GitHub PR body for temporarily quarantining a flaky test. Include why, concrete evidence, proposed remediation, owner, and measurable exit criteria. Return JSON as {"markdown":"..."}. Do not overstate evidence.\n\nTest: ${JSON.stringify(test)}\nDiagnosis: ${JSON.stringify(diagnosis)}\nRun count: ${runs.length}; failures: ${runs.filter((run) => run.status === "fail").length}`;
  try {
    const result = JSON.parse(extractJson(await callGemini(prompt))) as { markdown: string };
    return { markdown: result.markdown || fallback, aiMode: "live", model: GEMINI_MODEL };
  } catch (error) {
    console.error("Gemini quarantine generation failed:", error);
    if (demoFallbackEnabled) return { markdown: fallback, aiMode: "demo", model: "Deterministic demo investigator" };
    throw error instanceof AIServiceError ? error : new AIServiceError("Gemini could not generate the PR description. Retry the request.");
  }
}
