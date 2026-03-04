# Consent Version Change — Operational Runbook

**When to use:** You are changing the privacy policy or consent disclosures materially (e.g., new AI provider, changed data practices). Per FTC Revised COPPA, we must obtain fresh parental consent.

**Reference:** `docs/CONSENT_VERSIONING_REQUIREMENTS.md`

---

## Pre-Change Checklist

1. **Elias** drafts updated consent email and privacy policy language
2. **Atlas** approves the changes
3. **Nova** updates:
   - `server/config/index.js` — bump `CONSENT_POLICY_VERSION` (format: `YYYY-MM-DD-vN`, e.g. `2026-04-01-v2`)
   - `server/services/consent.js` — updated consent email template (if language changed)
   - `public/privacy.html` — updated policy text

---

## Execution Steps

1. **Merge changes** (config + email template + privacy policy)
2. **Run migration** (if not already applied):
   ```bash
   node scripts/migrate-consent-versioning.js
   ```
3. **Flag stale consents and send re-consent emails:**
   ```bash
   node scripts/flag-stale-consents.js
   ```
   This script:
   - Finds under-13 users with `parental_consent_status = 'granted'` and outdated `consent_policy_version`
   - Sets their status to `pending` (blocks login)
   - Creates new consent tokens and emails parents
4. **Deploy** the updated application

---

## Verification

- Affected parents receive the new consent email
- Affected children cannot log in until parent re-approves
- Parent Command Center shows "Policy Version" for each child after re-consent

---

## Rollback

If you must revert: restore the previous `CONSENT_POLICY_VERSION` in config. Users who re-consented under the new version will retain it; those who did not will remain blocked until they consent under the current (reverted) version.
