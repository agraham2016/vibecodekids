# Persistent Identifiers — Technical Inventory

**For:** Elias Vance (Compliance & Privacy Lead) — COPPA Revised Rule / Privacy Policy  
**From:** Cipher Hale (Security Architect)  
**Date:** March 4, 2026  
**Purpose:** Document all persistent identifiers used for internal operations so Elias can draft accurate privacy policy language and satisfy FTC disclosure requirements.

---

## 1. Session Tokens (Authentication)

| Attribute | Value |
|-----------|-------|
| **What** | 64-character hex string (256 bits entropy) |
| **Where stored** | Postgres `sessions` table (prod) or `data/sessions.json` (dev) |
| **Transmitted how** | `Authorization: Bearer <token>` header; client stores in memory/localStorage |
| **Retention** | 24 hours from last use; sliding window on activity; auto-deleted on logout |
| **Purpose** | Authenticate logged-in users (child, parent, admin) |
| **Bound to** | User-Agent (stored as `bound_ua`) — stolen tokens fail if used from different browser |
| **PII linkage** | Links to `user_id`; no raw IP stored |

**Privacy policy language:** "We use session tokens to keep you logged in. These expire after 24 hours of inactivity and are only used for authentication. We do not use cookies for session management."

---

## 2. IP Addresses

| Attribute | Value |
|-----------|-------|
| **What** | Client IP (from `X-Forwarded-For` or socket) |
| **Persisted?** | **NO.** We never store raw IPs. |
| **At request time** | Used in-memory only for rate limiting (login, registration, forgot-password, report, generate, contact) |
| **In logs** | Hashed with server-side salt (SHA-256) — stored as `ipHash` (16-char hex). Irreversible. |
| **In audit log** | Same — `ipHash` only. |
| **Retention** | In-memory rate-limit maps: cleared within minutes. Log `ipHash`: retention depends on log sink (Railway, etc.); recommend 30-day max. |

**Privacy policy language:** "We do not store your IP address. For security and abuse prevention we temporarily use it during your request, and in logs we store only an irreversibly hashed form that cannot be used to identify you."

---

## 3. Parent Consent Tokens

| Attribute | Value |
|-----------|-------|
| **What** | Random token sent in consent/verify email links |
| **Where stored** | Postgres `parental_consents` table |
| **Retention** | 72 hours; deleted after use (grant/deny) or on expiry |
| **Purpose** | Verifiable parental consent (VPC) — parent clicks link to approve/deny child account |
| **PII linkage** | Links to `user_id`, `parent_email` |

**Privacy policy language:** "When a parent approves or denies a child's account, we send a secure link that expires in 72 hours. The token is only used for that single action and is deleted afterward."

---

## 4. Password Reset Tokens

| Attribute | Value |
|-----------|-------|
| **What** | Random token sent in password reset email |
| **Where stored** | Postgres `password_reset_tokens` table |
| **Retention** | Typically 1 hour; deleted after use |
| **Purpose** | Allow user (or parent for under-13) to set new password |
| **PII linkage** | Links to `user_id`, `email` (recipient) |

**Privacy policy language:** "Password reset links expire after a short period and are invalidated once used."

---

## 5. Parent Dashboard Token

| Attribute | Value |
|-----------|-------|
| **What** | Token stored on user record for parent command center access |
| **Where stored** | `users.parent_dashboard_token` |
| **Retention** | Until parent revokes or account deleted |
| **Purpose** | Parent accesses dashboard via email link without child login |
| **PII linkage** | Links to child's `user_id` |

**Privacy policy language:** "Parents can access the Parent Command Center through a secure link. This token stays valid until the parent revokes access or the account is deleted."

---

## 6. Magic Link Tokens (Parent-Initiated Login)

| Attribute | Value |
|-----------|-------|
| **What** | One-time token for parent to log child in |
| **Where stored** | In-memory `Map` only (not persisted) |
| **Retention** | 10 minutes |
| **Purpose** | Parent emails self a link; clicking logs child in |
| **PII linkage** | Links to `user_id`; email sent to parent |

**Privacy policy language:** "Parents can request a one-time login link for their child. The link expires in 10 minutes and works only once."

---

## 7. User-Agent (Session Binding)

| Attribute | Value |
|-----------|-------|
| **What** | HTTP `User-Agent` header (browser/device fingerprint) |
| **Where stored** | `sessions.bound_ua` (Postgres) or session object (file store) |
| **Retention** | Same as session (24h) |
| **Purpose** | Detect stolen tokens — if session used from different browser, invalidate |
| **PII linkage** | Indirect; helps identify session hijacking |

**Privacy policy language:** "We store a device identifier with your session to detect unauthorized access. It is not used for advertising or tracking."

---

## 8. Visitor ID (Demo / Unauthenticated Users)

| Attribute | Value |
|-----------|-------|
| **What** | Client-generated UUID for "Try It Now" demo users |
| **Where stored** | Demo analytics `demo_events.jsonl` (with `ipHash`, not raw IP) |
| **Retention** | 90 days (automated purge) |
| **Purpose** | Aggregate demo analytics (generation success, feedback) |
| **PII linkage** | None — anonymous; no account |

**Privacy policy language:** "When you try the demo without an account, we may use an anonymous identifier to understand how the product is used. This is not linked to you and is deleted within 90 days."

---

## 9. Cookies

| Attribute | Value |
|-----------|-------|
| **What** | HTTP cookies |
| **Used?** | **No.** We do not set cookies for authentication or tracking. |
| **Note** | Session token is sent via `Authorization` header; client may store it in localStorage (not a cookie). |

**Privacy policy language:** "We do not use cookies for login or tracking. Session tokens are stored in your browser's local storage only when you are logged in."

---

## Summary Table (for Privacy Policy)

| Identifier | Purpose | Retention | Reversible? |
|-------------|---------|-----------|--------------|
| Session token | Login | 24h | No (random) |
| IP (in logs) | — | We hash; never store raw | No (hashed) |
| Consent token | Parent approve/deny | 72h | No |
| Reset token | Password reset | ~1h | No |
| Dashboard token | Parent center | Until revoked | No |
| Magic link | Parent login child | 10 min | No |
| User-Agent | Session binding | 24h | Partial |
| Visitor ID | Demo analytics | 90 days | No |
| Cookies | — | Not used | — |

---

**Elias:** Use this for privacy policy Section "Information We Collect" / "How We Use Identifiers" and for COPPA disclosure on persistent identifiers. If you need additional fields (e.g., Stripe customer ID), coordinate with me.
