/**
 * Game Handler — Core Tri-Model Routing Engine
 *
 * This is the brain of the tri-AI system. It decides which model to call
 * (Claude, Grok, or OpenAI), manages the response cache, and handles special
 * modes like critic loops and "Ask the Other Buddy".
 *
 * ROUTING LOGIC:
 * ─────────────────────────────────────────────────────────────
 * Mode              │ What happens
 * ─────────────────────────────────────────────────────────────
 * 'default'         │ Claude (safe default for initial generation)
 * 'claude'          │ Force Claude (explicit user choice)
 * 'grok'            │ Force Grok (backend preserved, frontend hidden for now)
 * 'openai'          │ Force OpenAI (explicit user choice / coach mode)
 * 'creative'        │ Route to OpenAI for creative iteration
 * 'debug'           │ Try Claude first (up to 2 attempts), then auto-route to OpenAI
 * 'ask-other-buddy' │ Send to the NEXT model in rotation
 * 'critic'          │ Claude generates → Grok critiques → Claude polishes
 * ─────────────────────────────────────────────────────────────
 *
 * Returns: { response, code, modelUsed, isCacheHit, alternateResponse? }
 */

import { getSystemPrompt } from '../prompts/index.js';
import { detectMultiplayerIntent } from '../prompts/genres.js';
import { getPersonalityWrapper, GROK_CRITIC_PROMPT, CLAUDE_POLISH_PROMPT } from '../prompts/personalities.js';
import {
  formatMessageContent,
  calculateMaxTokens,
  trimConversationHistory,
  callClaude,
  callGrok,
  callOpenAI,
  extractOpenAIText,
  extractCode,
  isTruncated,
  extractPartialCode,
  attemptContinuation,
  isGrokAvailable,
  isOpenAIAvailable,
} from './ai.js';
import {
  generateCacheKey,
  getCachedResponse,
  setCachedResponse,
  detectIterationPattern,
  getPatternHint,
  storePatternSuccess,
} from './responseCache.js';
import { DEBUG_MAX_CLAUDE_ATTEMPTS } from '../config/index.js';
import { resolveReferences } from './referenceResolver.js';
import { detectGameGenre } from '../prompts/index.js';
import { injectSprites } from './spriteInjector.js';
import { injectModels } from './modelInjector.js';
import { resolveEngineProfile } from './engineRegistry.js';
import { validateEngineOutput } from './engineValidators.js';

// ========== MODE DETECTION HELPERS ==========

/**
 * Auto-detect if the kid's prompt is asking for creative/fun iteration.
 * These keywords route to OpenAI for creative polish while Grok stays hidden.
 */
const CREATIVE_TRIGGERS = [
  'make it more fun',
  'make it cooler',
  'make it crazier',
  'make it wilder',
  'add something silly',
  'add something crazy',
  'add something fun',
  'surprise me',
  'make it epic',
  'make it awesome',
  'remix',
  'go crazy',
  'go wild',
  'yolo',
  'add easter egg',
  'add memes',
  'make it bussin',
];

/**
 * Auto-detect if the kid is reporting a bug or asking for a fix.
 */
const DEBUG_TRIGGERS = [
  "doesn't work",
  'doesnt work',
  'not working',
  'it broke',
  "it's broken",
  'its broken',
  'broken',
  'bug',
  'glitch',
  "won't load",
  'wont load',
  "can't play",
  'cant play',
  'nothing happens',
  'stuck',
  'crashed',
  'error',
  "help it's",
  'help its',
  'fix it',
  'fix this',
  "something's wrong",
  'somethings wrong',
];

/**
 * Detect the best mode based on the kid's prompt text.
 * Returns the auto-detected mode, or null if no special detection.
 *
 * @param {string} prompt - The user's message
 * @returns {string|null} Detected mode or null
 */
export function autoDetectMode(prompt) {
  const lower = (prompt || '').toLowerCase().trim();

  // Check creative triggers
  for (const trigger of CREATIVE_TRIGGERS) {
    if (lower.includes(trigger)) return 'creative';
  }

  // Check debug triggers
  for (const trigger of DEBUG_TRIGGERS) {
    if (lower.includes(trigger)) return 'debug';
  }

  return null;
}

// ========== CORE HANDLER ==========

