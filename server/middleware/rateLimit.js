/**
 * Rate Limiting Middleware
 * 
 * Per-user rate limiting and tier-based usage tracking.
 */

import { RATE_LIMITS, MEMBERSHIP_TIERS } from '../config/index.js';
import { readUser, writeUser } from '../services/storage.js';

// ========== COUNTER HELPERS ==========

export function checkAndResetCounters(user) {
  const now = new Date();
  const today = now.toISOString().split('T')[0];
  const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  if (!user.dailyResetDate || !user.dailyResetDate.startsWith(today)) {
    user.promptsToday = 0;
    user.playsToday = 0;
    user.dailyResetDate = now.toISOString();
  }

  const userMonth = user.monthlyResetDate ? user.monthlyResetDate.substring(0, 7) : '';
  if (userMonth !== thisMonth) {
    user.gamesCreatedThisMonth = 0;
    user.aiCoversUsedThisMonth = 0;
    user.aiSpritesUsedThisMonth = 0;
    user.monthlyResetDate = now.toISOString();
  }

  return user;
}

export function getUserLimits(user) {
  const tier = user.membershipTier || 'free';
  return MEMBERSHIP_TIERS[tier] || MEMBERSHIP_TIERS.free;
}

export function calculateUsageRemaining(user) {
  const limits = getUserLimits(user);
  user = checkAndResetCounters(user);

  return {
    tier: user.membershipTier || 'free',
    tierName: limits.name,
    gamesRemaining: Math.max(0, limits.gamesPerMonth - (user.gamesCreatedThisMonth || 0)),
    gamesLimit: limits.gamesPerMonth,
    promptsRemaining: Math.max(0, limits.promptsPerDay - (user.promptsToday || 0)),
    promptsLimit: limits.promptsPerDay,
    aiCoversRemaining: Math.max(0, limits.aiCoversPerMonth - (user.aiCoversUsedThisMonth || 0)),
    aiCoversLimit: limits.aiCoversPerMonth,
    canAccessPremiumAssets: limits.canAccessPremiumAssets
  };
}

// ========== RATE LIMIT CHECKS ==========

export async function checkRateLimits(userId) {
  if (!userId) return { allowed: true };

  try {
    let user = await readUser(userId);
    const now = Date.now();

    // Check cooldown
    if (user.rateLimitedUntil && now < new Date(user.rateLimitedUntil).getTime()) {
      const waitSeconds = Math.ceil((new Date(user.rateLimitedUntil).getTime() - now) / 1000);
      return {
        allowed: false,
        reason: 'cooldown',
        waitSeconds,
        message: `Slow down! Take a ${Math.ceil(waitSeconds / 60)}-minute break and try again.`
      };
    }

    // Clean old requests
    user.recentRequests = (user.recentRequests || [])
      .filter(ts => now - ts < 60 * 60 * 1000);

    // Per-minute limit
    const lastMinuteRequests = user.recentRequests.filter(ts => now - ts < 60 * 1000);
    if (lastMinuteRequests.length >= RATE_LIMITS.promptsPerMinute) {
      user.rateLimitedUntil = new Date(now + RATE_LIMITS.cooldownMinutes * 60 * 1000).toISOString();
      await writeUser(userId, user);
      return {
        allowed: false,
        reason: 'rate_limit',
        message: 'Whoa, slow down! 🐢 Take a 5-minute break and come back with fresh ideas!'
      };
    }

    // Per-hour limit
    const lastHourRequests = user.recentRequests.filter(ts => now - ts < 60 * 60 * 1000);
    if (lastHourRequests.length >= RATE_LIMITS.promptsPerHour) {
      return {
        allowed: false,
        reason: 'hourly_limit',
        message: "You've been super creative this hour! 🌟 Take a short break and come back soon."
      };
    }

    // Track request
    user.recentRequests.push(now);
    await writeUser(userId, user);

    return { allowed: true };
  } catch {
    return { allowed: true };
  }
}

export async function checkTierLimits(userId, action) {
  if (!userId) {
    return {
      allowed: false,
      reason: 'login_required',
      message: 'Please log in to create games! It only takes a minute. 🚀'
    };
  }

  try {
    let user = await readUser(userId);
    user = checkAndResetCounters(user);
    const limits = getUserLimits(user);

    if (action === 'generate') {
      if ((user.promptsToday || 0) >= limits.promptsPerDay) {
        return {
          allowed: false,
          reason: 'daily_limit',
          message: `You've used all ${limits.promptsPerDay} prompts for today! 🌙 Come back tomorrow for more creating.`,
          upgradeRequired: true
        };
      }
      const gamesRemaining = limits.gamesPerMonth - (user.gamesCreatedThisMonth || 0);
      return { allowed: true, user, gamesRemaining, promptsRemaining: limits.promptsPerDay - (user.promptsToday || 0) };
    }

    if (action === 'save_game') {
      if ((user.gamesCreatedThisMonth || 0) >= limits.gamesPerMonth) {
        return {
          allowed: false,
          reason: 'monthly_limit',
          message: `You've created ${limits.gamesPerMonth} games this month! 🎮 Upgrade to create more.`,
          upgradeRequired: true
        };
      }
      return { allowed: true, user };
    }

    if (action === 'ai_cover') {
      if (limits.aiCoversPerMonth === 0) {
        return {
          allowed: false,
          reason: 'tier_required',
          message: 'AI Cover Art is a Creator feature! ✨ Upgrade to unlock.',
          upgradeRequired: true
        };
      }
      if ((user.aiCoversUsedThisMonth || 0) >= limits.aiCoversPerMonth) {
        return {
          allowed: false,
          reason: 'monthly_limit',
          message: `You've used all ${limits.aiCoversPerMonth} AI covers this month.`,
          upgradeRequired: true
        };
      }
      return { allowed: true, user };
    }

    return { allowed: true, user };
  } catch {
    return { allowed: false, reason: 'error', message: 'Could not verify your account.' };
  }
}

export async function incrementUsage(userId, action) {
  if (!userId) return;

  try {
    let user = await readUser(userId);
    user = checkAndResetCounters(user);

    if (action === 'generate') {
      user.promptsToday = (user.promptsToday || 0) + 1;
    } else if (action === 'save_game') {
      user.gamesCreatedThisMonth = (user.gamesCreatedThisMonth || 0) + 1;
    } else if (action === 'ai_cover') {
      user.aiCoversUsedThisMonth = (user.aiCoversUsedThisMonth || 0) + 1;
    }

    await writeUser(userId, user);
  } catch (error) {
    console.error('Error incrementing usage:', error);
  }
}
