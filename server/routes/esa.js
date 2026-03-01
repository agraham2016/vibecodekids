/**
 * ESA / ClassWallet Routes
 *
 * Handles Arizona Empowerment Scholarship Account payments via ClassWallet.
 * While CLASSWALLET_ENABLED is false, checkout returns a "coming soon" response
 * and the waitlist endpoint collects interested parent emails.
 */

import { Router } from 'express';
import crypto from 'crypto';
import bcrypt from 'bcrypt';
import {
  CLASSWALLET_ENABLED, CLASSWALLET_API_KEY, CLASSWALLET_VENDOR_ID,
  CLASSWALLET_BASE_URL, ESA_PRICING, BASE_URL, BCRYPT_ROUNDS,
  COPPA_AGE_THRESHOLD, MEMBERSHIP_TIERS
} from '../config/index.js';
import {
  readUser, writeUser, userExists,
  createEsaOrder, getEsaOrder, updateEsaOrderStatus, listEsaOrders,
  addEsaWaitlist, listEsaWaitlist, countEsaWaitlist
} from '../services/storage.js';
import { getAgeBracket, requiresParentalConsent, createConsentRequest, sendConsentEmail } from '../services/consent.js';
import { filterContent } from '../middleware/contentFilter.js';
import { requireAdmin } from '../middleware/auth.js';

