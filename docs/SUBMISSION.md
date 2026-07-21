# Hackathon submission copy

## One-line pitch

Flaky is a root-cause detective that turns same-commit CI outcome flips into evidence-backed fixes and quarantine artifacts.

## Problem

Engineering teams already know which tests retry. What costs time is discovering why: a fixed timing assumption, leaked fixture state, an uncontrolled service, or parallel workers fighting over a resource. Retry dashboards expose symptoms but leave the investigation to an engineer.

## Solution

Flaky detects non-determinism using same-SHA outcome flips, ranks cases over time, and gives Gemini the actual test source, error output, and execution metadata. The result includes a root-cause classification, confidence, evidence chain, before/proposed fix, and—when appropriate—a temporary quarantine PR body with an exit criterion.

## Why Gemini matters

The useful work is not summarizing a log. Gemini connects weak signals across modalities of engineering evidence: code patterns, repeated error signatures, run ordering, parallel execution, durations, and commit-level outcomes. Flaky constrains the model with normalized evidence and requires structured reasoning plus a concrete action.

## Developer Tools fit

Flaky sits between CI failure collection and issue remediation. It produces artifacts engineers can act on immediately: a patch, a quarantine justification, an owner, and a measurable path back into the suite.

## Built during the hackathon

- Next.js App Router and TypeScript
- Tailwind CSS
- Gemini 3.5 Flash reasoning boundary
- Zero-setup browser-local data store
- GitHub Actions/Jest/Playwright log importer
- Nine realistic test cases and 162 CI runs

## Demo URL

Add the deployed URL here before submission.

## Repository

https://github.com/SahilKDas/Flaky
