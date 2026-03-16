import fs from 'fs';
import path from 'path';
import { ENGINE_BENCHMARK_AXES, ENGINE_PROMPT_BENCHMARKS } from '../../src/config/engineBenchmarkPack';
import type { EngineBenchmarkAxis, EngineBenchmarkCase } from '../../src/config/engineBenchmarkPack';
import { resolveEngineProfile } from '../../server/services/engineRegistry.js';
import type { AxisScore, BenchmarkScorecard } from './engineBenchmarkScorer';

export type EngineBenchmarkReportMode = 'template' | 'live';

export interface BenchmarkReportEntry {
  id: string;
  prompt: string;
  notes: string;
  expected: {
    engineId: EngineBenchmarkCase['expectedEngineId'];
    genreFamily: EngineBenchmarkCase['expectedGenreFamily'];
    starterTemplateId?: EngineBenchmarkCase['expectedStarterTemplateId'];
  };
  actual: {
    engineId: string;
    genreFamily: string;
    starterTemplateId: string;
    templateFile: string | null;
  };
  overallScore: number;
  passed: boolean;
  failedAxes: AxisScore[];
  axisScores: AxisScore[];
}

export interface BenchmarkReport {
  generatedAt: string;
  mode: EngineBenchmarkReportMode;
  benchmarkCount: number;
  passCount: number;
  failCount: number;
  averageScore: number;
  axisAverages: Record<EngineBenchmarkAxis, number | null>;
  entries: BenchmarkReportEntry[];
}

function roundScore(score: number): number {
  return Number(score.toFixed(2));
}

function didEntryPass(scorecard: BenchmarkScorecard): boolean {
  return scorecard.overallScore >= 0.65 && scorecard.axisScores.every((axis) => axis.score >= 0.5);
}

export function buildBenchmarkReport(
  scorecards: BenchmarkScorecard[],
  options: {
    mode: EngineBenchmarkReportMode;
    benchmarks?: EngineBenchmarkCase[];
  },
): BenchmarkReport {
  const benchmarks = options.benchmarks || ENGINE_PROMPT_BENCHMARKS;
  const scorecardById = new Map(scorecards.map((scorecard) => [scorecard.benchmarkId, scorecard]));

  const entries = benchmarks
    .map((benchmark) => {
      const scorecard = scorecardById.get(benchmark.id);
      if (!scorecard) {
        throw new Error(`Missing scorecard for benchmark ${benchmark.id}`);
      }

      const actualProfile = resolveEngineProfile({ prompt: benchmark.prompt });
      const passed = didEntryPass(scorecard);

      return {
        id: benchmark.id,
        prompt: benchmark.prompt,
        notes: benchmark.notes,
        expected: {
          engineId: benchmark.expectedEngineId,
          genreFamily: benchmark.expectedGenreFamily,
          starterTemplateId: benchmark.expectedStarterTemplateId,
        },
        actual: {
          engineId: actualProfile.engineId,
          genreFamily: actualProfile.genreFamily,
          starterTemplateId: scorecard.starterTemplateId,
          templateFile: scorecard.templateFile,
        },
        overallScore: roundScore(scorecard.overallScore),
        passed,
        failedAxes: scorecard.axisScores.filter((axis) => axis.score < 0.5),
        axisScores: scorecard.axisScores.map((axis) => ({
          ...axis,
          score: roundScore(axis.score),
        })),
      };
    })
    .sort((left, right) => right.overallScore - left.overallScore);

  const passCount = entries.filter((entry) => entry.passed).length;
  const benchmarkCount = entries.length;
  const averageScore = benchmarkCount
    ? roundScore(entries.reduce((total, entry) => total + entry.overallScore, 0) / benchmarkCount)
    : 0;

  const axisAverages = Object.keys(ENGINE_BENCHMARK_AXES).reduce(
    (acc, axisKey) => {
      const axis = axisKey as EngineBenchmarkAxis;
      const scores = entries
        .flatMap((entry) => entry.axisScores)
        .filter((entryAxis) => entryAxis.axis === axis)
        .map((entryAxis) => entryAxis.score);

      acc[axis] = scores.length ? roundScore(scores.reduce((total, score) => total + score, 0) / scores.length) : null;
      return acc;
    },
    {} as Record<EngineBenchmarkAxis, number | null>,
  );

  return {
    generatedAt: new Date().toISOString(),
    mode: options.mode,
    benchmarkCount,
    passCount,
    failCount: benchmarkCount - passCount,
    averageScore,
    axisAverages,
    entries,
  };
}

