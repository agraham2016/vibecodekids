# VibeCodeKidz — Incident Response Playbook

**Version:** 1.0  
**Last Updated:** February 28, 2026  
**Owner:** VibeCodeKidz Engineering & Operations  
**Classification:** Internal — Confidential

---

## 1. Purpose

This playbook defines how VibeCodeKidz responds to security incidents, data breaches, and child safety events. Because we operate a COPPA-regulated platform serving children under 13, response timelines and notification requirements are stricter than for general-audience products.

---

## 2. Incident Classification

### Severity Levels

| Level | Description | Examples | Response Time |
|-------|-------------|----------|---------------|
| **P0 — Critical** | Active data breach, child safety threat, or regulatory violation | PII exposed to unauthorized party; predatory content discovered; AI generating harmful content at scale | Immediate (within 1 hour) |
| **P1 — High** | Security vulnerability with potential for data exposure | Auth bypass discovered; PII leaking in logs; content filter completely bypassed | Within 4 hours |
| **P2 — Medium** | Operational issue with privacy implications | Data retention job failing; moderation queue backlog >48h; consent emails not sending | Within 24 hours |
| **P3 — Low** | Minor issue, no immediate privacy impact | Content filter false positive spike; non-critical admin panel bug | Within 72 hours |

---

## 3. Incident Response Team

| Role | Responsibility | Contact |
|------|---------------|---------|
| **Incident Commander** | Coordinates response, makes decisions, communicates with stakeholders | admin@vibecodekidz.org |
| **Technical Lead** | Investigates root cause, implements fixes, preserves evidence | Engineering team |
| **Communications Lead** | Drafts notifications to parents, regulators, and public | Operations |
| **Legal Advisor** | Advises on notification obligations, regulatory response | External counsel |

---

## 4. Response Procedures

### Phase 1: Detection & Triage (0–1 hour)

1. **Identify the incident**
   - Source: admin alert email, user report, monitoring dashboard, manual discovery
   - Check the admin dashboard: `/admin` → Content Filter, Moderation Queue, Alerts

2. **Classify severity** using the table above

3. **Preserve evidence immediately**
   - Do NOT delete logs, reports, or user data related to the incident
   - Screenshot relevant admin dashboard panels
   - Export relevant database records if applicable
   - Record the exact time of discovery

4. **Contain the threat**
   - If PII is actively leaking: take the affected endpoint offline
   - If content filter is bypassed: enable emergency lockdown (disable AI generation temporarily)
   - If a user account is compromised: suspend the account immediately via admin panel
   - If predatory content is found: remove it and suspend the creator

### Phase 2: Investigation (1–24 hours)

1. **Determine scope**
   - How many users affected?
   - What data was exposed? (usernames, parent emails, prompts, game code?)
   - How long has the issue been present?
   - Was any data accessed by unauthorized parties?

2. **Root cause analysis**
   - Review server logs: `DATA_DIR` logs, console output
   - Check recent code deploys (git log)
   - Review admin audit log: `/admin` → Audit Log tab
   - Check third-party status pages (Anthropic, xAI, Stripe, Resend)

3. **Document findings**
   - Create an incident document with timeline, scope, root cause, and affected users
   - Include all evidence preserved in Phase 1

### Phase 3: Notification (24–72 hours for breaches)

#### FTC / COPPA Notification Requirements

Under COPPA and the FTC's enforcement guidance:

- **If children's personal information was exposed to unauthorized parties**, you MUST notify:
  1. **Affected parents** — within 72 hours of confirmed breach
  2. **FTC** — file a report if the breach involves children's data
  3. **State Attorneys General** — if required by state breach notification laws

#### Parent Notification Template

