export const VALIDATION_RULES = {
  'vibe-2d-platform-action': {
    required: [/Phaser\.Game/, /arcade/i],
    warnings: [
      { pattern: /startFollow\(/, label: 'missing camera follow or forward motion cue' },
      { pattern: /touch-action:\s*none/i, label: 'missing touch-action protection' },
      { pattern: /Scale\.FIT|autoCenter/i, label: 'missing responsive scale config' },
    ],
  },
  'vibe-2d-top-down': {
    required: [/Phaser\.Game/, /arcade/i],
    warnings: [{ pattern: /physics\.add\.(overlap|collider)/i, label: 'missing collision hooks' }],
  },
  'vibe-2d-racing': {
    required: [/Phaser\.Game/, /arcade/i],
    warnings: [{ pattern: /setVelocity|velocity/i, label: 'missing motion tuning' }],
  },
  'vibe-2d-puzzle': {
    required: [/Phaser\.Game/],
    warnings: [{ pattern: /Score|Moves|Timer/i, label: 'missing clear puzzle HUD' }],
  },
  'vibe-2d-sim': {
    required: [/Phaser\.Game/],
    warnings: [{ pattern: /Score|Coins|Mood|Energy|Harvest/i, label: 'missing progression feedback' }],
  },
  'vibe-2d-tycoon': {
    required: [/Phaser\.Game/],
    warnings: [{ pattern: /Coins|Cash|Money|Profit/i, label: 'missing economy loop UI' }],
  },
  'vibe-2d-defense': {
    required: [/Phaser\.Game/, /tower|enemy|wave/i],
    warnings: [{ pattern: /wave/i, label: 'missing wave progression' }],
  },
  'vibe-2d-rpg': {
    required: [/Phaser\.Game/],
    warnings: [{ pattern: /health|xp|level|quest/i, label: 'missing progression HUD' }],
  },
  'vibe-2d-sports': {
    required: [/Phaser\.Game/],
    warnings: [{ pattern: /Score|Round|Fish|Goal/i, label: 'missing clear objective HUD' }],
  },
  'vibe-3d-obby': {
    required: [/THREE\.Scene/, /THREE\.PerspectiveCamera/, /requestAnimationFrame/, /AmbientLight|DirectionalLight/],
    warnings: [{ pattern: /checkpoint|goal|finish/i, label: 'missing checkpoint or finish feedback' }],
  },
  'vibe-3d-exploration': {
    required: [/THREE\.Scene/, /THREE\.PerspectiveCamera/, /requestAnimationFrame/, /AmbientLight|DirectionalLight/],
    warnings: [{ pattern: /hud|quest|objective|inventory/i, label: 'missing exploration UI' }],
  },
  'vibe-3d-racing': {
    required: [/THREE\.Scene/, /THREE\.PerspectiveCamera/, /requestAnimationFrame/, /AmbientLight|DirectionalLight/],
    warnings: [{ pattern: /road|track|camera\.lookAt/i, label: 'missing chase camera or track cues' }],
  },
  'vibe-3d-survival': {
    required: [/THREE\.Scene/, /THREE\.PerspectiveCamera/, /requestAnimationFrame/, /AmbientLight|DirectionalLight/],
    warnings: [{ pattern: /health|hunger|day|night|shelter/i, label: 'missing survival loop HUD' }],
  },
  'vibe-3d-builder': {
    required: [/THREE\.Scene/, /THREE\.PerspectiveCamera/, /requestAnimationFrame/, /AmbientLight|DirectionalLight/],
    warnings: [{ pattern: /build|place|inventory|materials/i, label: 'missing builder loop feedback' }],
  },
  'vibe-3d-social': {
    required: [/THREE\.Scene/, /THREE\.PerspectiveCamera/, /requestAnimationFrame/],
    warnings: [{ pattern: /VibeMultiplayer|players|room/i, label: 'missing social or multiplayer hooks' }],
  },
  'vibe-3d-tower-defense': {
    required: [
      /THREE\.Scene/,
      /THREE\.PerspectiveCamera/,
      /requestAnimationFrame/,
      /AmbientLight|DirectionalLight/,
      /tower|enemy|wave/i,
      /GLTFLoader|\/assets\/models\//,
      /placeTower|towerCount|canBuild|buildMarker/i,
      /spawnEnemy|pathIdx|path/i,
      /projectile|fireProjectile/i,
    ],
    warnings: [{ pattern: /gold|lives|projectile|path/i, label: 'missing tower defense HUD or combat loop' }],
  },
  'vibe-3d-minigolf': {
    required: [
      /THREE\.Scene/,
      /THREE\.PerspectiveCamera/,
      /requestAnimationFrame/,
      /AmbientLight|DirectionalLight/,
      /ball|hole|stroke|par/i,
      /GLTFLoader|\/assets\/models\//,
    ],
    warnings: [{ pattern: /aim|power|drag/i, label: 'missing aim or shot control feedback' }],
  },
  'vibe-3d-marble-run': {
    required: [
      /THREE\.Scene/,
      /THREE\.PerspectiveCamera/,
      /requestAnimationFrame/,
      /AmbientLight|DirectionalLight/,
      /marble|track|finish|gravity/i,
      /GLTFLoader|\/assets\/models\//,
    ],
    warnings: [{ pattern: /timer|level|retry/i, label: 'missing marble run progression feedback' }],
  },
  'vibe-3d-kart-racing': {
    required: [
      /THREE\.Scene/,
      /THREE\.PerspectiveCamera/,
      /requestAnimationFrame/,
      /AmbientLight|DirectionalLight/,
      /kart|lap|track|speed/i,
      /GLTFLoader|\/assets\/models\//,
    ],
    warnings: [{ pattern: /position|boost|coins?/i, label: 'missing kart racing HUD or pickup loop' }],
  },
  'vibe-3d-coaster-park': {
    required: [
      /THREE\.Scene/,
      /THREE\.PerspectiveCamera/,
      /requestAnimationFrame/,
      /AmbientLight|DirectionalLight/,
      /coaster|track|ride|park/i,
      /GLTFLoader|\/assets\/models\//,
    ],
    warnings: [{ pattern: /excitement|rides?|speed/i, label: 'missing coaster park progression feedback' }],
  },
  'vibe-3d-medieval-village': {
    required: [
      /THREE\.Scene/,
      /THREE\.PerspectiveCamera/,
      /requestAnimationFrame/,
      /AmbientLight|DirectionalLight/,
      /village|building|gold|villager/i,
      /GLTFLoader|\/assets\/models\//,
    ],
    warnings: [{ pattern: /palette|place|goal|population/i, label: 'missing village builder interaction loop' }],
  },
};

function collectMatches(code, patterns) {
  const missing = [];
  for (const pattern of patterns) {
    pattern.lastIndex = 0;
    if (!pattern.test(code)) {
      missing.push(pattern.source);
    }
  }
  return missing;
}

export function validateEngineOutput(code, engineProfile) {
  if (!code || !engineProfile) {
    return { safe: true, violations: [], warnings: [] };
  }

  const rules = VALIDATION_RULES[engineProfile.validationProfile];
  if (!rules) {
    return { safe: true, violations: [], warnings: [] };
  }

  const violations = collectMatches(code, rules.required || []);
  const warnings = [];
  for (const warning of rules.warnings || []) {
    warning.pattern.lastIndex = 0;
    if (!warning.pattern.test(code)) {
      warnings.push(warning.label);
    }
  }

  return {
    safe: violations.length === 0,
    violations,
    warnings,
  };
}
