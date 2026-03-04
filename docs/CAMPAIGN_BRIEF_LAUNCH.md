# Campaign Brief — Launch: Screen-Smart Parent

**Owner:** Harper Lane (Growth Marketer)  
**Status:** Approved — Elias 2026-03-05, Atlas 2026-03-05.  
**Use:** Parent-acquisition campaign for Vibe Code Kids launch.

---

## 1) Campaign Objective + Target Parent Persona

**Objective:** Acquire paying parents who sign up their child and convert to Creator ($13/mo) or Pro ($21/mo) within 60 days.

**Target Persona: "Screen-Smart Parent"**
- Parent of 7–14-year-old
- Wants tech to be educational, not passive
- Concerned about screen time and content
- Will pay for genuine learning
- Suburbs or mid-size metros
- Interests: coding, STEM, ESA/ClassWallet, after-school enrichment

**Demographics / signals:** Parents 30–50, US, interest in "kids coding," "educational games," "screen time limits," "Arizona ESA" (for ESA-specific campaigns)

---

## 2) Offer + Hook + Key Message

**Offer:** Free 30-day trial — 3 games/month, 10 prompts/day, no credit card required.

**Hook (headline):** *"Your kid describes a game. AI builds it."*

**Key message:** *"Turn screen time into real coding skills. Kids learn by creating games with AI—no experience needed."*

**Supporting claims:**
- COPPA compliant, parental consent for under-13, minimal data
- Real code: kids can view and edit source code behind every game
- E-rated content only; AI content moderation
- Parent dashboard: view creations, set limits, request deletion anytime

---

## 3) Funnel Map

```
Ad (Google / Meta / TikTok)
    → Landing (/) — variant A or B
    → CTA: "Get Started Free" / "Try It Now"
    → AuthModal opens [TRACKING BOUNDARY — stop pixels here]
    → Signup (parent email if under-13)
    → Consent flow (under-13)
    → Studio → First game
    → Upgrade prompt when limits hit
```

**Tracking boundary:** Marketing pixels must stop before AuthModal. No tracking in signup flow or Studio.

---

## 4) Tracking Plan

**Elias approved 2026-03-05.** See `docs/MARKETING_TRACKING_PLAN.md` for full details.

| Event | Where | Data | Status |
|-------|-------|------|--------|
| `pageview` | Landing B | visitorId, variant, referrer, device | Implemented |
| `signup` | Landing B gate | visitorId, promptsUsed | Implemented |
| `page_view` | /, /esa, /contact, /gallery | URL, referrer, device | Approved — first-party only |
| `cta_click` | Same | Button ID, section | Approved |
| `checkout_start` | Stripe redirect | Session ID | Approved |
| Third-party pixels | **/esa, /contact only** | — | Approved (no pixels on / or /gallery) |
| Retargeting | **/esa, /contact only** | — | Approved (no retargeting from landing) |

---

## 5) Creative Variants (5 Angles)

| # | Angle | Headline | Visual | CTA |
|---|-------|----------|--------|-----|
| 1 | Outcome (education) | "Turn screen time into real skills." | Kid at laptop, game on screen | Try Free |
| 2 | Magic moment | "Describe it. AI builds it." | Kid typing, game appears | Try Free |
| 3 | Trust | "COPPA compliant. Kid-safe. You're in control." | Parent + kid, or parent dashboard | Learn More |
| 4 | ESA | "Use your ESA funds for coding." | Arizona + ClassWallet | See How |
| 5 | Social proof | "Games built by kids like yours." | Gallery/arcade shots | Play Now |

---

## 6) Experiment Plan

**A/B: Landing A vs B**
- **Hypothesis:** Landing B ("Try It Now") increases signup by ≥15% vs Landing A.
- **Metric:** Signup rate (account created / unique visitor).
- **Success criteria:** B ≥15% lift, 95% CI, 2-week run.
- **Design:** 50/50 traffic via `abVariant.ts`.

**CTA copy test:**
- Control: "Get Started Free"
- Variant: "Try Free — No Credit Card"
- Metric: Hero CTA click-through rate.

---

## 7) Budget Allocation Suggestion

| Channel | % | Rationale |
|---------|---|-----------|
| Google Search | 40% | Intent: "coding for kids," "ESA," "educational tech" |
| Meta (FB/IG) | 30% | Parent audiences, interest targeting |
| TikTok | 15% | Younger parents |
| Retargeting | 15% | **ESA + contact page visitors only** (per Elias: no retargeting from landing) |
| **Total** | 100% | |

**Phase 1 (weeks 1–2):** 70% brand/awareness, 30% conversion.  
**Phase 2 (weeks 3–4):** 50/50 based on creative performance.

---

## 8) Compliance Notes (Elias Approved 2026-03-05)

1. **Child data boundary** — Pixels stop before AuthModal. First-party only on / and /gallery.
2. **Third-party pixels** — Allowed on **/esa and /contact only**. NOT on / or /gallery (child traffic).
3. **Retargeting** — Audiences from **/esa and /contact only**. NOT from landing.
4. **Landing B visitorId** — Approved. First-party, no PII, 90-day retention.
5. **Claims** — All creative claims must be verified: COPPA, ages 7–18, ESA eligibility.

---

## Sign-Off

| Role | Name | Date | Approved? |
|------|------|------|-----------|
| Growth Marketer | Harper Lane | | |
| Vision Lead | Atlas Reid | 2026-03-05 | ✅ **Approved** — positioning, budget allocation, creative angles cleared for launch |
| Compliance | Elias Vance | 2026-03-05 | ✅ **Campaign brief approved** (tracking plan + claims verified) |

### Elias — Claim Verification (2026-03-05)

| Claim | Verified? | Notes |
|-------|-----------|-------|
| COPPA compliant, parental consent for under-13 | ✅ | VPC flow, age-gate, parent dashboard implemented |
| Minimal data | ✅ | Age bracket only, no exact age; PII stripped before AI |
| Real code: kids can view and edit source | ✅ | Code panel in studio |
| E-rated content only; AI content moderation | ✅ | Content filter, output filter, pre-publish scan; "E-rated" is informal — we have moderation |
| Parent dashboard: view creations, set limits, deletion | ✅ | Parent Command Center has all three |
| "COPPA compliant. Kid-safe. You're in control." | ✅ | Accurate |
| ESA campaigns | ⚠️ | Confirm ESA/ClassWallet is live before running ESA-specific paid ads. If waitlist-only, adjust angle |
| Ages 7–14 persona | ✅ | Within our 5–18 supported range |

**Budget correction:** Retargeting line updated — audiences must be built from /esa and /contact only, not from landing visitors. Harper: adjust channel mix if retargeting volume from ESA/contact is limited; do not add landing retargeting.
