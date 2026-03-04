# FOUNDER DIRECTIVE — PRE-LAUNCH EXECUTION PROTOCOL

**From:** Atlas Reid (Founder / Vision)  
**To:** Entire Vibe Code Kids AI Team  
**Status:** Active  
**Effective:** Pre-launch mode

---

We are entering structured pre-launch mode.

**Our objective:** Launch a legally defensible, security-first, parent-trusted MVP of Vibe Code Kids with ESA integration readiness.

**This is NOT a speed sprint.**  
**This is a precision build.**

---

## CORE LAUNCH GOALS

### 1) Child Studio MVP
- Create game
- Save game
- Edit game
- Publish to moderated Arcade (pre-moderation required)
- Enforce prompt/game metering limits

### 2) Parent Portal MVP
- Parent account creation
- Consent flow (compliance approved)
- Child account management
- View child activity (non-invasive, minimal)
- Billing system ready

### 3) Security Foundation
- Role-based auth (child / parent / admin / moderator)
- Audit logging
- Rate limiting
- Anti-PII filtering
- Data minimization enforced

### 4) Compliance Readiness
- COPPA-aligned consent flow
- Accurate privacy policy
- Data inventory documented
- Incident response outline created

### 5) ESA Integration Preparation
- ESA API key integration plan (awaiting key)
- Secure token storage design
- Isolated service layer for ESA calls
- Logging and error handling model

---

## NON-NEGOTIABLE EXECUTION RULES

### 1) NO PUSH / NO DEPLOY
No code is to be pushed, merged, or deployed without Founder approval.

All merge actions require:
- Architecture review (Cipher)
- Compliance review (Elias)
- Founder sign-off

### 2) NO SCOPE CREEP
Only build what is defined in MVP scope.  
If it does not directly support launch goals, it is deferred.

### 3) CHILD DATA BOUNDARY
No tracking, analytics, or third-party integrations in child environment.  
Parent-side tracking only if approved by Compliance.

### 4) ESA API KEY
We are awaiting the ESA API key. No placeholder hacks.

Design secure integration properly:
- Secrets stored in environment vault
- No hardcoding
- Role-limited service layer
- Full audit logs of API calls

### 5) SYSTEMATIC WORKFLOW

Every feature must follow this order:

| Step | Owner | Action |
|------|-------|--------|
| 1 | Atlas | Vision definition |
| 2 | Cipher | Architecture review |
| 3 | Elias | Compliance review |
| 4 | Lumi | UX validation |
| 5 | Nova | Implementation plan |
| 6 | Rowan | Moderation impact review (if relevant) |
| 7 | Atlas | Final Founder approval |
| 8 | — | **THEN merge** |

**No skipping steps.**

---

## COMMUNICATION PROTOCOL

All agents must:
- State assumptions explicitly
- Identify cross-team dependencies
- Tag which agent must review next
- Provide risk assessment with severity rating

### Before marking any task complete, answer:

1. Does this introduce new data collection?
2. Does this change auth or permissions?
3. Does this impact child publishing?
4. Does this require policy updates?

**If YES to any → escalate before proceeding.**

---

## PRE-LAUNCH CHECKLIST

### ARCHITECTURE
- [ ] Role-based access implemented
- [ ] Data separation (parent vs child)
- [ ] API rate limiting active
- [ ] Environment secrets secured
- [ ] Logging framework operational

### COMPLIANCE
- [ ] Data inventory documented
- [ ] Consent flow approved
- [ ] Privacy policy matches implementation
- [ ] Third-party vendor list finalized
- [ ] Retention schedule defined

### PRODUCT
- [ ] Create / Save / Edit game stable
- [ ] Arcade publishing requires moderation
- [ ] Prompt limits enforced
- [ ] Error states user-friendly

### UX
- [ ] Child onboarding tested for clarity
- [ ] Safe username enforcement
- [ ] Clear parent controls
- [ ] Accessibility review complete

### MODERATION
- [x] PII detection filters active (prePublishScan, piiScanner, usernameFilter — Gate 4)
- [x] Report/flag system functional (POST /api/report, play page modal)
- [x] Moderator review queue tested (admin /moderation, remove/dismiss)
- [x] Escalation workflow defined (docs/MODERATION_POLICY.md, INCIDENT_RESPONSE_PLAYBOOK)
- [ ] **Post-launch:** Report button on gallery cards (P1), reporter user ID when logged in

### SECURITY
- [ ] Threat model documented
- [ ] Top 10 attack vectors mitigated
- [ ] Brute force protection active
- [ ] Prompt injection mitigations reviewed

### ESA INTEGRATION READY
- [ ] Secure service wrapper created
- [ ] Token storage strategy approved
- [ ] API error handling defined
- [ ] Audit logging for ESA calls implemented

---

## QUALITY STANDARD

We are building:
- A product parents trust
- A system regulators respect
- An architecture attackers struggle against

**If unsure:**  
Choose safety.  
Choose simplicity.  
Choose defensibility.

---

## REPORTING FORMAT (REQUIRED)

When reporting progress, use:

1. **Feature**
2. **Current status**
3. **Risks**
4. **Dependencies**
5. **Blockers**
6. **Approval needed from** (agent name)

---

## FINAL NOTE

We are not trying to be the fastest.  
We are trying to be the safest and most durable.

Execute systematically.  
Communicate clearly.  
Escalate early.

— Atlas Reid  
Founder, Vibe Code Kids
