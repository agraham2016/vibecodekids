# Consent Versioning — Requirements Spec

**Owner:** Elias Vance (Compliance Lead)  
**Handoff to:** Nova (Implementation)  
**Date:** March 5, 2026  
**Reference:** FTC Revised COPPA Rule (April 22, 2026); `docs/DEFENSIBLE_ARCHITECTURE_BLUEPRINT.md` Section C

---

## 1. Problem Statement

When we update our privacy policy or consent disclosures (e.g., add a new AI provider, change data practices), existing parental consents may not cover the new use. FTC requires that we can demonstrate which disclosure version a parent agreed to, and that we obtain fresh consent when material changes occur.

**Current gap:** `CONSENT_POLICY_VERSION` exists in `server/config/index.js` but:
- Not stored in `parental_consents` table
- Not stored in `users` table
- No mechanism to trigger re-consent when version changes
- No query path to find users with stale consent versions

---

## 2. Requirements

### 2.1 Schema Changes

| Location | Change |
|----------|--------|
| `parental_consents` | Add `consent_policy_version TEXT` column. Populate on `status='granted'` with current `CONSENT_POLICY_VERSION`. |
| `users` | Add `consent_policy_version TEXT` column (nullable). Set when `parental_consent_status` transitions to `granted`. For 13+ users, set to `'not_required'` or leave null. |

**Migration:** Use `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` pattern (consistent with existing schema).

### 2.2 Consent Grant Flow

When consent is granted (email approval or Stripe micro-charge):

1. Read `CONSENT_POLICY_VERSION` from config
2. On `parental_consents` update to `status='granted'`: set `consent_policy_version = CONSENT_POLICY_VERSION`
3. On `users` update (`parental_consent_status = 'granted'`): set `consent_policy_version = CONSENT_POLICY_VERSION`

**Files:** `server/routes/parent.js`, `server/routes/parentVerifyCharge.js`, `server/services/consent.js`

### 2.3 Re-Consent Trigger

When `CONSENT_POLICY_VERSION` is changed in config (e.g., `2026-02-28-v1` → `2026-04-01-v2`):

1. **Option A (recommended):** On next deploy, a one-time migration or startup script identifies users where `consent_policy_version != CONSENT_POLICY_VERSION` and `age_bracket = 'under13'` and `parental_consent_status = 'granted'`
2. For each such user: set `parental_consent_status = 'pending_reconsent'` (new status) or `'pending'`
3. Block login for `pending_reconsent` (same as `pending`)
4. Send new consent email to `parent_email` with updated disclosure
5. Parent must re-approve before child can log in again

**Alternative (softer):** 30-day grace period — log the users, send notification email to parents, allow continued access for 30 days. After 30 days, if no re-consent, set to `pending` and block.

**Elias recommendation:** Option A (immediate) for material changes. Softer approach only if Atlas approves and we define "material" vs "non-material" changes.

### 2.4 Version Change Process (Operational)

Before changing `CONSENT_POLICY_VERSION`:

1. Elias drafts updated consent email and privacy policy language
2. Atlas approves
3. Nova updates config, consent email template, privacy policy
4. Nova runs migration/script to flag stale consents
5. Consent emails sent to affected parents
6. Deploy

### 2.5 Parent Dashboard Display

Parent Command Center should display (for each child):
- Consent status
- **Consent date** (already in `parental_consent_at`)
- **Consent version** (new: `consent_policy_version`)

This allows parents to see when they consented and under which policy.

### 2.6 Audit/Compliance Queries

Must support:
- "Which users consented under version X?"
- "How many under-13 users have consent version older than current?"
- "When did we last change consent version?"

---

## 3. Implementation Checklist (Nova)

- [ ] Add `consent_policy_version TEXT` to `parental_consents` (migration)
- [ ] Add `consent_policy_version TEXT` to `users` (migration)
- [ ] Update `parent.js` consent grant path: set version on `parental_consents` and `users`
- [ ] Update `parentVerifyCharge.js` consent grant path: same
- [ ] Update `db.js` / `storage.js`: include `consentPolicyVersion` in row mapping for users
- [ ] Create re-consent script or startup check: when `CONSENT_POLICY_VERSION` changes, flag stale users
- [ ] Add `pending_reconsent` status (optional) or reuse `pending` with version mismatch
- [ ] Parent dashboard: display consent version (if space permits)
- [ ] Document version change procedure in `docs/` or runbook

---

## 4. Edge Cases

| Case | Handling |
|------|----------|
| User consents via email, then we deploy before they click | Token still valid; on grant, store current version. Fine. |
| User has `consent_policy_version = null` (pre-migration) | Treat as "legacy"; on next consent event (e.g., revoke/re-grant) set version. For re-consent logic: null = treat as stale if current version is set. |
| 13+ user (no consent required) | `consent_policy_version = null` or `'not_required'`. Never in re-consent scope. |
| Parent revokes then re-grants | New consent stores current version. |

---

## 5. Config Constant

Keep `CONSENT_POLICY_VERSION` in `server/config/index.js`. Format: `YYYY-MM-DD-vN` (e.g., `2026-02-28-v1`).

When to bump:
- Material change to what data we collect
- Material change to third parties we share with
- Material change to how we use data
- Significant change to parental rights or disclosures

**Elias:** When in doubt, bump. Better to over-collect consent than under.

---

## 6. Revision History

| Date | Author | Changes |
|------|--------|---------|
| 2026-03-05 | Elias Vance | Initial requirements. Handoff to Nova. |