/**
 * Generate or iterate on a game using the dual-model AI system.
 *
 * This is THE core function that the route calls. It handles:
 * 1. Cache lookup (instant serve if hit)
 * 2. Mode-based routing to the right model
 * 3. Response extraction and code parsing
 * 4. Cache storage for future hits
 * 5. Truncation recovery
 *
 * @param {object} params
 * @param {string} params.prompt - The kid's message
 * @param {string|null} params.currentCode - Current game code (null for new games)
 * @param {string} params.mode - Routing mode (default/claude/grok/creative/debug/ask-other-buddy/critic)
 * @param {Array} params.conversationHistory - Previous messages [{role, content}]
 * @param {object|null} params.gameConfig - Survey-based game config
 * @param {string|null} params.image - Base64 image (for screenshot-based requests)
 * @param {string|null} params.userId - For usage tracking
 * @param {string|null} params.lastModelUsed - Which model was used in the previous turn
 * @param {number} params.debugAttempt - Current attempt number for debug mode (internal)
 *
 * @returns {Promise<{
 *   response: string,
 *   code: string|null,
 *   modelUsed: 'claude'|'grok',
 *   isCacheHit: boolean,
 *   alternateResponse?: { response: string, code: string|null, modelUsed: string },
 *   wasTruncated: boolean,
 *   debugInfo?: { attempts: number, finalModel: string }
 * }>}
 */
export async function generateOrIterateGame({
  prompt,
  currentCode = null,
  mode = 'default',
  conversationHistory = [],
  gameConfig = null,
  image = null,
  userId = null,
  lastModelUsed = null,
  debugAttempt = 0,
  onStatus = null,
}) {
  const emitStatus = (stage, message) => {
    if (typeof onStatus === 'function') onStatus(stage, message);
  };
  // ===== AUTO-DETECT MODE (if mode is 'default') =====
  let effectiveMode = mode;
  if (mode === 'default') {
    const detected = autoDetectMode(prompt);
    if (detected) {
      console.log(`🔀 Auto-detected mode: "${detected}" from prompt`);
      effectiveMode = detected;
    }
  }

  // If Grok isn't available, fall back to Claude
  if (!isGrokAvailable() && effectiveMode === 'grok') {
    console.log('⚠️ Grok not available (no XAI_API_KEY), falling back to Claude');
    effectiveMode = 'claude';
  }
  if (!isGrokAvailable() && effectiveMode === 'critic') {
    console.log('⚠️ Grok not available, critic mode → Claude only');
    effectiveMode = 'claude';
  }
  // If OpenAI isn't available, fall back to Claude
  if (!isOpenAIAvailable() && effectiveMode === 'openai') {
    console.log('⚠️ OpenAI not available (no OPENAI_API_KEY), falling back to Claude');
    effectiveMode = 'claude';
  }

  // ===== DETERMINE TARGET MODEL =====
  const targetModel = resolveTargetModel(effectiveMode, lastModelUsed);
  const detectedGenre = gameConfig?.gameType || detectGameGenre(prompt || '') || null;
  const cachedEngineProfile = resolveEngineProfile({
    prompt,
    genre: detectedGenre,
    gameConfig,
    currentCode,
  });
  console.log(
    `🎯 Mode: "${effectiveMode}" → Model: ${targetModel} | hasCode: ${!!currentCode} | history: ${conversationHistory.length}`,
  );

  // ===== CACHE CHECK =====
  const cacheKey = generateCacheKey(prompt, currentCode, targetModel, effectiveMode);
  const cached = getCachedResponse(cacheKey);
  if (cached) {
    return {
      response: cached.response,
      code: cached.code,
      modelUsed: cached.model,
      isCacheHit: true,
      wasTruncated: false,
      engineTelemetry: {
        engineProfile: cachedEngineProfile,
        validationSafe: null,
        validationWarningsCount: 0,
        validationViolationsCount: 0,
        repairAttempted: false,
        repairSucceeded: false,
        isNewGame: !currentCode,
      },
    };
  }

  // ===== ROUTE TO THE RIGHT HANDLER =====
  let result;

  switch (effectiveMode) {
    case 'critic':
      result = await handleCriticMode({ prompt, currentCode, conversationHistory, gameConfig, image, userId });
      break;

    case 'debug':
      result = await handleDebugMode({
        prompt,
        currentCode,
        conversationHistory,
        gameConfig,
        image,
        userId,
        debugAttempt,
      });
      break;

    case 'ask-other-buddy':
      result = await handleAskOtherBuddy({
        prompt,
        currentCode,
        conversationHistory,
        gameConfig,
        image,
        userId,
        lastModelUsed,
      });
      break;

    default:
      // Standard single-model call (claude, grok, creative, default)
      result = await handleSingleModel({
        prompt,
        currentCode,
        conversationHistory,
        gameConfig,
        image,
        userId,
        targetModel,
        emitStatus,
      });
      break;
  }

  // ===== VALIDATE & SANITIZE AI OUTPUT =====
  if (result && result.code) {
    const { validateAIOutput, sanitizeAIOutput } = await import('./outputValidator.js');
    const validation = validateAIOutput(result.code);
    if (!validation.safe) {
      console.warn(`⚠️ AI output contained dangerous patterns: ${validation.violations.join(', ')}`);
      result.code = sanitizeAIOutput(result.code);
    }
  }

  // ===== CACHE THE RESULT =====
  if (result && !result.wasTruncated) {
    setCachedResponse(cacheKey, {
      response: result.response,
      code: result.code,
      model: result.modelUsed,
    });
  }

  return result;
}

