import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { ENGINE_PROMPT_BENCHMARKS, type EngineBenchmarkAxis, type EngineBenchmarkCase } from '../../src/config/engineBenchmarkPack';
import { getFamilyProfile, resolveEngineProfile } from '../../server/services/engineRegistry.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const TEMPLATE_DIR = path.join(__dirname, '..', '..', 'server', 'templates');

export interface AxisScore {
  axis: EngineBenchmarkAxis;
  score: number;
  reasons: string[];
}

export interface BenchmarkScorecard {
  benchmarkId: string;
  templateFile: string | null;
  starterTemplateId: string;
  overallScore: number;
  axisScores: AxisScore[];
}

function hasAny(code: string, patterns: RegExp[]): boolean {
  return patterns.some((pattern) => pattern.test(code));
}

function countMatches(code: string, patterns: RegExp[]): number {
  return patterns.reduce((count, pattern) => count + (pattern.test(code) ? 1 : 0), 0);
}

function scoreFamilyFit(benchmark: EngineBenchmarkCase, templateCode: string): AxisScore {
  const profile = resolveEngineProfile({ prompt: benchmark.prompt });
  const followUpProfile = resolveEngineProfile({ prompt: 'make it faster', currentCode: templateCode });
  const familyProfile = getFamilyProfile(benchmark.expectedGenreFamily);
  let score = 0;
  const reasons: string[] = [];

  if (profile.genreFamily === benchmark.expectedGenreFamily) {
    score += 0.6;
    reasons.push('resolved expected family');
  }

  if (followUpProfile.genreFamily === benchmark.expectedGenreFamily) {
    score += 0.25;
    reasons.push('follow-up edit stays in family');
  }

  if (familyProfile?.starterTemplateIds.includes(profile.starterTemplateId)) {
    score += 0.15;
    reasons.push('starter belongs to expected family');
  }

  return { axis: 'family-fit', score: Math.min(1, score), reasons };
}

function scoreStarterFit(benchmark: EngineBenchmarkCase): AxisScore {
  const profile = resolveEngineProfile({ prompt: benchmark.prompt });
  const familyProfile = getFamilyProfile(benchmark.expectedGenreFamily);
  const reasons: string[] = [];

  if (benchmark.expectedStarterTemplateId) {
    if (profile.starterTemplateId === benchmark.expectedStarterTemplateId) {
      reasons.push('resolved exact expected starter');
      return { axis: 'starter-fit', score: 1, reasons };
    }

    if (familyProfile?.starterTemplateIds.includes(profile.starterTemplateId)) {
      reasons.push('resolved family starter but not preferred benchmark starter');
      return { axis: 'starter-fit', score: 0.5, reasons };
    }

    return { axis: 'starter-fit', score: 0, reasons: ['resolved starter outside expected family starters'] };
  }

  if (profile.genreFamily === benchmark.expectedGenreFamily) {
    if (familyProfile?.starterTemplateIds.includes(profile.starterTemplateId)) {
      reasons.push('resolved named starter inside expected family');
      return { axis: 'starter-fit', score: 1, reasons };
    }

    reasons.push('resolved generic blueprint but kept expected family');
    return { axis: 'starter-fit', score: 0.75, reasons };
  }

  if (familyProfile?.starterTemplateIds.includes(profile.starterTemplateId)) {
    reasons.push('resolved starter inside expected family');
    return { axis: 'starter-fit', score: 1, reasons };
  }

  return { axis: 'starter-fit', score: 0, reasons: ['resolved starter outside expected family starters'] };
}

