export type TestStatus = "pass" | "fail";

export type TestCase = {
  id: string;
  name: string;
  filePath: string;
  sourceSnippet: string;
  category: "timing" | "shared-state" | "network" | "resource" | "stable";
  owner: string;
};

export type Run = {
  id: string;
  testCaseId: string;
  commitSha: string;
  timestamp: string;
  status: TestStatus;
  durationMs: number;
  errorOutput: string | null;
  ranInParallel: boolean;
  orderIndex: number;
  previousTest?: string;
};

export type Diagnosis = {
  id: string;
  testCaseId: string;
  rootCause: string;
  confidence: number;
  suggestedFix: string;
  quarantineRecommended: boolean;
  reasoning: string;
  signals: string[];
  createdAt: string;
  model: string;
  aiMode: "live" | "demo";
};

export type AIStatus = {
  configured: boolean;
  mode: "live" | "demo" | "unavailable";
  model: string;
  detail: string;
  checkedAt: string;
};

export type QuarantineArtifact = {
  markdown: string;
  aiMode: "live" | "demo";
  model: string;
};

export type Store = {
  testCases: TestCase[];
  runs: Run[];
  diagnoses: Diagnosis[];
};

export type CommitTrend = {
  commitSha: string;
  label: string;
  score: number;
  failures: number;
  total: number;
};

export type TestSummary = TestCase & {
  score: number;
  totalRuns: number;
  failures: number;
  inconsistentCommits: number;
  latestStatus: TestStatus;
  history: TestStatus[];
  trend: CommitTrend[];
  diagnosis?: Diagnosis;
  direction: "improving" | "worsening" | "steady";
};
