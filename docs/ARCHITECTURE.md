# Architecture and design decisions

## Data flow

1. Seeded CI data or an imported log becomes normalized `TestCase` and `Run` records.
2. Analytics group each test's runs by commit SHA.
3. Mixed-outcome commits contribute to the flakiness score and trend.
4. The browser sends the selected source and normalized runs to a Next.js route.
5. `lib/ai.ts` prompts Gemini 3.5 Flash for structured JSON.
6. The browser stores the diagnosis with explicit `live` or `demo` provenance.

## Why browser-local persistence

The first prototype wrote a JSON file from the Next.js server. That is convenient locally but unreliable on serverless hosts where function filesystems are ephemeral or read-only. Flaky now treats the seed as immutable and stores judge mutations in `localStorage`.

This gives the hackathon build:

- zero database setup;
- reliable deployed ingest and reset flows;
- no cross-judge data contamination;
- a clean seam for replacing the demo store with SQLite or a hosted database later.

## Truthful AI provenance

AI output has an `aiMode` field:

- `live`: returned by the configured Gemini model;
- `demo`: returned by the deterministic offline investigator when no key is configured.

If a key exists and the Gemini call fails, the API returns an error. Demo fallback occurs after a failed configured request only when `AI_DEMO_FALLBACK=true` is explicitly set.

The global health badge calls `/api/ai/status`, which verifies access to the configured model without exposing the API key.

## Security boundaries

- The Gemini key is server-only and never sent to the browser.
- Imported logs remain in browser storage until the user asks for diagnosis.
- The diagnosis prompt contains the selected test source and run evidence only.
- API error messages are bounded and never contain the key.

## Known production extensions

- GitHub App installation and artifact download.
- Repository source retrieval at the recorded commit SHA.
- Organization-level persistence and ownership rules.
- Feedback signals for accepted fixes and post-fix score improvement.
