/**
 * Parent / COPPA Routes
 *
 * Handles parental consent verification, data access requests,
 * and data deletion requests as required by COPPA.
 *
 * These routes are PUBLIC (no auth required) because parents
 * access them via email links.
 */

import { Router } from 'express';
import { readUser, writeUser } from '../services/storage.js';
import {
  getConsentByToken,
  resolveConsent,
  exportUserData,
  deleteUserData,
  createConsentRequest,
  sendConsentEmail,
  createParentDashboardToken,
} from '../services/consent.js';
import { SITE_NAME, SUPPORT_EMAIL, BASE_URL, CONSENT_POLICY_VERSION } from '../config/index.js';
import { logAdminAction } from '../services/adminAuditLog.js';

const router = Router();

/**
 * GET /api/parent/verify?token=...&action=grant|deny
 *
 * Called when a parent clicks the approve/deny link in their email.
 * Returns a simple HTML page confirming the action.
 */
router.get('/verify', async (req, res) => {
  try {
    const { token, action } = req.query;

    if (!token || !['grant', 'deny'].includes(action)) {
      return res
        .status(400)
        .send(
          renderPage(
            'Invalid Link',
            'This link is invalid or malformed. Please check the email you received.',
            'error',
          ),
        );
    }

    const consent = await getConsentByToken(token);

    if (!consent) {
      return res
        .status(404)
        .send(
          renderPage(
            'Link Not Found',
            'This consent link was not found. It may have already been used or expired.',
            'error',
          ),
        );
    }

    if (consent.status !== 'pending') {
      return res.send(
        renderPage(
          'Already Responded',
          `This consent request has already been ${consent.status}. No further action is needed.`,
          'info',
        ),
      );
    }

    // Check expiry
    if (new Date(consent.expiresAt) < new Date()) {
      await resolveConsent(token, false);
      return res
        .status(410)
        .send(
          renderPage(
            'Link Expired',
            'This consent link has expired. Your child can request a new one by trying to register again.',
            'error',
          ),
        );
    }

    const granted = action === 'grant';
    const explicitConsent = req.query.explicit_consent === 'true';
    if (consent.action === 'consent' && granted && !explicitConsent) {
      return res
        .status(400)
        .send(
          renderPage(
            'Confirmation Required',
            'Please confirm that you have read the Privacy Policy and Terms of Service before approving your child&apos;s account.',
            'error',
          ),
        );
    }
    await resolveConsent(token, granted);

    // Update user based on consent action
    let grantedDashToken = null;
    try {
      const user = await readUser(consent.userId);

      if (consent.action === 'consent' || consent.action === 'reconsent') {
        if (granted) {
          const nowIso = new Date().toISOString();
          user.parentalConsentStatus = 'granted';
          user.parentalConsentAt = nowIso;
          user.parentVerifiedMethod = 'email_plus';
          user.parentVerifiedAt = nowIso;
          user.consentPolicyVersion = CONSENT_POLICY_VERSION;
          user.parentAcceptedTerms = explicitConsent;
          user.parentAcceptedTermsAt = explicitConsent ? nowIso : null;
          user.status = 'approved';
          user.approvedAt = nowIso;
          if (consent.action === 'consent') {
            // Default: publishing and multiplayer OFF for under-13 until parent enables
            if (user.publishingEnabled === undefined) user.publishingEnabled = false;
            if (user.multiplayerEnabled === undefined) user.multiplayerEnabled = false;
          }
          // Generate Parent Command Center token
          grantedDashToken = await createParentDashboardToken(consent.userId);
          user.parentDashboardToken = grantedDashToken;
          logAdminAction({
            action: consent.action === 'reconsent' ? 'reconsent_granted' : 'consent_granted',
            targetId: consent.userId,
            details: {
              username: user.username,
              method: 'email_plus',
              consentPolicyVersion: CONSENT_POLICY_VERSION,
              parentAcceptedTerms: explicitConsent,
            },
          }).catch(() => {});
        } else {
          user.parentalConsentStatus = 'denied';
          user.status = 'denied';
          user.deniedAt = new Date().toISOString();
          logAdminAction({
            action: consent.action === 'reconsent' ? 'reconsent_denied' : 'consent_denied',
            targetId: consent.userId,
            details: { username: user.username },
          }).catch(() => {});
        }
        await writeUser(consent.userId, user);
      } else if (consent.action === 'data_access') {
        // Data export request
        if (granted) {
          const data = await exportUserData(consent.userId);
          return res.send(
            renderPage(
              'Data Export',
              `<p>Here is all data stored for <strong>${user.username}</strong>:</p>
             <pre style="background:#f0f0f0;padding:12px;border-radius:8px;overflow-x:auto;font-size:12px;max-height:400px">
${JSON.stringify(data, null, 2)}
             </pre>
             <p>If you'd like this data deleted, contact us at <a href="mailto:${SUPPORT_EMAIL}">${SUPPORT_EMAIL}</a>.</p>`,
              'success',
            ),
          );
        }
      } else if (consent.action === 'data_delete') {
        // Data deletion request
        if (granted) {
          const result = await deleteUserData(consent.userId);
          return res.send(
            renderPage(
              'Data Deleted',
              `All data for this account has been deleted (${result.deletedProjects} project(s) removed, account anonymized). This action cannot be undone.`,
              'success',
            ),
          );
        }
      }
    } catch (err) {
      console.error('Consent action error:', err);
      // Still return success to parent -- the consent was recorded
    }

    if (granted) {
      let message;
      if (consent.action === 'consent' || consent.action === 'reconsent') {
        const dashUrl = grantedDashToken ? `${BASE_URL}/parent-dashboard?token=${grantedDashToken}` : null;
        const approvalLabel =
          consent.action === 'reconsent'
            ? `You've re-approved your child's account under the updated policy. They can log in now!`
            : `You have approved your child's account. They can log in now!`;
        message =
          approvalLabel +
          (dashUrl
            ? `<br><br><strong>Parent Command Center:</strong><br>Manage your child's privacy settings, toggle publishing and multiplayer, review data, or delete the account:<br><a href="${dashUrl}" style="color:#667eea;font-weight:bold">${dashUrl}</a><br><small>Bookmark this link — it's your portal to manage your child's account.</small>`
            : '') +
          `<br><br><small>By approving, you agreed to our <a href="/terms" target="_blank">Terms of Service</a> and <a href="/privacy" target="_blank">Privacy Policy</a>. You may opt out of AI improvement data use at any time by emailing ${SUPPORT_EMAIL}.</small>`;
      } else {
        message = 'Your request has been approved.';
      }
      res.send(renderPage('Approved!', message, 'success'));
    } else {
      const message =
        consent.action === 'consent' || consent.action === 'reconsent'
          ? "You have denied your child's account request. No account will be created."
          : 'The request has been denied.';
      res.send(renderPage('Denied', message, 'info'));
    }
  } catch (error) {
    console.error('Consent verify error:', error);
    res
      .status(500)
      .send(
        renderPage(
          'Something Went Wrong',
          'We encountered an error processing your request. Please try again or contact support.',
          'error',
        ),
      );
  }
});

