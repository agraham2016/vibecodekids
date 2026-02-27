/**
 * Billing Routes
 * 
 * Stripe checkout, webhooks, membership management.
 */

import { Router } from 'express';
import Stripe from 'stripe';
import bcrypt from 'bcrypt';
import { STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, BASE_URL, MEMBERSHIP_TIERS, BCRYPT_ROUNDS, COPPA_AGE_THRESHOLD } from '../config/index.js';
import { readUser, writeUser, userExists, findUserBySubscriptionId } from '../services/storage.js';
import { checkAndResetCounters, calculateUsageRemaining } from '../middleware/rateLimit.js';
import { getAgeBracket, requiresParentalConsent, createConsentRequest, sendConsentEmail } from '../services/consent.js';
import { filterContent } from '../middleware/contentFilter.js';

const stripe = STRIPE_SECRET_KEY ? new Stripe(STRIPE_SECRET_KEY) : null;

export default function createBillingRouter(sessions) {
  const router = Router();

  // Get membership status
  router.get('/status', async (req, res) => {
    try {
      const token = req.headers.authorization?.replace('Bearer ', '');
      if (!token) return res.status(401).json({ error: 'No token provided' });

      const session = await sessions.get(token);
      if (!session) return res.status(401).json({ error: 'Invalid or expired session' });

      let user = await readUser(session.userId);
      user = checkAndResetCounters(user);
      const usage = calculateUsageRemaining(user);

      res.json({ membership: usage, tiers: MEMBERSHIP_TIERS });
    } catch (error) {
      console.error('Membership status error:', error);
      res.status(500).json({ error: 'Could not get membership status' });
    }
  });

  // Get available tiers (public)
  router.get('/tiers', (_req, res) => {
    res.json({ tiers: MEMBERSHIP_TIERS });
  });

  // Create Stripe checkout for new signup
  router.post('/checkout', async (req, res) => {
    try {
      const { tier, username, displayName, password, age, parentEmail, recoveryEmail, privacyAccepted } = req.body;

      if (!stripe) return res.status(500).json({ error: 'Payment system not configured' });
      if (!['creator', 'pro'].includes(tier)) return res.status(400).json({ error: 'Invalid tier' });
      if (!username || !password || !displayName) return res.status(400).json({ error: 'Missing required fields' });

      if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
        return res.status(400).json({ error: 'Username must be 3-20 characters (letters, numbers, underscore only)' });
      }
      if (password.length < 4) {
        return res.status(400).json({ error: 'Password must be at least 4 characters' });
      }
      if (displayName.length < 1 || displayName.length > 30) {
        return res.status(400).json({ error: 'Display name must be 1-30 characters' });
      }

      const usernameCheck = filterContent(username);
      const displayNameCheck = filterContent(displayName);
      if (usernameCheck.blocked || displayNameCheck.blocked) {
        return res.status(400).json({ error: 'Please choose a different username or display name' });
      }

      if (typeof age !== 'number' || age < 5 || age > 120) {
        return res.status(400).json({ error: 'Please enter a valid age' });
      }
      if (!privacyAccepted) {
        return res.status(400).json({ error: 'You must accept the privacy policy to create an account' });
      }

      const ageBracket = getAgeBracket(age);
      const needsConsent = requiresParentalConsent(ageBracket);

      if (needsConsent && !parentEmail) {
        return res.status(400).json({ error: 'A parent or guardian email is required for users under 13', requiresParentEmail: true });
      }
      if (needsConsent && parentEmail) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(parentEmail)) {
          return res.status(400).json({ error: 'Please enter a valid parent email address' });
        }
      }
      if (!needsConsent && recoveryEmail) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(recoveryEmail)) {
          return res.status(400).json({ error: 'Please enter a valid recovery email address' });
        }
      }

      const userId = `user_${username.toLowerCase()}`;
      if (await userExists(userId)) {
        return res.status(400).json({ error: 'Username already taken' });
      }

      const priceId = MEMBERSHIP_TIERS[tier].stripePriceId;

      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [{ price: priceId, quantity: 1 }],
        mode: 'subscription',
        success_url: `${BASE_URL}/api/stripe/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${BASE_URL}/?cancelled=true`,
        metadata: {
          username: username.toLowerCase(),
          displayName: displayName.trim(),
          password,
          tier,
          age: String(age),
          parentEmail: needsConsent ? parentEmail.toLowerCase().trim() : '',
          recoveryEmail: !needsConsent && recoveryEmail ? recoveryEmail.toLowerCase().trim() : '',
          privacyAccepted: 'true',
          ageBracket
        }
      });

      res.json({ success: true, checkoutUrl: session.url, sessionId: session.id });
    } catch (error) {
      console.error('Stripe checkout error:', error);
      const msg = (error.type && error.message) ? error.message : 'Could not create checkout session';
      res.status(500).json({ error: msg });
    }
  });

  // Stripe success redirect
  router.get('/success', async (req, res) => {
    console.log('📦 Stripe success callback received');
    try {
      const { session_id } = req.query;
      if (!stripe || !session_id) return res.redirect('/?error=payment_failed');

      const session = await stripe.checkout.sessions.retrieve(session_id);
      if (session.payment_status !== 'paid') return res.redirect('/?error=payment_incomplete');

      const { username, displayName, password, tier, age, parentEmail, recoveryEmail, ageBracket } = session.metadata;
      const userId = `user_${username}`;

      if (await userExists(userId)) {
        return res.redirect('/?signup=success&message=Account already exists, please log in');
      }

      const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
      const ageNum = parseInt(age, 10);
      const needsConsent = ageBracket === 'under13';

      const now = new Date();
      const expireDate = new Date();
      expireDate.setMonth(expireDate.getMonth() + 1);

      const user = {
        id: userId,
        username,
        displayName,
        passwordHash,
        status: needsConsent ? 'pending' : 'approved',
        createdAt: now.toISOString(),
        projectCount: 0,
        membershipTier: tier,
        membershipExpires: expireDate.toISOString(),
        stripeCustomerId: session.customer,
        stripeSubscriptionId: session.subscription,
        gamesCreatedThisMonth: 0,
        aiCoversUsedThisMonth: 0,
        aiSpritesUsedThisMonth: 0,
        monthlyResetDate: now.toISOString(),
        promptsToday: 0,
        playsToday: 0,
        dailyResetDate: now.toISOString(),
        recentRequests: [],
        rateLimitedUntil: null,
        hasSeenUpgradePrompt: true,
        lastLoginAt: null,
        ageBracket: ageBracket || 'unknown',
        parentEmail: parentEmail || null,
        recoveryEmail: recoveryEmail || null,
        parentalConsentStatus: needsConsent ? 'pending' : 'not_required',
        parentalConsentAt: null,
        privacyAcceptedAt: now.toISOString(),
      };

      await writeUser(userId, user);
      console.log('✅ User account created:', userId);

      if (needsConsent && parentEmail) {
        const consentToken = await createConsentRequest(userId, parentEmail, 'consent');
        await sendConsentEmail(parentEmail, username, consentToken, 'consent');
        console.log(`👶 Under-13 paid signup: ${username} → consent email sent to ${parentEmail}`);
        return res.redirect('/?signup=pending_consent&tier=' + tier);
      }

      res.redirect('/?signup=success&tier=' + tier);
    } catch (error) {
      console.error('❌ Stripe success handler error:', error);
      res.redirect('/?error=account_creation_failed');
    }
  });

  // Stripe webhook
  router.post('/webhook', async (req, res) => {
    const sig = req.headers['stripe-signature'];
    if (!stripe || !STRIPE_WEBHOOK_SECRET) return res.status(400).json({ error: 'Webhook not configured' });

    let event;
    try {
      event = stripe.webhooks.constructEvent(req.body, sig, STRIPE_WEBHOOK_SECRET);
    } catch (err) {
      console.error('Webhook signature verification failed:', err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    switch (event.type) {
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
        try {
          const user = await findUserBySubscriptionId(subscription.id);
          if (user) {
            if (subscription.status === 'active') {
              user.membershipExpires = new Date(subscription.current_period_end * 1000).toISOString();
            } else if (['canceled', 'unpaid', 'past_due'].includes(subscription.status)) {
              user.membershipTier = 'free';
              user.membershipExpires = null;
            }
            await writeUser(user.id, user);
          }
        } catch (err) {
          console.error('Error updating subscription:', err);
        }
        break;
      }
    }

    res.json({ received: true });
  });

  // Upgrade existing user
  router.post('/upgrade', async (req, res) => {
    try {
      const token = req.headers.authorization?.replace('Bearer ', '');
      const { tier } = req.body;

      if (!token) return res.status(401).json({ error: 'No token provided' });
      const session = await sessions.get(token);
      if (!session) return res.status(401).json({ error: 'Invalid or expired session' });
      if (!['creator', 'pro'].includes(tier)) return res.status(400).json({ error: 'Invalid tier' });
      if (!stripe) return res.status(500).json({ error: 'Payment system not configured' });

      const priceId = MEMBERSHIP_TIERS[tier].stripePriceId;
      const user = await readUser(session.userId);

      const checkoutSession = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [{ price: priceId, quantity: 1 }],
        mode: 'subscription',
        success_url: `${BASE_URL}/api/stripe/upgrade-success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${BASE_URL}/?upgrade_cancelled=true`,
        customer_email: user.email || undefined,
        metadata: { userId: session.userId, tier }
      });

      res.json({ success: true, checkoutUrl: checkoutSession.url });
    } catch (error) {
      console.error('Upgrade error:', error);
      const msg = (error.type && error.message) ? error.message : 'Could not process upgrade';
      res.status(500).json({ error: msg });
    }
  });

  // Upgrade success
  router.get('/upgrade-success', async (req, res) => {
    try {
      const { session_id } = req.query;
      if (!stripe || !session_id) return res.redirect('/?error=upgrade_failed');

      const session = await stripe.checkout.sessions.retrieve(session_id);
      if (session.payment_status !== 'paid') return res.redirect('/?error=payment_incomplete');

      const { tier, userId: user_id } = session.metadata;
      if (!user_id) return res.redirect('/?error=upgrade_failed');
      const user = await readUser(user_id);

      const expireDate = new Date();
      expireDate.setMonth(expireDate.getMonth() + 1);

      user.membershipTier = tier;
      user.membershipExpires = expireDate.toISOString();
      user.stripeCustomerId = session.customer;
      user.stripeSubscriptionId = session.subscription;

      await writeUser(user_id, user);
      res.redirect('/?upgrade=success&tier=' + tier);
    } catch (error) {
      console.error('Upgrade success handler error:', error);
      res.redirect('/?error=upgrade_failed');
    }
  });

  // Dismiss upgrade prompt
  router.post('/dismiss-prompt', async (req, res) => {
    try {
      const token = req.headers.authorization?.replace('Bearer ', '');
      if (!token) return res.status(401).json({ error: 'No token provided' });

      const session = await sessions.get(token);
      if (!session) return res.status(401).json({ error: 'Invalid or expired session' });

      const user = await readUser(session.userId);
      user.hasSeenUpgradePrompt = true;
      user.upgradePromptDismissedAt = new Date().toISOString();
      await writeUser(session.userId, user);

      res.json({ success: true });
    } catch (error) {
      console.error('Dismiss prompt error:', error);
      res.status(500).json({ error: 'Could not dismiss prompt' });
    }
  });

  return router;
}