// ========== MODEL RESOLUTION ==========

/**
 * Decide which model to call based on mode and context.
 */
const NEXT_BUDDY = { claude: 'openai', openai: 'claude', grok: 'claude' };

function resolveTargetModel(mode, lastModelUsed) {
  switch (mode) {
    case 'grok':
      return 'grok';
    case 'creative':
      return 'openai';
    case 'openai':
      return 'openai';
    case 'claude':
    case 'default':
    case 'debug':
      return 'claude';
    case 'ask-other-buddy': {
      const next = NEXT_BUDDY[lastModelUsed] || 'openai';
      if (next === 'openai' && !isOpenAIAvailable()) return 'claude';
      return next;
    }
    case 'critic':
      return 'claude';
    default:
      return 'claude';
  }
}

// ========== SINGLE MODEL HANDLER ==========

/**
 * Call a single model (Claude or Grok) and process the response.
 */
async function handleSingleModel({
  prompt,
  currentCode,
  conversationHistory,
  gameConfig,
  image,
  userId,
  targetModel,
  emitStatus = () => {},
}) {
  // Detect genre for reference resolution
  const genre = gameConfig?.gameType || detectGameGenre(prompt || '') || null;
  const requestedEngineProfile = resolveEngineProfile({ prompt, genre, gameConfig, currentCode });
  emitStatus('engine', 'Choosing the right engine...');
  const isNewGame =
    !currentCode ||
    currentCode.includes('Tell me what you want to create') ||
    currentCode.includes('Your game will appear here');

  // Check pattern cache for iteration hints
  const iterationCategory = detectIterationPattern(prompt);
  let patternHintText = '';
  if (iterationCategory && currentCode) {
    const hint = getPatternHint(iterationCategory, genre, targetModel);
    if (hint) {
      patternHintText = `\nPATTERN HINT (a similar "${iterationCategory}" request was successful before — here's what worked):\n${hint.hint}\nApply a similar approach to the current game code. This hint has worked ${hint.successCount} time(s) before.\n`;
    }
  }

  // Resolve reference code (templates, snippets, GitHub)
  let referenceCode = '';
  let referenceSources = [];
  try {
    const refs = await resolveReferences({ prompt, genre, gameConfig, isNewGame, currentCode });
    referenceCode = refs.referenceCode;
    referenceSources = refs.sources;
    if (refs.engineProfile) {
      referenceSources = [
        ...referenceSources,
        `profile:${refs.engineProfile.engineId}:${refs.engineProfile.genreFamily}`,
      ];
    }
  } catch (err) {
    console.error('⚠️ Reference resolution failed (continuing without):', err.message);
  }

  if (referenceSources.length > 0) {
    console.log(`📚 Using references: ${referenceSources.join(', ')}`);
  }
  emitStatus('references', 'Loading game templates...');

  // Combine reference code with pattern hint
  const fullReferenceCode = referenceCode + patternHintText;

  const { staticPrompt, dynamicContext } = getSystemPrompt(
    currentCode,
    gameConfig,
    genre,
    fullReferenceCode,
    prompt,
    requestedEngineProfile,
  );
  const personalityWrapper = getPersonalityWrapper(targetModel);
  const maxTokens = calculateMaxTokens(currentCode);

  // If multiplayer intent detected, prepend a hard reminder to the user message
  const isMultiplayerRequest =
    detectMultiplayerIntent(prompt) ||
    (gameConfig && gameConfig.customNotes && detectMultiplayerIntent(gameConfig.customNotes)) ||
    (currentCode && currentCode.includes('VibeMultiplayer'));
  const finalPrompt = isMultiplayerRequest
    ? `[MULTIPLAYER GAME — You MUST use the window.VibeMultiplayer API. Include Create Room / Join Room UI inside the game. See the MULTIPLAYER GAME RULES in the system prompt.]\n\n${prompt}`
    : prompt;

  // Build conversation messages
  const rawMessages = [
    ...conversationHistory.map((msg) => ({
      role: msg.role,
      content: formatMessageContent(msg.content, msg.image),
    })),
    { role: 'user', content: formatMessageContent(finalPrompt, image) },
  ];
  const messages = trimConversationHistory(rawMessages, 12);

  const requestAssistantText = async (messageList) => {
    if (targetModel === 'grok') {
      const fullSystemPrompt = personalityWrapper + '\n\n' + staticPrompt + '\n\n' + dynamicContext;
      const response = await callGrok(fullSystemPrompt, messageList, maxTokens, userId);
      return extractOpenAIText(response);
    }
    if (targetModel === 'openai') {
      const fullSystemPrompt = personalityWrapper + '\n\n' + staticPrompt + '\n\n' + dynamicContext;
      const response = await callOpenAI(fullSystemPrompt, messageList, maxTokens, userId);
      return extractOpenAIText(response);
    }

    const fullStaticPrompt = personalityWrapper + '\n\n' + staticPrompt;
    const response = await callClaude(fullStaticPrompt, dynamicContext, messageList, maxTokens, userId);
    return response.content[0].text;
  };

  const applyEnginePostProcessing = async (candidateCode) => {
    if (!candidateCode) return candidateCode;
    if (requestedEngineProfile.engineId === 'vibe-2d') {
      return injectSprites(candidateCode, requestedEngineProfile.templateGenre || genre);
    }
    if (requestedEngineProfile.engineId === 'vibe-3d') {
      return injectModels(candidateCode, requestedEngineProfile);
    }
    return candidateCode;
  };

  const buildEngineRepairPrompt = (validation) => `CRITICAL ENGINE REPAIR: The last draft did not satisfy the ${
    requestedEngineProfile.label
  } engine contract.

Missing required engine patterns:
${validation.violations.map((violation) => `- ${violation}`).join('\n')}

Warnings to address if possible:
${(validation.warnings || []).map((warning) => `- ${warning}`).join('\n') || '- none'}

Regenerate the COMPLETE game code. Keep the same game idea, but make sure the result preserves these core systems: ${
    (requestedEngineProfile.coreSystems || []).join(', ') || 'game loop, HUD, controls'
  }.

Only output the full HTML game.`;

  emitStatus('generating', 'Writing your game code...');

  let assistantText;
  let wasTruncated = false;
  const engineTelemetry = {
    engineProfile: requestedEngineProfile,
    validationSafe: null,
    validationWarningsCount: 0,
    validationViolationsCount: 0,
    repairAttempted: false,
    repairSucceeded: false,
    isNewGame,
  };

  assistantText = await requestAssistantText(messages);

  // Extract code from the response
  let code = extractCode(assistantText);

  // Handle truncation (Claude only — Grok typically doesn't truncate the same way)
  if (!code && isTruncated(assistantText)) {
    console.log(`⚠️ ${targetModel} response truncated — attempting continuation...`);
    const partialCode = extractPartialCode(assistantText);
    if (partialCode) {
      code = await attemptContinuation(partialCode, userId);
      if (!code) wasTruncated = true;
    } else {
      wasTruncated = true;
    }
  }

  // MULTIPLAYER SAFETY NET: If multiplayer was requested but the AI forgot to integrate
  // VibeMultiplayer, auto-retry with an explicit correction message.
  if (code && isMultiplayerRequest && !code.includes('VibeMultiplayer')) {
    console.log('⚠️ Multiplayer requested but AI did not integrate VibeMultiplayer — auto-retrying...');
    const fixupMessages = [
      ...messages,
      { role: 'assistant', content: assistantText },
      {
        role: 'user',
        content: `CRITICAL: This game was supposed to be an ONLINE MULTIPLAYER game, but you forgot to integrate the window.VibeMultiplayer API. The API is already injected into the iframe — you do NOT need to load anything. You MUST:\n1. Check if window.VibeMultiplayer exists on load\n2. If it exists, show a lobby with player name input, "Create Room" button (calls VibeMultiplayer.createRoom(name)), room code input + "Join Room" button (calls VibeMultiplayer.joinRoom(code, name))\n3. Use VibeMultiplayer.onRoomCreated, onRoomJoined, onPlayerJoined callbacks to start the game when 2 players are connected\n4. Use VibeMultiplayer.sendInput() to send moves and VibeMultiplayer.onInputReceived to receive opponent moves\n5. If VibeMultiplayer does NOT exist, fall back to local mode\n\nPlease regenerate the COMPLETE game code with proper VibeMultiplayer integration. Output the full HTML.`,
      },
    ];
    const trimmedFixup = trimConversationHistory(fixupMessages, 12);
    try {
      const retryText = await requestAssistantText(trimmedFixup);
      const retryCode = extractCode(retryText);
      if (retryCode && retryCode.includes('VibeMultiplayer')) {
        console.log('✅ Multiplayer auto-retry succeeded — VibeMultiplayer integrated.');
        code = retryCode;
        assistantText = retryText;
      } else {
        console.log('⚠️ Multiplayer auto-retry did not produce VibeMultiplayer code — using original.');
      }
    } catch (retryErr) {
      console.error('⚠️ Multiplayer auto-retry failed:', retryErr.message);
    }
  }

  emitStatus('polishing', 'Polishing and checking...');

  // Post-process: inject Kenney sprites if the AI used generateTexture instead
  code = await applyEnginePostProcessing(code);

  if (code) {
    let engineValidation = validateEngineOutput(code, requestedEngineProfile);
    engineTelemetry.validationSafe = engineValidation.safe;
    engineTelemetry.validationWarningsCount = engineValidation.warnings.length;
    engineTelemetry.validationViolationsCount = engineValidation.violations.length;
    if (engineValidation.warnings.length > 0) {
      console.log(
        `🧪 Engine validation warnings (${requestedEngineProfile.validationProfile}): ${engineValidation.warnings.join(', ')}`,
      );
    }
    if (!engineValidation.safe) {
      emitStatus('repairing', 'Fixing a small issue...');
      engineTelemetry.repairAttempted = true;
      console.warn(
        `⚠️ Engine validation failed (${requestedEngineProfile.validationProfile}): ${engineValidation.violations.join(', ')}`,
      );
      const repairMessages = trimConversationHistory(
        [
          ...messages,
          { role: 'assistant', content: assistantText },
          { role: 'user', content: buildEngineRepairPrompt(engineValidation) },
        ],
        12,
      );
      try {
        const repairText = await requestAssistantText(repairMessages);
        const repairedCode = await applyEnginePostProcessing(extractCode(repairText));
        if (repairedCode) {
          const repairedValidation = validateEngineOutput(repairedCode, requestedEngineProfile);
          if (repairedValidation.warnings.length > 0) {
            console.log(
              `🧪 Engine repair warnings (${requestedEngineProfile.validationProfile}): ${repairedValidation.warnings.join(', ')}`,
            );
          }
          if (repairedValidation.safe) {
            console.log(`✅ Engine repair retry succeeded (${requestedEngineProfile.validationProfile}).`);
            code = repairedCode;
            assistantText = repairText;
            engineValidation = repairedValidation;
            engineTelemetry.repairSucceeded = true;
            engineTelemetry.validationSafe = repairedValidation.safe;
            engineTelemetry.validationWarningsCount = repairedValidation.warnings.length;
            engineTelemetry.validationViolationsCount = repairedValidation.violations.length;
          } else {
            console.warn(
              `⚠️ Engine repair retry still failed (${requestedEngineProfile.validationProfile}): ${repairedValidation.violations.join(', ')}`,
            );
            engineTelemetry.repairSucceeded = false;
            engineTelemetry.validationSafe = repairedValidation.safe;
            engineTelemetry.validationWarningsCount = repairedValidation.warnings.length;
            engineTelemetry.validationViolationsCount = repairedValidation.violations.length;
            code = null;
          }
        } else {
          code = null;
        }
      } catch (repairErr) {
        console.error('⚠️ Engine repair retry failed:', repairErr.message);
        code = null;
      }

      if (!code) {
        assistantText =
          "I got the idea started, but the game engine setup didn't finish cleanly. Ask me to try again and I'll rebuild it! 🎮";
        wasTruncated = false;
      }
    }
  }

  // Store pattern success if we got code and this was an iteration pattern
  if (code && iterationCategory && currentCode) {
    const summary = summarizeCodeChange(prompt, iterationCategory);
    storePatternSuccess(iterationCategory, genre, targetModel, prompt, summary);
  }

  // Build the friendly response message
  let response = cleanAssistantMessage(assistantText, wasTruncated, !!code);

  return {
    response,
    code,
    modelUsed: targetModel,
    isCacheHit: false,
    wasTruncated,
    referenceSources,
    engineTelemetry,
  };
}

