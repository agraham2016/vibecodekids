# Written Information Security Program (WISP)

**Vibe Code Kidz — Effective Date: March 2026**

This document satisfies the Written Information Security Program (WISP) requirement
under the FTC's revised COPPA Rule (effective April 2026). It describes the administrative,
technical, and physical safeguards protecting children's personal information.

---

## 1. Scope

This program applies to all personal information collected from or about children under 13
through the Vibe Code Kidz platform, including:

- Usernames, display names, and age brackets
- Parent email addresses
- AI-generated content and game projects
- Usage logs and session data
- Payment metadata (processed by Stripe; no card data stored)

## 2. Designated Security Coordinator

| Role | Responsibility |
|------|---------------|
| **Security Lead** | Oversees WISP implementation, annual review, incident response |
| **Development Lead** | Implements technical controls, code review, dependency management |
| **Privacy Officer** | Handles parent requests, consent flows, data deletion |

*(Names to be filled by organization)*

## 3. Data Inventory

| Data Element | Classification | Storage | Retention | Encryption |
|---|---|---|---|---|
| Username/display name | PII | Server DB/JSON | Until deletion | At rest (TBD) |
| Parent email | PII | Server DB/JSON | Until deletion | At rest (TBD) |
| Age bracket | Sensitive (child) | Server DB/JSON | Until deletion | At rest (TBD) |
| Password hash | Credential | Server DB/JSON | Until deletion | bcrypt (10 rounds) |
| Game projects (code) | User content | Server DB/JSON | DATA_RETENTION_DAYS | At rest (TBD) |
| Session tokens | Auth | In-memory/DB | 24 hours | In transit (TLS) |
| Payment data | Financial | Stripe (external) | Per Stripe policy | Stripe PCI DSS |

## 4. Technical Safeguards

### 4.1 Authentication & Access Control
- Minimum 8-character passwords with passphrase suggestions
- bcrypt password hashing (cost factor 10)
- Session token binding (IP + User-Agent)
- Sliding session token rotation (every 4 hours)
- Admin 2FA (mandatory, email-based)
- Magic link login for parent-initiated child access

### 4.2 Network Security
- HTTPS/TLS enforced via HSTS (max-age=31536000)
- Content Security Policy (CSP) headers on all responses
- CORS restricted to whitelisted origins
- Application-level WAF with pattern matching
- WebSocket authentication required

### 4.3 Input Validation & Output Safety
- Content filter (keyword + Unicode canonicalization)
- ML-based content moderation (Perspective API)
- AI output validation and sanitization
- Game preview iframe sandboxing (no same-origin)
- Request body size limits (1MB default, 6MB for AI routes)

### 4.4 Supply Chain Security
- `package-lock.json` committed and used for installs
- Weekly `npm audit` via CI pipeline
- Dependabot automated dependency updates
- CDN scripts with `crossorigin="anonymous"` (SRI hashes pending)

### 4.5 Monitoring & Detection
- Admin audit logging for all administrative actions
- WAF request inspection with logging
- DAST scanning (OWASP ZAP + Nuclei) in CI pipeline
- Rate limiting on login, contact, and API endpoints

## 5. Administrative Safeguards

### 5.1 Access Management
- Admin access requires 2FA verification
- Principle of least privilege for all roles
- Secret rotation on quarterly schedule

### 5.2 Incident Response

**Classification:**
- **P1 (Critical):** Data breach involving child PII, credential compromise
- **P2 (High):** Unauthorized access attempt, XSS/injection discovery
- **P3 (Medium):** Configuration error, dependency vulnerability
- **P4 (Low):** Minor policy violation, informational finding

**Response Steps:**
1. **Detect** — Automated alerts (CI, WAF logs) or manual report
2. **Contain** — Isolate affected systems, revoke compromised credentials
3. **Assess** — Determine scope, data affected, and child impact
4. **Notify** — Within 72 hours: affected parents, FTC (if required), state AG (if required)
5. **Remediate** — Fix root cause, deploy patches, rotate secrets
6. **Review** — Post-incident report, update WISP if needed

### 5.3 Third-Party Management
- Stripe: PCI DSS Level 1 certified payment processor
- Anthropic/xAI: AI providers, no child PII shared in prompts (under-13 logging disabled)
- Resend: Email delivery, receives parent email only
- Vercel/CDN: Static asset hosting only

## 6. COPPA-Specific Controls

### 6.1 Verifiable Parental Consent
- Email-plus confirmation method (email sent to parent, action required)
- Consent status tracked per child account
- Parent dashboard for ongoing oversight

### 6.2 Data Minimization
- No tracking pixels or third-party analytics in child flows
- No IP addresses stored in contact forms
- Under-13 AI prompt content not logged
- `improvementOptOut` defaults to true for under-13

### 6.3 Parental Rights
- Parent dashboard: view activity, export data, delete account
- Data export via API (JSON format)
- Data deletion anonymizes user record and removes all projects
- Automated retention cleanup for inactive child accounts (DATA_RETENTION_DAYS)

### 6.4 Data Retention
- Active accounts: retained while active
- Inactive child accounts: auto-cleaned after DATA_RETENTION_DAYS (default: 365)
- Deleted accounts: anonymized (display name, password hash, emails cleared)

## 7. Annual Review

This WISP must be reviewed and updated at least annually, or whenever:
- A security incident occurs
- Significant platform changes are made
- Regulatory requirements change
- New third-party services are added

**Next review due:** March 2027

## 8. External Penetration Testing

### Schedule
- Initial pen test: Before public launch
- Annual pen test: By a COPPA-experienced security firm
- Ad-hoc: After major architecture changes

### Recommended Firms
*(To be selected — seek firms with FTC/COPPA compliance experience)*

### Scope
- Web application (React frontend + Express API)
- Authentication and session management
- API endpoints (IDOR, injection, privilege escalation)
- WebSocket multiplayer system
- AI generation pipeline (prompt injection)
- Payment flow (Stripe integration)
- COPPA compliance verification

### Deliverables
- Executive summary
- Detailed findings with severity ratings
- Remediation guidance
- Retest after fixes

---

*This document is confidential and intended for internal use only.*