export function formatBenchmarkReportMarkdown(report: BenchmarkReport): string {
  const summaryLines = [
    '# Engine Benchmark Report',
    '',
    `- Mode: ${report.mode}`,
    `- Generated: ${report.generatedAt}`,
    `- Benchmarks: ${report.benchmarkCount}`,
    `- Passed: ${report.passCount}`,
    `- Failed: ${report.failCount}`,
    `- Average overall score: ${report.averageScore.toFixed(2)}`,
    '',
    '## Axis Averages',
    '',
    '| Axis | Average |',
    '| --- | --- |',
    ...Object.keys(ENGINE_BENCHMARK_AXES).map((axis) => {
      const average = report.axisAverages[axis as EngineBenchmarkAxis];
      return `| \`${axis}\` | ${average === null ? 'n/a' : average.toFixed(2)} |`;
    }),
    '',
    '## Benchmarks',
    '',
    '| Benchmark | Overall | Status | Actual starter | Template |',
    '| --- | --- | --- | --- | --- |',
    ...report.entries.map(
      (entry) =>
        `| \`${entry.id}\` | ${entry.overallScore.toFixed(2)} | ${entry.passed ? 'PASS' : 'FAIL'} | \`${entry.actual.starterTemplateId}\` | \`${entry.actual.templateFile || 'n/a'}\` |`,
    ),
  ];

  const failingEntries = report.entries.filter((entry) => !entry.passed);
  if (!failingEntries.length) {
    summaryLines.push('', '## Failures', '', 'All benchmark entries passed the current thresholds.');
    return summaryLines.join('\n');
  }

  summaryLines.push('', '## Failures', '');
  for (const entry of failingEntries) {
    summaryLines.push(`### ${entry.id}`);
    summaryLines.push(`- Prompt: ${entry.prompt}`);
    summaryLines.push(`- Expected: \`${entry.expected.genreFamily}\` / \`${entry.expected.starterTemplateId || 'generic'}\``);
    summaryLines.push(`- Actual: \`${entry.actual.genreFamily}\` / \`${entry.actual.starterTemplateId}\``);
    summaryLines.push(`- Overall: ${entry.overallScore.toFixed(2)}`);
    for (const axis of entry.failedAxes) {
      summaryLines.push(`- ${axis.axis}: ${axis.score.toFixed(2)} (${axis.reasons.join('; ')})`);
    }
    summaryLines.push('');
  }

  return summaryLines.join('\n');
}

export function writeBenchmarkReportFiles(
  scorecards: BenchmarkScorecard[],
  options: {
    mode: EngineBenchmarkReportMode;
    outputDir: string;
    benchmarks?: EngineBenchmarkCase[];
  },
): { report: BenchmarkReport; jsonPath: string; markdownPath: string } {
  const report = buildBenchmarkReport(scorecards, {
    mode: options.mode,
    benchmarks: options.benchmarks,
  });
  const outputDir = options.outputDir;
  fs.mkdirSync(outputDir, { recursive: true });

  const jsonPath = path.join(outputDir, `${options.mode}-engine-benchmark-report.json`);
  const markdownPath = path.join(outputDir, `${options.mode}-engine-benchmark-report.md`);

  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf-8');
  fs.writeFileSync(markdownPath, `${formatBenchmarkReportMarkdown(report)}\n`, 'utf-8');

  return { report, jsonPath, markdownPath };
}
