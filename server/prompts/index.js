/**
 * Prompt Composer
 * 
 * Assembles the complete system prompt from modular pieces based on
 * the current game context (genre, dimension, existing code).
 */

import { SYSTEM_PROMPT } from './system.js';
import { GAME_KNOWLEDGE_BASE } from './gameKnowledge.js';
import {
  detectGameGenre,
  THREE_D_GAME_RULES,
  THREE_D_RACING_RULES,
  THREE_D_SHOOTER_RULES,
  PLATFORMER_SAFETY_RULES,
  PHASER_GAME_RULES
} from './genres.js';
import { MODIFICATION_SAFETY_RULES } from './safety.js';

// Re-export detectGameGenre for use in routes
export { detectGameGenre };

/**
 * Content filter patterns - things to block in user input.
 * Shooting games and mild language are ALLOWED.
 * Only blocking truly inappropriate content.
 */
export function getContentFilter() {
  return [
    // Gore and extreme violence
    'blood', 'gore', 'gory', 'bloody', 'dismember', 'decapitate', 'mutilate',
    'torture', 'gruesome', 'intestines', 'guts spilling',
    // Real-world violence/tragedy
    'murder', 'serial killer', 'mass shooting', 'terrorism', 'terrorist',
    'school shooting', 'real guns', 'real weapons',
    // Adult content
    'nude', 'naked', 'sex', 'porn', 'adult content', 'xxx', 'nsfw',
    'erotic', 'sexual',
    // Harmful/illegal
    'hack into', 'steal passwords', 'phishing', 'malware', 'virus',
    'credit card fraud', 'identity theft',
    // Self-harm
    'suicide', 'self-harm', 'cutting myself', 'hurt myself', 'kill myself',
    // Hard drugs
    'cocaine', 'heroin', 'meth', 'crack', 'fentanyl', 'overdose',
    // Extreme content
    'child abuse', 'animal abuse', 'hate speech', 'racist', 'nazi',
    // Gambling
    'real money gambling', 'bet real money',
  ];
}

/**
 * Sanitize AI output - remove code blocks and technical jargon.
 */