/**
 * Generate a short summary of what kind of code change was made,
 * keyed to the iteration pattern. Used by the pattern cache.
 */
function summarizeCodeChange(prompt, category) {
  const summaries = {
    'speed-up': 'Increased speed/velocity values, reduced delays, or increased game tick rate.',
    'slow-down': 'Decreased speed/velocity values, added delays, or reduced game tick rate.',
    harder: 'Increased enemy count/speed, reduced player lives/health, or narrowed hit windows.',
    easier: 'Decreased enemy count/speed, increased player lives/health, or widened hit windows.',
    'color-change': 'Modified fillStyle/backgroundColor/CSS color values to match the requested colors.',
    bigger: 'Increased width/height/radius/scale values for the target objects.',
    smaller: 'Decreased width/height/radius/scale values for the target objects.',
    background: 'Changed the canvas background color or CSS background of the game container.',
    'add-sound': 'Added Web Audio API sound effects (beeps, explosions, jumps) using oscillator and gain nodes.',
    'add-score': 'Added a score variable, increment logic on events, and HUD display with ctx.fillText or DOM element.',
    'add-lives': 'Added lives/health counter, damage logic, death/respawn, and HUD hearts or health bar.',
    'add-powerup': 'Added power-up objects with spawn logic, collection detection, and temporary buff effects.',
    'add-enemies': 'Added enemy array with spawn function, movement AI (patrol/chase), and collision with player.',
    'add-levels': 'Added level counter, difficulty progression, and level-complete transition screen.',
    'add-effects': 'Added particle system with spawn/update/draw functions for explosions or trails.',
    'more-fun': 'Added visual juice: screen shake, particles, combo counter, or surprise elements.',
    'fix-bug': `Fixed the bug described in: "${prompt.slice(0, 100)}". Checked event listeners, game loop, and collision logic.`,
    'fix-jump': 'Fixed jump mechanics: ensured onGround check, proper gravity reset, and collision with platforms.',
    'fix-collision': 'Fixed collision detection: corrected AABB overlap check or boundary conditions.',
    'fix-movement':
      'Fixed movement: ensured key listeners are attached, velocity is applied in game loop, and boundaries are checked.',
  };
  return summaries[category] || `Applied "${category}" changes as requested: "${prompt.slice(0, 80)}"`;
}

