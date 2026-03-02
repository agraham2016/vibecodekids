/**
 * Age-Gate Middleware
 *
 * Centralized server-side enforcement of age-tier feature access.
 * UI should mirror these rules but the server is the source of truth.
 *
 * Usage:
 *   import { ageGate } from '../middleware/ageGate.js';
 *   const check = ageGate(user, 'publish');
 *   if (!check.allowed) return res.status(403).json({ error: check.reason });
 */

const FEATURE_RULES = {
  publish: {
    requiresConsent: true,
    juniorRequires: 'publishingEnabled',
    denyReason: 'Publishing is not enabled for your account. A parent must enable it in the Parent Command Center.',
  },
  multiplayer: {
    requiresConsent: true,
    juniorRequires: 'multiplayerEnabled',
    denyReason: 'Multiplayer is not enabled for your account. A parent must enable it in the Parent Command Center.',
  },
  generate: {
    requiresConsent: true,
    juniorRequires: null,
    denyReason: null,
  },
  discord: {
    requiresConsent: false,
    juniorBlocked: true,
    denyReason: 'Discord is only available for users aged 13 and older.',
  },
};

/**
 * Check whether a user is allowed to use a feature.
 *
 * @param {object} user - The user object (from readUser)
 * @param {string} feature - Feature key from FEATURE_RULES
 * @returns {{ allowed: boolean, reason?: string }}
 */
export function ageGate(user, feature) {
  if (!user) return { allowed: false, reason: 'Authentication required.' };

  const rule = FEATURE_RULES[feature];
  if (!rule) return { allowed: true };

  if (user.status === 'suspended' || user.status === 'deleted' || user.status === 'denied') {
    return { allowed: false, reason: 'Your account is not active.' };
  }

  const isJunior = user.ageBracket === 'under13';

  if (rule.requiresConsent && isJunior) {
    if (user.parentalConsentStatus !== 'granted') {
      return { allowed: false, reason: 'Parental consent is required for this feature.' };
    }
  }

  if (rule.juniorBlocked && isJunior) {
    return { allowed: false, reason: rule.denyReason };
  }

  if (rule.juniorRequires && isJunior) {
    if (!user[rule.juniorRequires]) {
      return { allowed: false, reason: rule.denyReason };
    }
  }

  return { allowed: true };
}

export { FEATURE_RULES };