```
Subject: Important Security Notice — VibeCodeKidz

Dear Parent/Guardian,

We are writing to inform you of a security incident affecting your child's
VibeCodeKidz account (username: [USERNAME]).

WHAT HAPPENED:
[Brief description of the incident]

WHAT DATA WAS AFFECTED:
[List specific data types: username, display name, game data, etc.]

WHAT WE'RE DOING:
[Actions taken to fix the issue and prevent recurrence]

WHAT YOU CAN DO:
- Log in to the Parent Command Center to review your child's account
- Change your child's password if you believe the account was compromised
- Contact us with any questions at admin@vibecodekidz.org

We take your child's privacy seriously and sincerely apologize for this incident.

— The VibeCodeKidz Team
```

#### FTC Contact Information

- **FTC Complaint:** https://reportfraud.ftc.gov/
- **FTC Children's Privacy:** CoppaHotLine@ftc.gov
- **FTC Bureau of Consumer Protection:** (202) 326-2222

### Phase 4: Remediation (24–72 hours)

1. **Fix the root cause** — deploy code changes
2. **Verify the fix** — run automated safety tests (`node server/tests/safety.test.js`)
3. **Monitor for recurrence** — watch admin dashboard alerts for 48 hours
4. **Update defenses** — if content filter was bypassed, add new patterns; if PII leaked, strengthen scanner

### Phase 5: Post-Incident Review (within 7 days)

1. **Conduct a post-mortem meeting**
   - Timeline of events
   - What went well
   - What could be improved
   - Action items for prevention

2. **Update this playbook** if gaps were identified

3. **Update COPPA Self-Assessment** with lessons learned

---

## 5. Specific Scenario Playbooks

### Scenario A: PII Found in AI-Generated Game Code

1. Immediately remove the game from public view (admin dashboard → delete project)
2. Determine if the PII was from the prompting user or fabricated by AI
3. Check output filter logs — was the filter bypassed?
4. If real PII was exposed publicly, notify the affected user's parent
5. Strengthen output filter patterns
6. Re-run safety test suite

### Scenario B: Predatory/Grooming Content Reported

1. Immediately remove the content and suspend the creator account
2. Preserve all evidence (game code, report details, user info)
3. If the content involves real exploitation material: contact NCMEC CyberTipline (https://report.cybertip.org/) and local law enforcement immediately
4. Notify the parent of any affected child user
5. Review all projects by the offending user

### Scenario C: Mass Content Filter Bypass

1. Check admin alerts — if threshold was triggered, review the pattern
2. Temporarily disable AI generation if the bypass is severe (`POST /api/admin/emergency-lockdown` — to be built if needed)
3. Analyze the bypass technique
4. Update content filter (`server/middleware/contentFilter.js` and `server/prompts/index.js`)
5. Add new patterns to automated test suite
6. Re-enable generation after fix is deployed

### Scenario D: Third-Party Vendor Breach (Anthropic, xAI, Stripe, Resend)

1. Contact the vendor for details on what data was affected
2. Determine if any VibeCodeKidz user data was exposed
3. If child data was involved, follow the notification procedures above
4. Review DPA terms for vendor obligations
5. Consider temporary service suspension if the vendor cannot confirm containment

### Scenario E: Database / Server Compromise

1. Immediately isolate the server (take offline if needed)
2. Rotate all secrets: `ADMIN_SECRET`, `ADMIN_TOKEN_SECRET`, `ANTHROPIC_API_KEY`, `XAI_API_KEY`, `STRIPE_SECRET_KEY`, `RESEND_API_KEY`
3. Invalidate all sessions (restart server or clear sessions table)
4. Assess data exposure scope
5. Follow notification procedures if user data was accessed
6. Engage external security firm for forensics if needed

---

## 6. Emergency Contacts

| Contact | Details |
|---------|---------|
| Platform Admin | admin@vibecodekidz.org |
| Legal Counsel | [Your attorney — add contact] |
| FTC COPPA Hotline | CoppaHotLine@ftc.gov |
| NCMEC CyberTipline | https://report.cybertip.org/ or 1-800-843-5678 |
| Anthropic Support | support@anthropic.com |
| Stripe Support | https://support.stripe.com/ |

---

## 7. Revision History

| Date | Version | Changes |
|------|---------|---------|
| Feb 28, 2026 | 1.0 | Initial playbook created |
