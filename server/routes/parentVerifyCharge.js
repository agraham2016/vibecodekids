/**
 * Stripe Micro-Charge Parental Verification
 *
 * Higher-reliability VPC method: parent is charged $0.50 (refunded immediately)
 * via Stripe to verify their identity as a real adult with a payment method.
 *
 * Flow:
 *   1. POST /api/parent/verify-charge/create  — create a Stripe Payment Intent ($0.50)
 *   2. Parent completes payment in browser (Stripe Elements)
 *   3. POST /api/parent/verify-charge/confirm  — confirm the charge succeeded, refund, upgrade consent method
 */

import { Router } from 'express';
import Stripe from 'stripe';
import { STRIPE_SECRET_KEY, BASE_URL, SITE_NAME } from '../config/index.js';
import { readUser, writeUser } from '../services/storage.js';
import { getConsentByToken, resolveConsent, createParentDashboardToken } from '../services/consent.js';

const stripe = STRIPE_SECRET_KEY ? new Stripe(STRIPE_SECRET_KEY) : null;
const router = Router();

const MICRO_CHARGE_AMOUNT = 50; // $0.50 in cents
const STRIPE_PUBLISHABLE_KEY = process.env.STRIPE_PUBLISHABLE_KEY || null;

/**
 * GET /api/parent/verify-charge/config
 * Public — returns the publishable key so the frontend can init Stripe Elements.
 */
router.get('/config', (_req, res) => {
  if (!STRIPE_PUBLISHABLE_KEY) {
    return res.status(503).json({ error: 'Stripe is not configured.' });
  }
  res.json({ publishableKey: STRIPE_PUBLISHABLE_KEY, amount: MICRO_CHARGE_AMOUNT });
});

/**
 * POST /api/parent/verify-charge/create
 * Body: { consentToken }
 * Returns: { clientSecret, paymentIntentId }
 */
router.post('/create', async (req, res) => {
  if (!stripe) {
    return res.status(503).json({ error: 'Payment processing is not configured.' });
  }

  try {
    const { consentToken } = req.body;
    if (!consentToken) return res.status(400).json({ error: 'Consent token is required.' });

    const consent = await getConsentByToken(consentToken);
    if (!consent) return res.status(404).json({ error: 'Consent request not found or expired.' });
    if (consent.status !== 'pending') return res.status(400).json({ error: 'This consent request has already been processed.' });

    if (new Date(consent.expiresAt) < new Date()) {
      return res.status(410).json({ error: 'This consent link has expired.' });
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount: MICRO_CHARGE_AMOUNT,
      currency: 'usd',
      description: `${SITE_NAME} parental verification (refundable)`,
      metadata: {
        purpose: 'parental_verification',
        consentToken,
        userId: consent.userId,
      },
      automatic_payment_methods: { enabled: true },
    });

    res.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      amount: MICRO_CHARGE_AMOUNT,
    });
  } catch (error) {
    console.error('Micro-charge create error:', error.message);
    res.status(500).json({ error: 'Could not create verification charge.' });
  }
});

/**
 * POST /api/parent/verify-charge/confirm
 * Body: { consentToken, paymentIntentId }
 * Verifies the payment succeeded, refunds it, and upgrades consent to 'stripe_micro'.
 */
router.post('/confirm', async (req, res) => {
  if (!stripe) {
    return res.status(503).json({ error: 'Payment processing is not configured.' });
  }

  try {
    const { consentToken, paymentIntentId } = req.body;
    if (!consentToken || !paymentIntentId) {
      return res.status(400).json({ error: 'Consent token and payment intent ID are required.' });
    }

    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    if (paymentIntent.status !== 'succeeded') {
      return res.status(400).json({ error: 'Payment has not been completed yet.' });
    }

    if (paymentIntent.metadata?.consentToken !== consentToken) {
      return res.status(400).json({ error: 'Payment does not match this consent request.' });
    }

    // Refund immediately
    try {
      await stripe.refunds.create({ payment_intent: paymentIntentId });
    } catch (refundErr) {
      console.error('Micro-charge refund failed (will retry manually):', refundErr.message);
    }

    // Resolve consent with higher-reliability method
    await resolveConsent(consentToken, true, 'stripe_micro');

    const consent = await getConsentByToken(consentToken);
    if (consent?.userId) {
      try {
        const user = await readUser(consent.userId);
        user.parentalConsentStatus = 'granted';
        user.parentalConsentAt = new Date().toISOString();
        user.parentVerifiedMethod = 'stripe_micro';
        user.parentVerifiedAt = new Date().toISOString();
        user.status = 'approved';
        user.approvedAt = new Date().toISOString();
        if (user.publishingEnabled === undefined) user.publishingEnabled = false;
        if (user.multiplayerEnabled === undefined) user.multiplayerEnabled = false;
        const dashboardToken = await createParentDashboardToken(consent.userId);
        user.parentDashboardToken = dashboardToken;
        await writeUser(consent.userId, user);
      } catch (err) {
        console.error('User update after micro-charge failed:', err.message);
      }
    }

    const user = consent?.userId ? await readUser(consent.userId).catch(() => null) : null;
    const dashUrl = user?.parentDashboardToken
      ? `${BASE_URL}/parent-dashboard?token=${user.parentDashboardToken}`
      : null;

    res.json({
      success: true,
      message: 'Verification complete! The $0.50 charge has been refunded. Your child can now log in.',
      verificationMethod: 'stripe_micro',
      dashboardUrl: dashUrl,
    });
  } catch (error) {
    console.error('Micro-charge confirm error:', error.message);
    res.status(500).json({ error: 'Could not confirm verification.' });
  }
});

export default router;