/**
 * POST /api/parent/request-data
 *
 * Parent can request to see their child's data.
 * Requires: { parentEmail, childUsername }
 * Sends a verification email to the parent.
 */
router.post('/request-data', async (req, res) => {
  try {
    const { parentEmail, childUsername } = req.body;

    if (!parentEmail || !childUsername) {
      return res.status(400).json({ error: 'Parent email and child username are required' });
    }

    const userId = `user_${childUsername.toLowerCase()}`;
    let user;
    try {
      user = await readUser(userId);
    } catch (_err) {
      // Don't reveal whether account exists
      return res.json({ success: true, message: 'If this account exists, a verification email has been sent.' });
    }

    // Verify the parent email matches
    if (user.parentEmail?.toLowerCase() !== parentEmail.toLowerCase()) {
      return res.json({ success: true, message: 'If this account exists, a verification email has been sent.' });
    }

    const token = await createConsentRequest(userId, parentEmail, 'data_access');
    await sendConsentEmail(parentEmail, childUsername, token, 'data_access');

    res.json({ success: true, message: 'A verification email has been sent to the parent email on file.' });
  } catch (error) {
    console.error('Data request error:', error);
    res.status(500).json({ error: 'Could not process request' });
  }
});

/**
 * POST /api/parent/request-deletion
 *
 * Parent can request deletion of their child's data.
 * Requires: { parentEmail, childUsername }
 * Sends a verification email to confirm deletion.
 */
