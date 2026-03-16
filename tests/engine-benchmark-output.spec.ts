import { expect, test } from '@playwright/test';
import { ENGINE_PROMPT_BENCHMARKS } from '../src/config/engineBenchmarkPack';
import { scoreAllBenchmarks } from './helpers/engineBenchmarkScorer';

test.describe('Engine benchmark output quality', () => {
  test('benchmark templates meet minimum output-quality scores', () => {
    const scorecards = scoreAllBenchmarks();

    for (const benchmark of ENGINE_PROMPT_BENCHMARKS) {
      const scorecard = scorecards.find((entry) => entry.benchmarkId === benchmark.id);
      expect(scorecard, `Missing scorecard for ${benchmark.id}`).toBeTruthy();
      expect(scorecard?.templateFile, `Missing template file for ${benchmark.id}`).toBeTruthy();

      for (const axisScore of scorecard!.axisScores) {
        expect(
          axisScore.score,
          `${benchmark.id} scored too low on ${axisScore.axis}: ${axisScore.reasons.join('; ')}`,
        ).toBeGreaterThanOrEqual(0.5);
      }

      expect(
        scorecard!.overallScore,
        `${benchmark.id} overall output score too low`,
      ).toBeGreaterThanOrEqual(0.65);
    }
  });
});