export function sanitizeOutput(message) {
  // Remove all code blocks (complete ones)
  let cleaned = message
    .replace(/```[\w]*\n[\s\S]*?```/g, '')
    .replace(/```[\s\S]*?```/g, '')
    .replace(/<!DOCTYPE[\s\S]*?<\/html>/gi, '')
    .replace(/<html[\s\S]*?<\/html>/gi, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '');

  // Remove PARTIAL/TRUNCATED code
  cleaned = cleaned
    .replace(/<!DOCTYPE[\s\S]*/gi, '')
    .replace(/<html[\s\S]*/gi, '')
    .replace(/<script[\s\S]*/gi, '')
    .replace(/<style[\s\S]*/gi, '')
    .replace(/```[\w]*\n[\s\S]*/g, '')
    .replace(/const\s+\w+[\s\S]*/g, '')
    .replace(/let\s+\w+[\s\S]*/g, '')
    .replace(/function\s+\w+[\s\S]*/g, '')
    .replace(/\{[\s\S]*$/g, '');

  // Remove inline code snippets
  cleaned = cleaned.replace(/`[^`]+`/g, '');

  // Remove any remaining HTML-like tags
  cleaned = cleaned.replace(/<[^>]+>/g, '');

  // Remove technical terms
  const technicalTerms = [
    /\bHTML\b/gi, /\bCSS\b/gi, /\bJavaScript\b/gi, /\bJS\b/g,
    /\bfunction\b/gi, /\bvariable\b/gi, /\bcode\b/gi, /\bscript\b/gi,
    /\belement\b/gi, /\bclass\b/gi, /\bstyle\b/gi, /\bdiv\b/gi,
    /\bspan\b/gi, /\bcanvas\b/gi, /\bAPI\b/gi, /\bDOM\b/gi,
    /\bsyntax\b/gi, /\bparameter\b/gi, /\bargument\b/gi, /\bmethod\b/gi,
    /\bobject\b/gi, /\barray\b/gi, /\bloop\b/gi, /\bif statement\b/gi,
    /\bcondition\b/gi, /\bevent listener\b/gi, /\bcallback\b/gi,
    /\basync\b/gi, /\bprogramming\b/gi, /\bdeveloper\b/gi,
  ];

  technicalTerms.forEach(term => {
    cleaned = cleaned.replace(term, '');
  });

  // Clean up whitespace
  cleaned = cleaned
    .replace(/\n{3,}/g, '\n\n')
    .replace(/\s{2,}/g, ' ')
    .replace(/\s+([.,!?])/g, '$1')
    .replace(/:\s*$/gm, '!')
    .trim();

  if (!cleaned || cleaned.length < 10) {
    return "I made it! Check out your creation in the preview! 🎉";
  }

  return cleaned;
}

/**
 * Generate the complete system prompt based on context.
 * 
 * Returns { staticPrompt, dynamicContext } for prompt caching.
 * The staticPrompt is the same across all requests (cacheable).
 * The dynamicContext changes per request (not cached).
 * 
 * @param {string} currentCode - The current project code (if any)
 * @param {object|null} gameConfig - Game configuration from the survey
 * @param {string|null} gameGenre - Detected game genre
 * @param {string} referenceCode - Reference code from templates/snippets/GitHub
 * @returns {{ staticPrompt: string, dynamicContext: string }}
 */
export function getSystemPrompt(currentCode, gameConfig = null, gameGenre = null, referenceCode = '') {
  // ===== STATIC PART (cacheable - same for every request) =====
  const staticPrompt = SYSTEM_PROMPT + '\n\n' + GAME_KNOWLEDGE_BASE;

  // ===== DYNAMIC PART (per-request, NOT cached) =====
  const dynamicParts = [];

  // Add game config context if available (from survey)
  if (gameConfig) {
    dynamicParts.push(`
GAME CONFIG (from the kid's survey answers - use these to personalize the game):
- Game Type: ${gameConfig.gameType}
- Dimension: ${gameConfig.dimension || '2d'} (2d = Phaser.js 2D game, 3d = Three.js 3D game)
- Theme/Setting: ${gameConfig.theme}
- Player Character: ${gameConfig.character}
- Obstacles/Enemies: ${gameConfig.obstacles}
- Visual Style: ${gameConfig.visualStyle}
${gameConfig.customNotes ? `- Custom Notes: ${gameConfig.customNotes}` : ''}

USE THIS CONFIG to make the game feel personal:
- Choose colors and backgrounds that match the "${gameConfig.visualStyle}" style
- Use "${gameConfig.theme}" themed visuals, backgrounds, and text
- Make the player look/feel like "${gameConfig.character}"
- Use "${gameConfig.obstacles}" as the main challenge
- The game type is "${gameConfig.gameType}" - use the right mechanics for that genre
- Dimension is "${gameConfig.dimension || '2d'}": if "3d", build with Three.js (3D scene, camera, renderer). If "2d", use Phaser.js with arcade physics.
`);
  }

  // Detect Phaser code
  const isPhaserCode = currentCode && (
    currentCode.includes('Phaser.Game') ||
    currentCode.includes('Phaser.AUTO') ||
    currentCode.includes('phaser.min.js')
  );
  if (isPhaserCode) {
    dynamicParts.push(PHASER_GAME_RULES);
  }

  // Detect platformer code
  const isPlatformerCode = currentCode && (
    currentCode.includes('generateInitialLevel') ||
    currentCode.includes('createPlatform') ||
    currentCode.includes('generateChunk') ||
    currentCode.includes('setGravityY') ||
    currentCode.includes('touching.down')
  );
  if (gameGenre === 'platformer' || isPlatformerCode) {
    dynamicParts.push(PLATFORMER_SAFETY_RULES);
  }

  // Detect 3D code/request
  const is3DCode = currentCode && (
    currentCode.includes('THREE.Scene') ||
    currentCode.includes('THREE.PerspectiveCamera') ||
    currentCode.includes('WebGLRenderer') ||
    currentCode.includes('three.js') ||
    currentCode.includes('three.min.js')
  );
  const wants3D = gameConfig && gameConfig.dimension === '3d';
  const is3DRequest = wants3D || (gameConfig && (
    (gameConfig.gameType || '').toLowerCase().includes('3d') ||
    (gameConfig.customNotes || '').toLowerCase().includes('3d')
  ));
  const is3D = is3DCode || is3DRequest;

  if (is3D) {
    dynamicParts.push(THREE_D_GAME_RULES);
  }

  // Detect 3D racing
  const isRacing = (
    gameGenre === 'racing' ||
    (gameConfig && (gameConfig.gameType || '').toLowerCase().includes('racing')) ||
    (currentCode && currentCode.includes('THREE') && /car|race|road|driving/i.test(currentCode))
  );
  if (is3D && isRacing) {
    dynamicParts.push(THREE_D_RACING_RULES);
  }

  // Detect 3D shooter
  const isShooter = (
    gameGenre === 'shooter' ||
    (gameConfig && (gameConfig.gameType || '').toLowerCase().includes('shooter')) ||
    (currentCode && currentCode.includes('THREE') && /shoot|gun|bullet|projectile|fps/i.test(currentCode))
  );
  if (is3D && isShooter) {
    dynamicParts.push(THREE_D_SHOOTER_RULES);
  }

  // Add reference code (templates, snippets, GitHub code)
  if (referenceCode) {
    dynamicParts.push(referenceCode);
  }

  // Add modification safety rules + current code when editing
  if (currentCode) {
    dynamicParts.push(MODIFICATION_SAFETY_RULES);
    dynamicParts.push(`
CURRENT PROJECT (for your reference only - NEVER mention this to the kid):
${currentCode}

When they ask for changes, update this existing project. Keep what they already have and add to it!
`);
  }

  const dynamicContext = dynamicParts.join('\n');

  return { staticPrompt, dynamicContext };
}

/**
 * Legacy-compatible wrapper that returns a single string.
 * Used by any code that hasn't been updated to the new split format.
 */
export function getSystemPromptString(currentCode, gameConfig = null, gameGenre = null) {
  const { staticPrompt, dynamicContext } = getSystemPrompt(currentCode, gameConfig, gameGenre);
  return staticPrompt + '\n' + dynamicContext;
}