router.post('/request-deletion', async (req, res) => {
  try {
    const { parentEmail, childUsername } = req.body;

    if (!parentEmail || !childUsername) {
      return res.status(400).json({ error: 'Parent email and child username are required' });
    }

    const userId = `user_${childUsername.toLowerCase()}`;
    let user;
    try {
      user = await readUser(userId);
    } catch (_err) {
      return res.json({ success: true, message: 'If this account exists, a verification email has been sent.' });
    }

    if (user.parentEmail?.toLowerCase() !== parentEmail.toLowerCase()) {
      return res.json({ success: true, message: 'If this account exists, a verification email has been sent.' });
    }

    const token = await createConsentRequest(userId, parentEmail, 'data_delete');
    await sendConsentEmail(parentEmail, childUsername, token, 'data_delete');

    res.json({
      success: true,
      message: 'A verification email has been sent. Data will only be deleted after you confirm via email.',
    });
  } catch (error) {
    console.error('Deletion request error:', error);
    res.status(500).json({ error: 'Could not process request' });
  }
});

/**
 * GET /api/parent/privacy
 * Returns the privacy policy as JSON (for API consumers).
 * The HTML version is served at /privacy.html.
 */
router.get('/privacy', (_req, res) => {
  res.json({
    siteName: SITE_NAME,
    supportEmail: SUPPORT_EMAIL,
    lastUpdated: '2026-03-17',
    summary:
      'VibeCodeKidz is a kid-friendly game creation platform. We comply with COPPA, collect only the data needed to operate the product, and give parents direct control over under-13 accounts.',
    dataCollected: [
      'Username and display name (no real names required)',
      'Age bracket (under 13, 13-17, 18+)',
      'Parent email (for users under 13, used only for consent)',
      'Games created on the platform',
      'Basic anonymized usage data',
      'If Report Bug is used: a short bug note, up to 3 recent AI messages, a capped code excerpt, and basic technical diagnostics',
    ],
    serviceProviders: [
      'Anthropic, xAI, and OpenAI for AI game generation',
      'Anthropic or OpenAI for limited, sanitized internal bug triage summaries',
      'Resend for transactional emails',
      'Stripe for payments and optional parent identity verification',
      'Sentry for server-side error monitoring',
    ],
    retention: [
      'Login sessions expire automatically',
      'Resolved or dismissed bug reports are deleted after 90 days',
      'Resolved moderation reports are deleted after 90 days',
      'Inactive under-13 accounts are purged after 12 months of inactivity',
    ],
    dataNotCollected: [
      'Real name, address, or phone number',
      'Precise location or GPS data',
      'Photos, videos, or audio recordings',
      'Data from third-party trackers or ad networks',
    ],
    parentalRights: [
      'Review data collected about your child',
      "Request deletion of your child's data",
      'Revoke consent at any time',
      'Contact us at ' + SUPPORT_EMAIL,
    ],
  });
});

// ========== HTML RENDERER ==========

function renderPage(title, body, type = 'info') {
  const colors = {
    success: { bg: '#e8f5e9', border: '#4caf50', icon: '✅' },
    error: { bg: '#ffebee', border: '#f44336', icon: '❌' },
    info: { bg: '#e3f2fd', border: '#2196f3', icon: 'ℹ️' },
  };
  const c = colors[type] || colors.info;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} - ${SITE_NAME}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    .card {
      background: white;
      border-radius: 16px;
      padding: 40px;
      max-width: 520px;
      width: 100%;
      box-shadow: 0 20px 60px rgba(0,0,0,0.2);
      text-align: center;
    }
    .icon { font-size: 48px; margin-bottom: 16px; }
    h1 { 
      color: #333; 
      margin-bottom: 16px; 
      font-size: 24px; 
    }
    .message {
      background: ${c.bg};
      border-left: 4px solid ${c.border};
      padding: 16px;
      border-radius: 8px;
      margin: 20px 0;
      text-align: left;
      line-height: 1.6;
      color: #333;
    }
    .footer {
      margin-top: 24px;
      color: #888;
      font-size: 13px;
    }
    a { color: #667eea; }
    pre { text-align: left; }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">${c.icon}</div>
    <h1>${title}</h1>
    <div class="message">${body}</div>
    <div class="footer">
      <p>${SITE_NAME} &middot; <a href="mailto:${SUPPORT_EMAIL}">${SUPPORT_EMAIL}</a></p>
    </div>
  </div>
</body>
</html>`;
}

export default router;