// ========== DEBUG MODE HANDLER ==========

/**
 * Debug mode: Try Claude first. If it doesn't fix the issue after
 * DEBUG_MAX_CLAUDE_ATTEMPTS, auto-route to OpenAI for a second pass.
 */
async function handleDebugMode({ prompt, currentCode, conversationHistory, gameConfig, image, userId, debugAttempt }) {
  const attempt = debugAttempt + 1;
  console.log(`🔧 Debug mode — attempt ${attempt}/${DEBUG_MAX_CLAUDE_ATTEMPTS}`);

  if (attempt <= DEBUG_MAX_CLAUDE_ATTEMPTS) {
    // Try Claude first
    const debugPrompt = `The kid says something isn't working: "${prompt}"\n\nPlease carefully debug the current code. Check for:\n1. Missing event listeners\n2. Broken collision detection\n3. Game loop issues\n4. Off-by-one errors\n5. Variables used before initialization\n\nFix the issues and output the COMPLETE corrected HTML.`;

    const result = await handleSingleModel({
      prompt: debugPrompt,
      currentCode,
      conversationHistory,
      gameConfig,
      image,
      userId,
      targetModel: 'claude',
    });

    return {
      ...result,
      debugInfo: { attempts: attempt, finalModel: 'claude' },
    };
  } else {
    // Claude didn't fix it — try OpenAI for a second set of eyes
    console.log('🔀 Claude debug attempts exhausted — routing to OpenAI for fresh eyes');

    const openAIDebugPrompt = `Coach GPT stepping in to debug this game. The kid said: "${prompt}"\n\nHere's the code that's NOT working. Find the bugs, fix them, and make it work.\nBe thorough — check EVERYTHING. Then output the COMPLETE fixed HTML.\n\nIf you can, add a little extra polish while you're in there.`;

    const result = await handleSingleModel({
      prompt: openAIDebugPrompt,
      currentCode,
      conversationHistory,
      gameConfig,
      image,
      userId,
      targetModel: 'openai',
    });

    return {
      ...result,
      debugInfo: { attempts: attempt, finalModel: 'openai' },
    };
  }
}