export default function createEsaRouter(sessions) {
  const adminOnly = requireAdmin(sessions);
  const router = Router();

  // ========== PUBLIC: pricing info ==========

  router.get('/pricing', (_req, res) => {
    res.json({ pricing: ESA_PRICING, enabled: CLASSWALLET_ENABLED });
  });

  // ========== PUBLIC: waitlist ==========

  router.post('/waitlist', async (req, res) => {
    try {
      const { email } = req.body;
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return res.status(400).json({ error: 'Please enter a valid email address' });
      }
      await addEsaWaitlist(email.toLowerCase().trim());
      res.json({ success: true, message: 'You\'re on the list! We\'ll notify you when ESA payments go live.' });
    } catch (error) {
      console.error('ESA waitlist error:', error);
      res.status(500).json({ error: 'Could not add to waitlist' });
    }
  });

  // ========== PUBLIC: checkout ==========

  router.post('/checkout', async (req, res) => {
    try {
      const { pricingKey, username, displayName, password, age, parentEmail, recoveryEmail, privacyAccepted } = req.body;

      const pricing = ESA_PRICING[pricingKey];
      if (!pricing) return res.status(400).json({ error: 'Invalid pricing option' });
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

      const usernameCheck = filterContent(username, { source: 'esa' });
      const displayNameCheck = filterContent(displayName, { source: 'esa' });
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
      if (needsConsent && parentEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(parentEmail)) {
        return res.status(400).json({ error: 'Please enter a valid parent email address' });
      }
      if (!needsConsent && recoveryEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recoveryEmail)) {
        return res.status(400).json({ error: 'Please enter a valid recovery email address' });
      }

      const userId = `user_${username.toLowerCase()}`;
      if (await userExists(userId)) {
        return res.status(400).json({ error: 'Username already taken' });
      }

      // If ClassWallet is not yet enabled, return coming-soon status
      if (!CLASSWALLET_ENABLED) {
        return res.json({
          comingSoon: true,
          message: 'ESA payments are launching soon! Sign up for our waitlist to be notified.'
        });
      }

      // --- Live ClassWallet flow (Phase 7) ---
      const orderRef = `esa_${crypto.randomBytes(12).toString('hex')}`;
      const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
      const now = new Date();
      const expireDate = new Date();
      expireDate.setMonth(expireDate.getMonth() + pricing.months);

      const user = {
        id: userId,
        username: username.toLowerCase(),
        displayName: displayName.trim(),
        passwordHash,
        status: needsConsent ? 'pending' : 'pending_esa',
        createdAt: now.toISOString(),
        projectCount: 0,
        membershipTier: pricing.tier,
        membershipExpires: expireDate.toISOString(),
        stripeCustomerId: null,
        stripeSubscriptionId: null,
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
        recoveryEmail: !needsConsent && recoveryEmail ? recoveryEmail.toLowerCase().trim() : null,
        parentalConsentStatus: needsConsent ? 'pending' : 'not_required',
        parentalConsentAt: null,
        privacyAcceptedAt: now.toISOString(),
        publishingEnabled: !needsConsent,
        multiplayerEnabled: !needsConsent,
        parentVerifiedMethod: null,
        parentVerifiedAt: null,
        parentDashboardToken: null,
        paymentMethod: 'classwallet',
        classwalletOrderId: orderRef,
        esaBillingPeriod: pricingKey.includes('annual') ? 'annual' : 'quarterly',
      };

      await writeUser(userId, user);
      await createEsaOrder({
        orderRef, userId, tier: pricing.tier,
        billingPeriod: user.esaBillingPeriod,
        amountCents: pricing.amount,
      });

      if (needsConsent && parentEmail) {
        const consentToken = await createConsentRequest(userId, parentEmail.toLowerCase().trim(), 'consent');
        await sendConsentEmail(parentEmail, username, consentToken, 'consent');
      }

      // TODO Phase 7: Replace with actual ClassWallet redirect URL
      const checkoutUrl = `${CLASSWALLET_BASE_URL}/checkout?vendor=${CLASSWALLET_VENDOR_ID}&order=${orderRef}&amount=${pricing.amount}`;

      res.json({ success: true, checkoutUrl, orderRef });
    } catch (error) {
      console.error('ESA checkout error:', error);
      res.status(500).json({ error: 'Could not create ESA checkout' });
    }
  });

  // ========== PUBLIC: ClassWallet callback ==========

  router.get('/callback', async (req, res) => {
    try {
      const { order_ref, txn } = req.query;
      if (!order_ref) return res.redirect('/esa?error=missing_order');

      const order = await getEsaOrder(order_ref);
      if (!order) return res.redirect('/esa?error=order_not_found');

      await updateEsaOrderStatus(order_ref, 'confirmed', { classwalletTxn: txn || null });

      if (order.user_id) {
        const user = await readUser(order.user_id);
        if (user.status === 'pending_esa') {
          user.status = 'approved';
          user.approvedAt = new Date().toISOString();
          await writeUser(user.id, user);
        }
      }

      res.redirect('/esa?success=true&order=' + order_ref);
    } catch (error) {
      console.error('ESA callback error:', error);
      res.redirect('/esa?error=callback_failed');
    }
  });

  // ========== PUBLIC: cancel ==========

  router.get('/cancel', async (req, res) => {
    const { order_ref } = req.query;
    if (order_ref) {
      try { await updateEsaOrderStatus(order_ref, 'cancelled'); } catch { /* ignore */ }
    }
    res.redirect('/esa?cancelled=true');
  });

  // ========== ADMIN: list orders ==========

  router.get('/orders', adminOnly, async (req, res) => {
    try {
      const { status } = req.query;
      const orders = await listEsaOrders(status || null);
      const waitlistCount = await countEsaWaitlist();
      res.json({ orders, waitlistCount });
    } catch (error) {
      console.error('ESA orders list error:', error);
      res.status(500).json({ error: 'Could not load ESA orders' });
    }
  });

  // ========== ADMIN: manually confirm/pay an order ==========

  router.post('/orders/:orderRef/confirm', adminOnly, async (req, res) => {
    try {
      const { orderRef } = req.params;
      const order = await getEsaOrder(orderRef);
      if (!order) return res.status(404).json({ error: 'Order not found' });

      await updateEsaOrderStatus(orderRef, 'paid');

      if (order.user_id) {
        try {
          const user = await readUser(order.user_id);
          if (user.status === 'pending_esa' || user.status === 'pending') {
            user.status = 'approved';
            user.approvedAt = new Date().toISOString();
          }
          const pricingEntry = Object.values(ESA_PRICING).find(
            p => p.tier === order.tier && p.amount === order.amount_cents
          );
          if (pricingEntry) {
            const exp = new Date();
            exp.setMonth(exp.getMonth() + pricingEntry.months);
            user.membershipExpires = exp.toISOString();
          }
          await writeUser(user.id, user);
        } catch { /* user may have been deleted */ }
      }

      res.json({ success: true, message: 'Order marked as paid and user activated' });
    } catch (error) {
      console.error('ESA confirm error:', error);
      res.status(500).json({ error: 'Could not confirm order' });
    }
  });

  // ========== ADMIN: waitlist export ==========

  router.get('/waitlist', adminOnly, async (_req, res) => {
    try {
      const list = await listEsaWaitlist();
      res.json({ waitlist: list, count: list.length });
    } catch (error) {
      console.error('ESA waitlist error:', error);
      res.status(500).json({ error: 'Could not load waitlist' });
    }
  });

  return router;
}
