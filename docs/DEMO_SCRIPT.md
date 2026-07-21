# Flaky 90-second demo script

## 0:00–0:12 — The problem

“CI dashboards tell us a test failed twice. They rarely tell us whether it is a regression, a retry artifact, or a real non-deterministic test. Flaky starts with a stricter signal: the same commit SHA produced both pass and fail.”

Show the ranked dashboard, sparklines, and score formula.

## 0:12–0:28 — Open a case

Open **calculates tax for California address**.

“This test flipped on two commits. Flaky keeps the source, raw failure, run order, worker context, duration, and commit trend together in one case file.”

Point to the live Gemini status at the top and the `ECONNRESET` error.

## 0:28–0:52 — Work the case

Click **Diagnose case**.

“Gemini receives only the test source and normalized evidence. It classifies the likely root cause, gives confidence, and—more importantly—shows the evidence chain. Here it sees a real sandbox endpoint, network resets, and same-SHA flips.”

Point to **Before / Proposed** and click **Copy fix**.

## 0:52–1:05 — Useful artifact

Click **Generate quarantine PR description**.

“Because the external service cannot be fixed inside this test immediately, Flaky recommends a temporary quarantine with an owner and a measurable exit criterion—not a permanent skip.”

## 1:05–1:20 — Real CI-shaped input

Return to the dashboard. Click **Import CI log**, then **Load sample failure**, then **Parse and ingest**.

“No OAuth setup is required for the demo. Flaky extracts the SHA, test, status, duration, error, and parallel-worker context from ordinary GitHub Actions output.”

## 1:20–1:30 — Close

Click **Ingest new run**.

“The score and trend update immediately. Flaky turns flaky tests from a retry habit into an evidence-backed engineering queue.”

## Backup path

If Gemini is temporarily unavailable, show the red status and retryable error. Do not claim the deterministic investigator is Gemini. Remove the API key only if you deliberately want to demonstrate the clearly labeled offline mode.