function scoreHudClarity(templateCode: string): AxisScore {
  const hudContainerPatterns = [
    /#hud/i,
    /hud\.innerHTML/i,
    /hudText/i,
    /scoreText/i,
    /timerText/i,
    /waveText/i,
    /\.add\.text\(/i,
  ];
  const statusPatterns = [
    /\bscore\b/i,
    /\btimer\b/i,
    /\bwave\b/i,
    /\bquest\b/i,
    /\bcheckpoint\b/i,
    /\bboost\b/i,
    /\bxp\b/i,
    /\bhealth\b/i,
    /\bhp\b/i,
    /\blives\b/i,
    /\bmoney\b/i,
    /\bdistance\b/i,
    /\bkm\/h\b/i,
    /\bgoal\b/i,
    /\bshots left\b/i,
    /\bcrystal hp\b/i,
    /\bguardians\b/i,
    /\blevel\b/i,
  ];

  const hudContainer = hasAny(templateCode, hudContainerPatterns);
  const statusCount = countMatches(templateCode, statusPatterns);
  let score = 0;
  const reasons: string[] = [];

  if (hudContainer) {
    score += 0.5;
    reasons.push('has visible HUD container or HUD text hook');
  }

  if (statusCount >= 3) {
    score += 0.5;
    reasons.push('tracks multiple readable progress tokens');
  } else if (statusCount >= 2) {
    score += 0.25;
    reasons.push('tracks some readable progress tokens');
  }

  return { axis: 'hud-clarity', score: Math.min(1, score), reasons };
}

function scoreCameraReadability(templateCode: string): AxisScore {
  const cameraPatterns = [
    /PerspectiveCamera/i,
    /camera\.lookAt/i,
    /updateCamera/i,
    /camera\.position\.lerp/i,
    /startFollow/i,
    /cameraModel/i,
  ];
  const score = hasAny(templateCode, cameraPatterns) ? 1 : 0;
  return {
    axis: 'camera-readability',
    score,
    reasons: score ? ['contains explicit follow or framing camera logic'] : ['missing explicit camera/framing logic'],
  };
}

function scoreRestartFlow(templateCode: string): AxisScore {
  const restartPatterns = [
    /restart-btn/i,
    /reload\(/i,
    /scene\.restart\(/i,
    /Press SPACE to restart/i,
    /\bretry\b/i,
    /\breplay\b/i,
    /\brestart\b/i,
  ];
  const outcomePatterns = [/\boverlay\b/i, /\bwin\b/i, /\bgame over\b/i, /\bgoal\b/i, /\bcomplete\b/i, /\bfinished\b/i];
  let score = 0;
  const reasons: string[] = [];

  if (hasAny(templateCode, outcomePatterns)) {
    score += 0.4;
    reasons.push('has explicit win or fail feedback');
  }

  if (hasAny(templateCode, restartPatterns)) {
    score += 0.6;
    reasons.push('has explicit retry or replay affordance');
  }

  return { axis: 'restart-flow', score: Math.min(1, score), reasons };
}

export function scoreBenchmarkCode(
  benchmark: EngineBenchmarkCase,
  templateCode: string,
  options: { templateFile?: string | null; starterTemplateId?: string } = {},
): BenchmarkScorecard {
  const resolvedProfile = resolveEngineProfile({
    prompt: benchmark.prompt,
    currentCode: templateCode || undefined,
  });
  const axisScores = benchmark.reviewAxes.map((axis) => {
    switch (axis) {
      case 'family-fit':
        return scoreFamilyFit(benchmark, templateCode);
      case 'starter-fit':
        return scoreStarterFit(benchmark);
      case 'hud-clarity':
        return scoreHudClarity(templateCode);
      case 'camera-readability':
        return scoreCameraReadability(templateCode);
      case 'restart-flow':
        return scoreRestartFlow(templateCode);
      default:
        return { axis, score: 0, reasons: ['unsupported axis'] };
    }
  });

  const overallScore =
    axisScores.reduce((total, axisScore) => total + axisScore.score, 0) / Math.max(1, axisScores.length);

  return {
    benchmarkId: benchmark.id,
    templateFile: options.templateFile ?? null,
    starterTemplateId: options.starterTemplateId || resolvedProfile.starterTemplateId,
    overallScore,
    axisScores,
  };
}

export function scoreBenchmarkCase(benchmark: EngineBenchmarkCase): BenchmarkScorecard {
  const profile = resolveEngineProfile({ prompt: benchmark.prompt });
  const templateFile = profile.templateFile || null;
  const templateCode = templateFile ? fs.readFileSync(path.join(TEMPLATE_DIR, templateFile), 'utf-8') : '';
  return scoreBenchmarkCode(benchmark, templateCode, {
    templateFile,
    starterTemplateId: profile.starterTemplateId,
  });
}

export function scoreAllBenchmarks(): BenchmarkScorecard[] {
  return ENGINE_PROMPT_BENCHMARKS.map(scoreBenchmarkCase);
}
