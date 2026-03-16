import fs from 'fs';
import path from 'path';
import { expect, test } from '@playwright/test';
import { ENGINE_PROMPT_BENCHMARKS } from '../src/config/engineBenchmarkPack';
import { writeBenchmarkReportFiles } from './helpers/engineBenchmarkReport';
import { scoreAllBenchmarks } from './helpers/engineBenchmarkScorer';

test.describe('Engine benchmark report output', () => {
  test('writes readable benchmark report artifacts', () => {
    const scorecards = scoreAllBenchmarks();
    const outputDir =
      process.env.ENGINE_BENCHMARK_REPORT_DIR || path.join(process.cwd(), 'test-results', 'engine-benchmarks');

    const { report, jsonPath, markdownPath } = writeBenchmarkReportFiles(scorecards, {
      mode: 'template',
      outputDir,
    });

    expect(report.benchmarkCount).toBe(ENGINE_PROMPT_BENCHMARKS.length);
    expect(fs.existsSync(jsonPath), `Missing JSON report at ${jsonPath}`).toBe(true);
    expect(fs.existsSync(markdownPath), `Missing markdown report at ${markdownPath}`).toBe(true);
    expect(fs.readFileSync(markdownPath, 'utf-8')).toContain('# Engine Benchmark Report');
  });
});