// ========== ASK OTHER BUDDY HANDLER ==========

/**
 * "Ask the Other Buddy" — sends current code + issue to the model
 * that WASN'T used last time. Kid-triggered model switching.
 */
const BUDDY_HANDOFF_PROMPTS = {
  claude: (prompt) =>
    `Professor Claude here! 🎓 Another buddy was working on this game and the kid wants a second opinion.\n\nThe kid says: "${prompt}"\n\nPlease review the current code carefully, fix any issues, and explain what you changed in a simple, encouraging way.`,
  grok: (prompt) =>
    `YOOO VibeGrok jumping in! 🚀🔥 Another buddy was building this game and the kid wants MY take on it!\n\nThe kid says: "${prompt}"\n\nLet me check this out, fix anything that's off, and add some extra sauce! 😎`,
  openai: (prompt) =>
    `Coach GPT stepping in! 🏆 Another buddy was building this game and the kid wants a fresh perspective.\n\nThe kid says: "${prompt}"\n\nLet me review the game plan, tighten up the gameplay, and level this up! 💪`,
};

async function handleAskOtherBuddy({
  prompt,
  currentCode,
  conversationHistory,
  gameConfig,
  image,
  userId,
  lastModelUsed,
}) {
  const otherModel = NEXT_BUDDY[lastModelUsed] || 'openai';
  const finalModel = otherModel === 'openai' && !isOpenAIAvailable() ? 'claude' : otherModel;
  console.log(`🔄 Ask Other Buddy: switching from ${lastModelUsed || 'unknown'} → ${finalModel}`);

  const contextPrompt = BUDDY_HANDOFF_PROMPTS[finalModel](prompt);

  const result = await handleSingleModel({
    prompt: contextPrompt,
    currentCode,
    conversationHistory,
    gameConfig,
    image,
    userId,
    targetModel: finalModel,
  });

  return result;
}

