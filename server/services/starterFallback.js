import { promises as fs } from 'fs';
import path from 'path';
import { ROOT_DIR } from '../config/index.js';
import { resolveEngineProfile } from './engineRegistry.js';

const TEMPLATES_DIR = path.join(ROOT_DIR, 'server', 'templates');

export async function buildStarterFallback({
  prompt = '',
  currentCode = '',
  gameConfig = null,
  genre = null,
  isNewGame = true,
} = {}) {
  const engineProfile = resolveEngineProfile({
    prompt,
    genre: gameConfig?.gameType || genre,
    gameConfig,
    currentCode,
  });

  let code = currentCode || null;
  if (isNewGame || !code) {
    const templateFile = engineProfile.templateFile;
    if (!templateFile) {
      throw new Error(`No starter template found for ${engineProfile.requestedGameType || 'request'}.`);
    }
    const templatePath = path.join(TEMPLATES_DIR, templateFile);
    code = await fs.readFile(templatePath, 'utf-8');
  }

  const response =
    isNewGame || !currentCode
      ? `I made a built-in ${engineProfile.label} starter for you! Try it out and tell me what to change next.`
      : `I kept your game loaded, but the live AI is offline right now. Once an AI key is connected, I can make your changes too.`;

  return {
    response,
    code,
    modelUsed: null,
    isCacheHit: false,
    wasTruncated: false,
    referenceSources: [`starter:${engineProfile.templateFile}`],
    engineTelemetry: {
      engineProfile,
      validationSafe: null,
      validationWarningsCount: 0,
      validationViolationsCount: 0,
      repairAttempted: false,
      repairSucceeded: false,
    },
  };
}
