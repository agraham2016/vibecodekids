/**
 * Authentication Routes
 *
 * Registration, login, logout, session validation, user projects.
 */

import { Router } from 'express';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import {
  BCRYPT_ROUNDS,
  MEMBERSHIP_TIERS,
  CONSENT_POLICY_VERSION,
  RECAPTCHA_SECRET_KEY,
  RECAPTCHA_SITE_KEY,
} from '../config/index.js';
import log from '../services/logger.js';
import { readUser, writeUser, userExists, listProjects } from '../services/storage.js';
import { generateToken } from '../services/sessions.js';
import { filterContent } from '../middleware/contentFilter.js';
import { checkAndResetCounters, calculateUsageRemaining } from '../middleware/rateLimit.js';
import {
  getAgeBracket,
  requiresParentalConsent,
  createConsentRequest,
  sendConsentEmail,
  sendParentNotificationEmail,
  createParentDashboardToken,
  sendPasswordResetEmail,
} from '../services/consent.js';
import { createResetToken, getResetByToken, consumeToken } from '../services/passwordReset.js';

const loginAttempts = new Map();
const forgotPasswordAttempts = new Map();
const LOGIN_WINDOW_MS = 60 * 1000;
const LOGIN_MAX_ATTEMPTS = 5;

// Rate limit: max 3 signups per parent email per 24h
const parentEmailSignups = new Map();
const PARENT_EMAIL_WINDOW = 24 * 60 * 60 * 1000;
const PARENT_EMAIL_MAX_SIGNUPS = 3;

function checkParentEmailRateLimit(email) {
  if (!email) return true;
  const key = email.toLowerCase().trim();
  const now = Date.now();
  const entry = parentEmailSignups.get(key);
  if (!entry || now - entry.windowStart >= PARENT_EMAIL_WINDOW) {
    parentEmailSignups.set(key, { windowStart: now, count: 1 });
    return true;
  }
  if (entry.count >= PARENT_EMAIL_MAX_SIGNUPS) return false;
  entry.count++;
  return true;
}

function checkLoginRateLimit(ip) {
  const now = Date.now();
  const entry = loginAttempts.get(ip);
  if (!entry || now - entry.windowStart > LOGIN_WINDOW_MS) {
    loginAttempts.set(ip, { windowStart: now, count: 1 });
    return true;
  }
  entry.count++;
  if (entry.count > LOGIN_MAX_ATTEMPTS) return false;
  return true;
}

function checkForgotPasswordRateLimit(ip) {
  const now = Date.now();
  const entry = forgotPasswordAttempts.get(ip);
  if (!entry || now - entry.windowStart > LOGIN_WINDOW_MS) {
    forgotPasswordAttempts.set(ip, { windowStart: now, count: 1 });
    return true;
  }
  entry.count++;
  if (entry.count > LOGIN_MAX_ATTEMPTS) return false;
  return true;
}

setInterval(() => {
  const now = Date.now();
  for (const [ip, entry] of loginAttempts) {
    if (now - entry.windowStart > LOGIN_WINDOW_MS * 2) loginAttempts.delete(ip);
  }
  for (const [ip, entry] of forgotPasswordAttempts) {
    if (now - entry.windowStart > LOGIN_WINDOW_MS * 2) forgotPasswordAttempts.delete(ip);
  }
}, 60 * 1000);

async function verifyRecaptcha(token) {
  if (!RECAPTCHA_SECRET_KEY) return true; // Skip if not configured
  if (!token) return false;
  try {
    const resp = await fetch('https://www.google.com/recaptcha/api/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `secret=${encodeURIComponent(RECAPTCHA_SECRET_KEY)}&response=${encodeURIComponent(token)}`,
    });
    const data = await resp.json();
    return data.success && (data.score === undefined || data.score >= 0.5);
  } catch {
    return true; // Fail open if Google is unreachable
  }
}