// ========== CRITIC MODE HANDLER ==========

/**
 * Critic loop: Claude generates → Grok critiques → Claude polishes.
 * This produces the highest quality output but costs 3 API calls.
 *
 * Returns both the polished result AND the intermediate critique.
 */
async function handleCriticMode({ prompt, currentCode, conversationHistory, gameConfig, image, userId }) {
  console.log('🔄 Critic mode: Claude → Grok review → Claude polish');

  // Step 1: Claude generates initial version
  console.log('  Step 1/3: Claude generating initial version...');
  const claudeResult = await handleSingleModel({
    prompt,
    currentCode,
    conversationHistory,
    gameConfig,
    image,
    userId,
    targetModel: 'claude',
  });

  if (!claudeResult.code) {
    // If Claude didn't produce code, skip the critic loop
    console.log('  ⚠️ Claude produced no code — skipping critic loop');
    return claudeResult;
  }

  // Step 2: Grok critiques Claude's output
  console.log("  Step 2/3: Grok reviewing Claude's output...");
  const critiquePrompt = `${GROK_CRITIC_PROMPT}\n\nHere is the game code from Professor Claude:\n\`\`\`html\n${claudeResult.code}\n\`\`\`\n\nThe kid originally asked: "${prompt}"\n\nReview it and provide your critique + improved version!`;

  const critiqueResult = await handleSingleModel({
    prompt: critiquePrompt,
    currentCode: null, // Grok is reviewing, not modifying the kid's code
    conversationHistory: [],
    gameConfig: null,
    image: null,
    userId,
    targetModel: 'grok',
  });

  // Step 3: Claude polishes with Grok's feedback
  console.log("  Step 3/3: Claude polishing with Grok's feedback...");
  const polishPrompt = `${CLAUDE_POLISH_PROMPT}\n\nOriginal kid request: "${prompt}"\n\nYour original code:\n\`\`\`html\n${claudeResult.code}\n\`\`\`\n\nVibeGrok's review:\n${critiqueResult.response}\n\n${critiqueResult.code ? `VibeGrok's suggested code:\n\`\`\`html\n${critiqueResult.code}\n\`\`\`` : ''}\n\nPlease produce the final polished version with improvements incorporated.`;

  const polishedResult = await handleSingleModel({
    prompt: polishPrompt,
    currentCode: null,
    conversationHistory: [],
    gameConfig: null,
    image: null,
    userId,
    targetModel: 'claude',
  });

  return {
    response: polishedResult.response,
    code: polishedResult.code || claudeResult.code, // Fall back to Claude's original if polish has no code
    modelUsed: 'claude',
    isCacheHit: false,
    wasTruncated: polishedResult.wasTruncated,
    referenceSources: polishedResult.referenceSources || claudeResult.referenceSources || [],
    engineTelemetry: polishedResult.engineTelemetry || claudeResult.engineTelemetry || null,
    // Include the alternate response so the UI can show side-by-side
    alternateResponse: {
      response: critiqueResult.response,
      code: critiqueResult.code,
      modelUsed: 'grok',
    },
  };
}

