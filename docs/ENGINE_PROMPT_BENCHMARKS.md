# Engine Prompt Benchmarks

This benchmark pack is the quick regression set for Vibe engine selection quality.

Source of truth:
- `src/config/engineBenchmarkPack.ts`

Current purpose:
- Make sure each exposed engine family has at least one benchmark prompt
- Catch starter-selection regressions when prompt matching changes
- Give us a reusable list for manual generated-output review

Recommended review axes:
- `family-fit`: does the game keep the right core loop for the requested family?
- `starter-fit`: did the system choose the right starter shape instead of a generic fallback?
- `hud-clarity`: are score, progress, and objectives readable during play?
- `camera-readability`: is the play space understandable for the chosen engine?
- `restart-flow`: is retry/replay fast and kid-friendly?

Current automated checks:
- `tests/engine-benchmark-pack.spec.ts`
- `tests/engine-benchmark-output.spec.ts`
- `tests/engine-benchmark-report.spec.ts`
- `tests/engine-benchmark-live.spec.ts` (opt-in, real AI generation)
- `tests/engine-integrity.spec.ts`

Suggested workflow when adding or tuning engine logic:
1. Update `src/config/engineBenchmarkPack.ts` if the exposed starter surface changes.
2. Run `npx playwright test "tests/engine-benchmark-pack.spec.ts"`.
3. Run `npx playwright test "tests/engine-benchmark-output.spec.ts"`.
4. Run `npx playwright test "tests/engine-benchmark-report.spec.ts"`.
5. Run `npx playwright test "tests/engine-integrity.spec.ts"`.
6. For any changed families, manually generate 1-2 games from the benchmark prompts and review the output using the axes above.

Readable report output:
- Run `npm run benchmark:report`
- Artifacts are written to `test-results/engine-benchmarks/`
- The report emits both JSON and Markdown so CI can upload the same folder as an artifact

Optional live benchmark run:
- Set `RUN_LIVE_ENGINE_BENCHMARKS=1`
- Ensure `ANTHROPIC_API_KEY` is configured
- Run `npx playwright test "tests/engine-benchmark-live.spec.ts"`
- Live runs also write a JSON and Markdown report to `test-results/engine-benchmarks/`
