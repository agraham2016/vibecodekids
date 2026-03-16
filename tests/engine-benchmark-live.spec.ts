import fs from 'fs';
import path from 'path';
import { expect, test } from '@playwright/test';
import { ENGINE_PROMPT_BENCHMARKS, LIVE_ENGINE_BENCHMARK_IDS } from '../src/config/engineBenchmarkPack';
import { generateOrIterateGame } from '../server/services/gameHandler.js';
import { isClaudeAvailable } from '../server/services/ai.js';
import { writeBenchmarkReportFiles } from './helpers/engineBenchmarkReport';
import { scoreBenchmarkCode, type BenchmarkScorecard } from './helpers/engineBenchmarkScorer';

const shouldRunLiveBenchmarks = process.env.RUN_LIVE_ENGINE_BENCHMARKS === '1';
const liveBenchmarks = ENGINE_PROMPT_BENCHMARKS.filter((benchmark) => LIVE_ENGINE_BENCHMARK_IDS.includes(benchmark.id));
const LIVE_REPORT_DIR = process.env.ENGINE_BENCHMARK_REPORT_DIR || path.join(process.cwd(), 'test-results', 'engine-benchmarks');
const LIVE_SCORECARDS_PATH = path.join(LIVE_REPORT_DIR, 'live-scorecards.partial.json');
const FIRST_LIVE_BENCHMARK_ID = liveBenchmarks[0]?.id || null;
const LIVE_BENCHMARK_TIMEOUT_MS = 8 * 60 * 1000;

function resetLiveBenchmarkArtifacts() {
  fs.mkdirSync(LIVE_REPORT_DIR, { recursive: true });
  fs.rmSync(LIVE_SCORECARDS_PATH, { force: true });
  fs.rmSync(path.join(LIVE_REPORT_DIR, 'live-engine-benchmark-report.json'), { force: true });
  fs.rmSync(path.join(LIVE_REPORT_DIR, 'live-engine-benchmark-report.md'), { force: true });
}

function readPersistedLiveScorecards(): BenchmarkScorecard[] {
  if (!fs.existsSync(LIVE_SCORECARDS_PATH)) {
    return [];
  }

  try {
    const raw = fs.readFileSync(LIVE_SCORECARDS_PATH, 'utf-8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function persistLiveScorecard(scorecard: BenchmarkScorecard) {
  const scorecards = readPersistedLiveScorecards();
  const nextScorecards = [...scorecards.filter((entry) => entry.benchmarkId !== scorecard.benchmarkId), scorecard].sort((a, b) =>
    a.benchmarkId.localeCompare(b.benchmarkId),
  );

  fs.mkdirSync(LIVE_REPORT_DIR, { recursive: true });
  fs.writeFileSync(LIVE_SCORECARDS_PATH, `${JSON.stringify(nextScorecards, null, 2)}\n`, 'utf-8');

  const completedBenchmarks = liveBenchmarks.filter((benchmark) =>
    nextScorecards.some((entry) => entry.benchmarkId === benchmark.id),
  );

  writeBenchmarkReportFiles(nextScorecards, {
    mode: 'live',
    outputDir: LIVE_REPORT_DIR,
    benchmarks: completedBenchmarks,
  });
}

test.describe('Live engine benchmark generation', () => {
  test.skip(!shouldRunLiveBenchmarks, 'Set RUN_LIVE_ENGINE_BENCHMARKS=1 to run live generation benchmarks.');
  test.skip(!isClaudeAvailable(), 'Claude API key is required for live generation benchmarks.');

  for (const benchmark of liveBenchmarks) {
    test(`live benchmark ${benchmark.id} meets quality thresholds`, async () => {
      test.setTimeout(LIVE_BENCHMARK_TIMEOUT_MS);
      if (benchmark.id === FIRST_LIVE_BENCHMARK_ID) {
        resetLiveBenchmarkArtifacts();
      }

      const result = await generateOrIterateGame({
        prompt: benchmark.prompt,
        currentCode: null,
        mode: 'claude',
        conversationHistory: [],
        gameConfig: null,
        image: null,
        userId: null,
        lastModelUsed: null,
      });

      expect(result.code, `No generated code returned for ${benchmark.id}`).toBeTruthy();

      const scorecard = scoreBenchmarkCode(benchmark, result.code || '', {
        templateFile: '[live-generated]',
      });
      persistLiveScorecard(scorecard);

      for (const axisScore of scorecard.axisScores) {
        expect(
          axisScore.score,
          `${benchmark.id} scored too low on ${axisScore.axis}: ${axisScore.reasons.join('; ')}`,
        ).toBeGreaterThanOrEqual(0.5);
      }

      expect(scorecard.overallScore, `${benchmark.id} overall live output score too low`).toBeGreaterThanOrEqual(0.65);
    });
  }
});