// ========== MESSAGE CLEANUP ==========

/** Refusal/error patterns from Claude when it fails to produce code. Replace with kid-friendly retry message. */
const REFUSAL_PATTERNS = [
  /i\s+(can't|cannot)\s+(build|create|make|do)/i,
  /i'm\s+(sorry|unable)\s+(i\s+)?(can't|cannot)/i,
  /i\s+(can't|cannot)\s+(help|assist)/i,
  /i'm\s+not\s+able\s+to/i,
  /i\s+don't\s+think\s+i\s+can/i,
  /unable\s+to\s+(build|create|generate)/i,
  /i\s+(can't|cannot)\s+fulfill/i,
  /sorry,?\s+i\s+(can't|cannot)/i,
  /i\s+(can't|cannot)\s+generate/i,
  /there\s+was\s+an\s+error/i,
  /something\s+went\s+wrong/i,
  /i\s+encountered\s+(an?\s+)?error/i,
];

/**
 * Clean the assistant's raw response into a kid-friendly message.
 * Strips code blocks and technical jargon.
 * When no code was produced and the message looks like a refusal/error, replaces with a friendly retry prompt.
 */
function cleanAssistantMessage(text, wasTruncated, hasCode = true) {
  if (wasTruncated) {
    return 'That game got really big! 😅 Let me try a simpler approach — ask me to add one feature at a time! 🎮';
  }

  let cleaned = text;

  // Remove code blocks
  cleaned = cleaned
    .replace(/```[\w]*\n[\s\S]*?```/g, '')
    .replace(/```[\s\S]*?```/g, '')
    .replace(/<!DOCTYPE[\s\S]*?<\/html>/gi, '')
    .replace(/<html[\s\S]*?<\/html>/gi, '');

  // Remove partial/truncated code
  cleaned = cleaned
    .replace(/<!DOCTYPE[\s\S]*/gi, '')
    .replace(/<html[\s\S]*/gi, '')
    .replace(/```[\w]*\n[\s\S]*/g, '');

  // Clean whitespace
  cleaned = cleaned
    .replace(/\n{3,}/g, '\n\n')
    .replace(/^\s+|\s+$/g, '')
    .trim();

  // When AI produced no code and the message sounds like a refusal/error, replace with friendly retry
  if (!hasCode && cleaned) {
    const looksLikeRefusal = REFUSAL_PATTERNS.some((p) => p.test(cleaned));
    if (looksLikeRefusal) {
      console.log('🤖 AI refusal/error detected (no code) — replacing with retry message');
      return "Hmm, I got a little stuck on that one! 🤔 Try describing your game again, or ask for something simpler — I'm here to help!";
    }
  }

  if (!cleaned || cleaned.length < 5) {
    return hasCode
      ? 'I made it! Check out your creation in the preview! 🎉'
      : 'Let me try that again! Can you describe your game one more time? 🎮';
  }

  return cleaned;
}

// ========== EXPORTS FOR ROUTE INTEGRATION ==========

export { getResponseCacheStats } from './responseCache.js';
