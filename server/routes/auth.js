/**
 * Authentication Routes
 * 
 * Registration, login, logout, session validation, user projects.
 */

import { Router } from 'express';
import crypto from 'crypto';
import bcrypt from 'bcrypt';
import { BCRYPT_ROUNDS, MEMBERSHIP_TIERS } from '../config/index.js';
import { readUser, writeUser, userExists, listProjects } from '../services/storage.js';
import { generateToken } from '../services/sessions.js';
import { filterContent } from '../middleware/contentFilter.js';
import { checkAndResetCounters, calculateUsageRemaining } from '../middleware/rateLimit.js';
import { getAgeBracket, requiresParentalConsent, createConsentRequest, sendConsentEmail } from '../services/consent.js';

export default function createAuthRouter(sessions) {
  const router = Router();

  // Register
  router.post('/register', async (req, res) => {
    try {
      const { username, password, displayName, age, parentEmail, privacyAccepted } = req.body;

      if (!username || !password || !displayName) {
        return res.status(400).json({ error: 'Username, password, and display name are required' });
      }
      if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
        return res.status(400).json({ error: 'Username must be 3-20 characters (letters, numbers, underscore only)' });
      }
      if (password.length < 4) {
        return res.status(400).json({ error: 'Password must be at least 4 characters' });
      }
      if (displayName.length < 1 || displayName.length > 30) {
        return res.status(400).json({ error: 'Display name must be 1-30 characters' });
      }

      // COPPA: Require age
      if (typeof age !== 'number' || age < 5 || age > 120) {
        return res.status(400).json({ error: 'Please enter a valid age' });
      }

      // COPPA: Require privacy policy acceptance
      if (!privacyAccepted) {
        return res.status(400).json({ error: 'You must accept the privacy policy to create an account' });
      }

      const ageBracket = getAgeBracket(age);
      const needsConsent = requiresParentalConsent(ageBracket);

      // COPPA: Under-13 users MUST provide a parent email
      if (needsConsent && !parentEmail) {
        return res.status(400).json({ 
          error: 'A parent or guardian email is required for users under 13',
          requiresParentEmail: true
        });
      }

      // Validate parent email format
      if (needsConsent && parentEmail) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(parentEmail)) {
          return res.status(400).json({ error: 'Please enter a valid parent email address' });
        }
      }

      const usernameCheck = filterContent(username);
      const displayNameCheck = filterContent(displayName);
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
        passwordHash: bcrypt.hashSync(password, BCRYPT_ROUNDS),
        status: 'pending',
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
        parentEmail: needsConsent ? parentEmail.toLowerCase().trim() : null,
        parentalConsentStatus: needsConsent ? 'pending' : 'not_required',
        parentalConsentAt: null,
        privacyAcceptedAt: now.toISOString(),
      };

      await writeUser(userId, user);

      // COPPA: Send parental consent email for under-13
      let responseMessage;
      if (needsConsent) {
        const token = await createConsentRequest(userId, parentEmail, 'consent');
        await sendConsentEmail(parentEmail, username, token, 'consent');
        responseMessage = 'Account created! We\'ve sent an email to your parent/guardian for approval. They need to approve before you can log in.';
        console.log(`👶 Under-13 registration: ${username} → consent email sent to ${parentEmail}`);
      } else {
        responseMessage = 'Account created! Please wait for admin approval before logging in.';
      }

      res.json({ 
        success: true, 
        message: responseMessage,
        requiresParentalConsent: needsConsent,
      });
    } catch (error) {
      console.error('Register error:', error);
      res.status(500).json({ error: 'Could not create account', debug: error.message });
    }
  });

  // Login
  router.post('/login', async (req, res) => {
    try {
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
          return res.status(401).json({ error: 'Username not found' });
        }
        throw err;
      }

      // Check password -- supports both bcrypt and legacy SHA-256 hashes
      const isLegacySHA256 = /^[a-f0-9]{64}$/i.test(user.passwordHash);
      let passwordValid = false;

      if (isLegacySHA256) {
        // Legacy SHA-256 hash: verify and auto-upgrade to bcrypt
        const sha256Hash = crypto.createHash('sha256').update(password).digest('hex');
        if (sha256Hash === user.passwordHash) {
          passwordValid = true;
          // Silently upgrade to bcrypt
          user.passwordHash = bcrypt.hashSync(password, BCRYPT_ROUNDS);
          await writeUser(user.id, user);
          console.log(`🔄 Auto-upgraded password hash for user: ${user.username}`);
        }
      } else {
        // bcrypt hash
        passwordValid = bcrypt.compareSync(password, user.passwordHash);
      }

      if (!passwordValid) {
        return res.status(401).json({ error: 'Incorrect password' });
      }

      if (user.status === 'pending') {
        // Check if waiting on parental consent or admin approval
        if (user.parentalConsentStatus === 'pending') {
          return res.status(403).json({ error: 'We\'re still waiting for your parent/guardian to approve your account. Ask them to check their email!' });
        }
        return res.status(403).json({ error: 'Your account is pending approval. Please wait for an admin to approve it.' });
      }
      if (user.status === 'denied') {
        return res.status(403).json({ error: 'Your account has been denied. Please contact support.' });
      }
      if (user.status === 'deleted') {
        return res.status(403).json({ error: 'This account has been deleted.' });
      }
      // COPPA: Block login if parental consent was revoked
      if (user.parentalConsentStatus === 'revoked' || user.parentalConsentStatus === 'denied') {
        return res.status(403).json({ error: 'Parental consent is required for this account. Please contact support.' });
      }

      const token = generateToken();
      await sessions.set(token, {
        userId: user.id,
        username: user.username,
        displayName: user.displayName,
        createdAt: Date.now()
      });

      user.lastLoginAt = new Date().toISOString();
      const updatedUser = checkAndResetCounters(user);

      const showUpgradePrompt = (
        updatedUser.membershipTier === 'free' && !updatedUser.hasSeenUpgradePrompt
      );
      if (showUpgradePrompt) {
        updatedUser.hasSeenUpgradePrompt = true;
      }

      await writeUser(userId, updatedUser);

      const usage = calculateUsageRemaining(updatedUser);
      const { passwordHash, recentRequests, rateLimitedUntil, parentEmail, ...safeUser } = updatedUser;

      res.json({
        success: true,
        token,
        user: safeUser,
        membership: usage,
        showUpgradePrompt,
        tiers: MEMBERSHIP_TIERS
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ error: 'Could not log in', debug: error.message });
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
      const { passwordHash, recentRequests, rateLimitedUntil, parentEmail, ...safeUser } = user;

      res.json({ user: safeUser, membership: usage });
    } catch (error) {
      console.error('Auth check error:', error);
      res.status(500).json({ error: 'Could not verify session' });
    }
  });

  // Logout
  router.post('/logout', async (req, res) => {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (token) await sessions.delete(token);
    res.json({ success: true });
  });

  // Get user's projects
  router.get('/my-projects', async (req, res) => {
    try {
      const token = req.headers.authorization?.replace('Bearer ', '');
      if (!token) return res.status(401).json({ error: 'No token provided' });

      const session = await sessions.get(token);
      if (!session) return res.status(401).json({ error: 'Invalid or expired session' });

      const allProjects = await listProjects();
      const userProjects = allProjects
        .filter(p => p.userId === session.userId)
        .map(p => ({
          id: p.id,
          title: p.title,
          category: p.category,
          isPublic: p.isPublic,
          createdAt: p.createdAt,
          views: p.views || 0,
          likes: p.likes || 0
        }))
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

      res.json(userProjects);
    } catch (error) {
      console.error('Get my projects error:', error);
      res.status(500).json({ error: 'Could not load projects' });
    }
  });

  return router;
}
