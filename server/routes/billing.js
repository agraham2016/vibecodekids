/**
 * Billing Routes
 * 
 * Stripe checkout, webhooks, membership management.
 */

import { Router } from 'express';
import Stripe from 'stripe';
import bcrypt from 'bcrypt';
import { STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, BASE_URL, MEMBERSHIP_TIERS, BCRYPT_ROUNDS } from '../config/index.js';
import { readUser, writeUser, userExists } from '../services/storage.js';
import { checkAndResetCounters, calculateUsageRemaining } from '../middleware/rateLimit.js';

const stripe = STRIPE_SECRET_KEY ? new Stripe(STRIPE_SECRET_KEY) : null;

function hashPassword(password) {
  return bcrypt.hashSync(password, BCRYPT_ROUNDS);
}

export default function createBillingRouter(sessions) {
  const router = Router();

  // Get membership status
  router.get('/status', async (req, res) => {
    try {
      const token = req.headers.authorization?.replace('Bearer ', '');
      if (!token) return res.status(401).json({ error: 'No token provided' });

      const session = sessions.get(token);
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
      const { tier, username, displayName, password } = req.body;

      if (!stripe) return res.status(500).json({ error: 'Payment system not configured' });
      if (!['creator', 'pro'].includes(tier)) return res.status(400).json({ error: 'Invalid tier' });
      if (!username || !password || !displayName) return res.status(400).json({ error: 'Missing required fields' });

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
          passwordHash: hashPassword(password),
          tier
        }
      });

      res.json({ success: true, checkoutUrl: session.url, sessionId: session.id });
    } catch (error) {
      console.error('Stripe checkout error:', error);
      res.status(500).json({ error: 'Could not create checkout session' });
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

      const { username, displayName, passwordHash, tier } = session.metadata;
      const userId = `user_${username}`;

      if (await userExists(userId)) {
        return res.redirect('/?signup=success&message=Account already exists, please log in');
      }

      const now = new Date();
      const expireDate = new Date();
      expireDate.setMonth(expireDate.getMonth() + 1);

      const user = {
        id: userId,
        username,
        displayName,
        passwordHash,
        status: 'approved',
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
        lastLoginAt: null
      };

      await writeUser(userId, user);
      console.log('✅ User account created:', userId);
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
          const users = await (await import('../services/storage.js')).listUsers();
          for (const user of users) {
            if (user.stripeSubscriptionId === subscription.id) {
              if (subscription.status === 'active') {
                user.membershipExpires = new Date(subscription.current_period_end * 1000).toISOString();
              } else if (['canceled', 'unpaid', 'past_due'].includes(subscription.status)) {
                user.membershipTier = 'free';
                user.membershipExpires = null;
              }
              await writeUser(user.id, user);
              break;
            }
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
      const session = sessions.get(token);
      if (!session) return res.status(401).json({ error: 'Invalid or expired session' });
      if (!['creator', 'pro'].includes(tier)) return res.status(400).json({ error: 'Invalid tier' });
      if (!stripe) return res.status(500).json({ error: 'Payment system not configured' });

      const priceId = MEMBERSHIP_TIERS[tier].stripePriceId;
      const user = await readUser(session.userId);

      const checkoutSession = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [{ price: priceId, quantity: 1 }],
        mode: 'subscription',
        success_url: `${BASE_URL}/api/stripe/upgrade-success?session_id={CHECKOUT_SESSION_ID}&user_id=${session.userId}`,
        cancel_url: `${BASE_URL}/?upgrade_cancelled=true`,
        customer_email: user.email || undefined,
        metadata: { userId: session.userId, tier }
      });

      res.json({ success: true, checkoutUrl: checkoutSession.url });
    } catch (error) {
      console.error('Upgrade error:', error);
      res.status(500).json({ error: 'Could not process upgrade' });
    }
  });

  // Upgrade success
  router.get('/upgrade-success', async (req, res) => {
    try {
      const { session_id, user_id } = req.query;
      if (!stripe || !session_id || !user_id) return res.redirect('/?error=upgrade_failed');

      const session = await stripe.checkout.sessions.retrieve(session_id);
      if (session.payment_status !== 'paid') return res.redirect('/?error=payment_incomplete');

      const { tier } = session.metadata;
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

      const session = sessions.get(token);
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
