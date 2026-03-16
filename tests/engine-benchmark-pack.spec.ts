import { expect, test } from '@playwright/test';
import { ENGINE_PROMPT_BENCHMARKS } from '../src/config/engineBenchmarkPack';
import { STARTER_TEMPLATES } from '../src/config/gameCatalog';
import { ENGINE_FAMILY_PROFILES, TEMPLATE_BLUEPRINTS, resolveEngineProfile } from '../server/services/engineRegistry.js';

test.describe('Engine benchmark pack', () => {
  test('covers every exposed starter family with at least one benchmark', () => {
    const starterFamilies = new Set(STARTER_TEMPLATES.map((starter) => starter.genreFamily));
    const benchmarkFamilies = new Set(ENGINE_PROMPT_BENCHMARKS.map((benchmark) => benchmark.expectedGenreFamily));

    for (const family of starterFamilies) {
      expect(benchmarkFamilies.has(family), `Missing benchmark coverage for family ${family}`).toBe(true);
    }
  });

  test('benchmark cases reference valid families and starters', () => {
    for (const benchmark of ENGINE_PROMPT_BENCHMARKS) {
      expect(ENGINE_FAMILY_PROFILES[benchmark.expectedGenreFamily], `Invalid family in ${benchmark.id}`).toBeTruthy();
      expect(benchmark.reviewAxes.length, `Missing review axes in ${benchmark.id}`).toBeGreaterThan(0);

      if (benchmark.expectedStarterTemplateId) {
        expect(TEMPLATE_BLUEPRINTS[benchmark.expectedStarterTemplateId], `Invalid starter in ${benchmark.id}`).toBeTruthy();
      }
    }
  });

  test('benchmark prompts resolve to expected engine profiles', () => {
    for (const benchmark of ENGINE_PROMPT_BENCHMARKS) {
      const profile = resolveEngineProfile({ prompt: benchmark.prompt });

      expect(profile.engineId, `Wrong engine for ${benchmark.id}`).toBe(benchmark.expectedEngineId);
      expect(profile.genreFamily, `Wrong family for ${benchmark.id}`).toBe(benchmark.expectedGenreFamily);

      if (benchmark.expectedStarterTemplateId) {
        expect(profile.starterTemplateId, `Wrong starter for ${benchmark.id}`).toBe(benchmark.expectedStarterTemplateId);
      }
    }
  });
});