export default function createAuthRouter(sessions) {
  const router = Router();

  // Serve reCAPTCHA site key to frontend
  router.get('/recaptcha-key', (_req, res) => {
    res.json({ siteKey: RECAPTCHA_SITE_KEY || null });
  });

  // Register
  router.post('/register', async (req, res) => {
    try {
      const {
        username,
        password,
        displayName,
        age,
        birthdate,
        parentEmail,
        recoveryEmail,
        privacyAccepted,
        recaptchaToken,
      } = req.body;

      // reCAPTCHA verification (skipped if key not configured)
      if (RECAPTCHA_SECRET_KEY) {
        const captchaValid = await verifyRecaptcha(recaptchaToken);
        if (!captchaValid) {
          return res.status(400).json({ error: 'Bot verification failed. Please try again.' });
        }
      }

      if (!username || !password || !displayName) {
        return res.status(400).json({ error: 'Username, password, and display name are required' });
      }
      if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
        return res.status(400).json({ error: 'Username must be 3-20 characters (letters, numbers, underscore only)' });
      }
      if (password.length < 8) {
        return res
          .status(400)
          .json({ error: "Password must be at least 8 characters. Try a fun phrase like 'pizza-dragon-rainbow'!" });
      }
      if (displayName.length < 1 || displayName.length > 30) {
        return res.status(400).json({ error: 'Display name must be 1-30 characters' });
      }

      // COPPA: Require age
      if (typeof age !== 'number' || age < 5 || age > 120) {
        return res.status(400).json({ error: "Hmm, that age doesn't look right. Try again?" });
      }

      // COPPA: Require privacy policy acceptance
      if (!privacyAccepted) {
        return res.status(400).json({ error: 'One more thing — check the box to agree to the rules!' });
      }

      const ageBracket = getAgeBracket(age);
      const needsConsent = requiresParentalConsent(ageBracket);
      const isMinor = ageBracket === 'under13' || ageBracket === '13to17';

      // Under-18 users MUST provide a parent email
      if (isMinor && !parentEmail) {
        return res.status(400).json({
          error: "We need a parent's email to keep you safe. Ask a grown-up to type theirs!",
          requiresParentEmail: true,
        });
      }

      // Validate parent email format
      if (isMinor && parentEmail) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(parentEmail)) {
          return res.status(400).json({ error: 'Please enter a valid parent email address' });
        }
      }

      // Rate limit signups per parent email (max 3 per 24h)
      if (isMinor && parentEmail && !checkParentEmailRateLimit(parentEmail)) {
        return res.status(429).json({
          error: 'This parent email has been used for too many signups recently. Please try again later.',
        });
      }

      // Validate recovery email for adults (optional)
      if (!isMinor && recoveryEmail) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(recoveryEmail)) {
          return res.status(400).json({ error: 'Please enter a valid recovery email address' });
        }
      }

      const usernameCheck = filterContent(username, { source: 'auth' });
      const displayNameCheck = filterContent(displayName, { source: 'auth' });
      if (usernameCheck.blocked || displayNameCheck.blocked) {
        return res.status(400).json({ error: 'Please choose a different username or display name' });
      }

      const userId = `user_${username.toLowerCase()}`;
      if (await userExists(userId)) {
        return res.status(400).json({ error: 'Username already taken' });
      }

      const now = new Date();
      const user = {
        id: userId,
        username: username.toLowerCase(),
        displayName: displayName.trim(),
        passwordHash: await bcrypt.hash(password, BCRYPT_ROUNDS),
        status: needsConsent ? 'pending' : 'approved',
        createdAt: now.toISOString(),
        projectCount: 0,
        membershipTier: 'free',
        membershipExpires: null,
        gamesCreatedThisMonth: 0,
        aiCoversUsedThisMonth: 0,
        aiSpritesUsedThisMonth: 0,
        monthlyResetDate: now.toISOString(),
        promptsToday: 0,
        playsToday: 0,
        dailyResetDate: now.toISOString(),
        recentRequests: [],
        rateLimitedUntil: null,
        hasSeenUpgradePrompt: false,
        lastLoginAt: null,
        // COPPA fields
        ageBracket,
        birthdate: birthdate || null,
        parentEmail: isMinor ? parentEmail.toLowerCase().trim() : null,
        recoveryEmail: !isMinor && recoveryEmail ? recoveryEmail.toLowerCase().trim() : null,
        parentalConsentStatus: needsConsent ? 'pending' : 'not_required',
        parentalConsentAt: null,
        approvedAt: needsConsent ? null : now.toISOString(),
        privacyAcceptedAt: now.toISOString(),
      };

      await writeUser(userId, user);

      let responseMessage;
      if (needsConsent) {
        // Under-13: consent required before account is active
        const token = await createConsentRequest(userId, parentEmail, 'consent');
        await sendConsentEmail(parentEmail, username, token, 'consent');
        responseMessage =
          "Account created! We've sent an email to your parent/guardian for approval. They need to approve before you can log in.";
        log.info({ username, event: 'register_under13' }, 'Under-13 registration — consent email sent');
      } else if (isMinor) {
        // 13-17: account active immediately, parent gets a notification with dashboard link
        const dashToken = await createParentDashboardToken(userId);
        await sendParentNotificationEmail(parentEmail, username, dashToken);
        responseMessage = "Account created! You can log in now. We've notified your parent about your account.";
        log.info({ username, event: 'register_teen' }, 'Teen registration — parent notification sent');
      } else {
        responseMessage = 'Account created! You can log in now.';
      }

      res.json({
        success: true,
        message: responseMessage,
        requiresParentalConsent: needsConsent,
      });
    } catch (error) {
      log.error({ err: error }, 'Register error');
      res.status(500).json({ error: 'Oops! Something went wrong. Try again?' });
    }
  });

  // Login
  router.post('/login', async (req, res) => {
    try {
      const clientIp = req.ip || req.connection?.remoteAddress || 'unknown';
      if (!checkLoginRateLimit(clientIp)) {
        return res.status(429).json({ error: 'Too many login attempts. Please wait a minute and try again.' });
      }

      const { username, password } = req.body;
      if (!username || !password) {
        return res.status(400).json({ error: 'Username and password are required' });
      }

      const userId = `user_${username.toLowerCase()}`;

      let user;
      try {
        user = await readUser(userId);
      } catch (err) {
        if (err.code === 'ENOENT') {
          return res.status(401).json({ error: 'Invalid username or password' });
        }
        throw err;
      }

      // Reject legacy SHA-256 hashes — force password reset
      const isLegacySHA256 = /^[a-f0-9]{64}$/i.test(user.passwordHash);
      if (isLegacySHA256) {
        return res.status(401).json({
          error: 'Your password needs to be updated for security. Please use "Forgot Password" to set a new one.',
          requiresPasswordReset: true,
        });
      }

      const passwordValid = await bcrypt.compare(password, user.passwordHash);
      if (!passwordValid) {
        return res.status(401).json({ error: 'Invalid username or password' });
      }

      if (user.status === 'pending') {
        // Check if waiting on parental consent or admin approval
        if (user.parentalConsentStatus === 'pending') {
          return res.status(403).json({
            error:
              "We're still waiting for your parent/guardian to approve your account. Ask them to check their email!",
          });
        }
        return res
          .status(403)
          .json({ error: 'Your account is pending approval. Please wait for an admin to approve it.' });
      }
      if (user.status === 'denied') {
        return res.status(403).json({ error: 'Your account has been denied. Please contact support.' });
      }
      if (user.status === 'suspended') {
        const until = user.suspendedUntil ? new Date(user.suspendedUntil) : null;
        if (until && until < new Date()) {
          user.status = 'approved';
          user.suspendedAt = null;
          user.suspendReason = null;
          user.suspendedUntil = null;
          await writeUser(userId, user);
        } else {
          const msg = until
            ? `Your account is suspended until ${until.toLocaleDateString()}.`
            : 'Your account has been suspended. Contact support.';
          return res.status(403).json({ error: msg });
        }
      }
      if (user.status === 'deleted') {
        return res.status(403).json({ error: 'This account has been deleted.' });
      }
      // COPPA: Block login if parental consent was revoked
      if (user.parentalConsentStatus === 'revoked' || user.parentalConsentStatus === 'denied') {
        return res
          .status(403)
          .json({ error: 'Parental consent is required for this account. Please contact support.' });
      }
      // COPPA: Block login if consent policy version is stale (re-consent required)
      if (
        user.ageBracket === 'under13' &&
        user.parentalConsentStatus === 'granted' &&
        user.consentPolicyVersion !== CONSENT_POLICY_VERSION
      ) {
        return res.status(403).json({
          error:
            'Our privacy policy has been updated. Ask your parent to check their email and approve again so you can log in!',
        });
      }

      const token = generateToken();
      const userAgent = req.headers['user-agent'] || '';
      await sessions.set(token, {
        userId: user.id,
        username: user.username,
        displayName: user.displayName,
        createdAt: Date.now(),
        boundUserAgent: userAgent,
      });

      user.lastLoginAt = new Date().toISOString();
      const updatedUser = checkAndResetCounters(user);

      const showUpgradePrompt = updatedUser.membershipTier === 'free' && !updatedUser.hasSeenUpgradePrompt;
      if (showUpgradePrompt) {
        updatedUser.hasSeenUpgradePrompt = true;
      }

      await writeUser(userId, updatedUser);

      const usage = calculateUsageRemaining(updatedUser);
      const {
        passwordHash: _ph,
        recentRequests: _rr,
        rateLimitedUntil: _rl,
        parentEmail: _pe,
        ...safeUser
      } = updatedUser;

      log.info({ userId: user.id, event: 'login_success' }, 'User logged in');

      res.json({
        success: true,
        token,
        user: safeUser,
        membership: usage,
        showUpgradePrompt,
        tiers: MEMBERSHIP_TIERS,
      });
    } catch (error) {
      log.error({ err: error }, 'Login error');
      res.status(500).json({ error: 'Could not log in' });
    }
  });

  // Get current user
  router.get('/me', async (req, res) => {
    try {
      const token = req.headers.authorization?.replace('Bearer ', '');
      if (!token) return res.status(401).json({ error: 'No token provided' });

      const session = await sessions.get(token);
      if (!session) return res.status(401).json({ error: 'Invalid or expired session' });

      let user = await readUser(session.userId);
      if (user.status !== 'approved') {
        await sessions.delete(token);
        return res.status(403).json({ error: 'Account no longer approved' });
      }

      user = checkAndResetCounters(user);
      const usage = calculateUsageRemaining(user);
      const { passwordHash: _ph2, recentRequests: _rr2, rateLimitedUntil: _rl2, parentEmail: _pe2, ...safeUser } = user;

      res.json({ user: safeUser, membership: usage });
    } catch (error) {
      log.error({ err: error }, 'Auth check error');
      res.status(500).json({ error: 'Could not verify session' });
    }
  });

  // Logout
  router.post('/logout', async (req, res) => {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (token) await sessions.delete(token);
    res.json({ success: true });
  });

  // Forgot password (COPPA-compliant: under-13 → parent email, 13+ → recovery email)
  const genericForgotSuccess = {
    success: true,
    message: "If an account exists and has a recovery email on file, we've sent reset instructions.",
  };
  router.post('/forgot-password', async (req, res) => {
    try {
      const clientIp = req.ip || req.connection?.remoteAddress || 'unknown';
      if (!checkForgotPasswordRateLimit(clientIp)) {
        return res.status(429).json({ error: 'Too many attempts. Please wait a minute and try again.' });
      }

      const { username } = req.body;
      if (!username || typeof username !== 'string' || !username.trim()) {
        return res.json(genericForgotSuccess);
      }

      const userId = `user_${username.toLowerCase().trim()}`;
      let user;
      try {
        user = await readUser(userId);
      } catch (err) {
        if (err.code === 'ENOENT') return res.json(genericForgotSuccess);
        throw err;
      }

      if (user.status !== 'approved') return res.json(genericForgotSuccess);

      let recipientEmail = null;
      if (user.ageBracket === 'under13') {
        recipientEmail = user.parentEmail || null;
      } else {
        recipientEmail = user.recoveryEmail || null;
      }

      if (!recipientEmail) return res.json(genericForgotSuccess);

      const token = await createResetToken(userId, recipientEmail);
      await sendPasswordResetEmail(recipientEmail, user.username, token);

      return res.json(genericForgotSuccess);
    } catch (error) {
      log.error({ err: error }, 'Forgot password error');
      return res.json(genericForgotSuccess);
    }
  });

  // Reset password (token from email link)
  router.post('/reset-password', async (req, res) => {
    try {
      const { token, newPassword } = req.body;
      if (!token || !newPassword) {
        return res.status(400).json({ error: 'Token and new password are required' });
      }
      if (typeof newPassword !== 'string' || newPassword.length < 8) {
        return res
          .status(400)
          .json({ error: "Password must be at least 8 characters. Try a fun phrase like 'pizza-dragon-rainbow'!" });
      }

      const record = await getResetByToken(token);
      if (!record) {
        return res.status(400).json({ error: 'This reset link is invalid or expired. Please request a new one.' });
      }

      const user = await readUser(record.userId);
      user.passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
      await writeUser(record.userId, user);
      await consumeToken(token);

      return res.json({ success: true, message: 'Password updated. You can now log in.' });
    } catch (error) {
      if (error.code === 'ENOENT') {
        return res.status(400).json({ error: 'This reset link is invalid or expired. Please request a new one.' });
      }
      log.error({ err: error }, 'Reset password error');
      return res.status(500).json({ error: 'Could not reset password. Please try again or contact support.' });
    }
  });

  // Get user's projects
  router.get('/my-projects', async (req, res) => {
    try {
      const token = req.headers.authorization?.replace('Bearer ', '');
      if (!token) return res.status(401).json({ error: 'No token provided' });

      const session = await sessions.get(token);
      if (!session) {
        log.info({ event: 'my_projects_no_session', tokenPrefix: token.slice(0, 6) }, 'No session for token');
        return res.status(401).json({ error: 'Invalid or expired session' });
      }

      // Reject if client claims a different user (catches token/localStorage mix-up)
      const expectedUser = req.headers['x-expected-user'];
      if (expectedUser && expectedUser !== session.userId) {
        log.warn(
          { sessionUserId: session.userId, expectedUser, event: 'my_projects_user_mismatch' },
          'Token/user mismatch — forcing re-login',
        );
        return res.status(401).json({ error: 'Session mismatch. Please log in again.' });
      }

      const allProjects = await listProjects();
      const userProjects = allProjects
        .filter((p) => p.userId === session.userId)
        .map((p) => ({
          id: p.id,
          title: p.title,
          category: p.category,
          engineId: p.gameConfig?.engineId || null,
          genreFamily: p.gameConfig?.genreFamily || null,
          isPublic: p.isPublic,
          createdAt: p.createdAt,
          views: p.views || 0,
          likes: p.likes || 0,
        }))
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

      // Diagnostic: for support tracing (LOG_LEVEL=debug to see)
      log.debug(
        { sessionUserId: session.userId, projectCount: userProjects.length, event: 'my_projects_ok' },
        'my-projects returned',
      );

      res.json(userProjects);
    } catch (error) {
      log.error({ err: error }, 'Get my projects error');
      res.status(500).json({ error: 'Could not load projects' });
    }
  });

  // ===== PASSPHRASE SUGGESTIONS (kid-friendly passwords) =====

  router.get('/passphrase-suggestions', (_req, res) => {
    import('../services/passphrase.js')
      .then(({ generatePassphraseOptions }) => {
        res.json({ suggestions: generatePassphraseOptions(4) });
      })
      .catch(() => {
        res.status(500).json({ error: 'Could not generate suggestions' });
      });
  });

  // ===== MAGIC LINK LOGIN (parent-initiated) =====

  const magicTokens = new Map();
  const MAGIC_TTL = 10 * 60 * 1000; // 10 minutes

  router.post('/magic-link', async (req, res) => {
    const { parentEmail, username } = req.body;
    if (!parentEmail || !username) {
      return res.status(400).json({ error: 'Parent email and username are required' });
    }

    const userId = `user_${username.toLowerCase()}`;
    try {
      const user = await readUser(userId);
      if (!user.parentEmail || user.parentEmail.toLowerCase() !== parentEmail.toLowerCase()) {
        return res.json({ ok: true, message: 'If the account exists, a login link has been sent.' });
      }

      const magicToken = crypto.randomBytes(32).toString('hex');
      magicTokens.set(magicToken, { userId, expiresAt: Date.now() + MAGIC_TTL });

      const { BASE_URL } = await import('../config/index.js');
      const loginUrl = `${BASE_URL}/api/auth/magic-verify?token=${magicToken}`;

      try {
        const { Resend } = await import('resend');
        const resendKey = process.env.RESEND_API_KEY;
        if (resendKey) {
          const resend = new Resend(resendKey);
          await resend.emails.send({
            from: `Vibe Code Kidz <noreply@${new URL(BASE_URL).hostname}>`,
            to: parentEmail.toLowerCase(),
            subject: 'Vibe Code Kidz - Login Link',
            html: `<h2>Login Link for ${user.displayName}</h2>
                   <p>Click below to log your child in. This link expires in 10 minutes.</p>
                   <p><a href="${loginUrl}" style="background: #4CAF50; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Log In</a></p>`,
          });
        } else {
          log.info({ username, loginUrl }, 'DEV magic link generated');
        }
      } catch (err) {
        log.error({ err: err.message }, 'Failed to send magic link');
      }

      res.json({ ok: true, message: 'If the account exists, a login link has been sent.' });
    } catch (_err) {
      res.json({ ok: true, message: 'If the account exists, a login link has been sent.' });
    }
  });

  router.get('/magic-verify', async (req, res) => {
    const { token } = req.query;
    const entry = magicTokens.get(token);

    if (!entry || Date.now() > entry.expiresAt) {
      magicTokens.delete(token);
      return res.status(401).send('<html><body><h2>Link expired or invalid.</h2></body></html>');
    }

    magicTokens.delete(token);

    try {
      const user = await readUser(entry.userId);
      const sessionToken = generateToken();
      await sessions.set(sessionToken, {
        userId: user.id,
        username: user.username,
        displayName: user.displayName,
        createdAt: Date.now(),
        boundUserAgent: req.headers['user-agent'] || '',
      });

      user.lastLoginAt = new Date().toISOString();
      await writeUser(entry.userId, user);

      const { BASE_URL } = await import('../config/index.js');
      res.redirect(`${BASE_URL}/?token=${sessionToken}&magic=1`);
    } catch {
      res.status(500).send('<html><body><h2>Login failed. Please try again.</h2></body></html>');
    }
  });

  return router;
}
