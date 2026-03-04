# Marketing Baseline Metrics

**Owner:** Harper Lane (Growth Marketer)  
**Last Updated:** March 2026  
**Reference:** `docs/UX_AUDIT.md` section 7 (Lumi's success metrics), `docs/MARKETING_TRACKING_PLAN.md`

---

## Purpose

Define what we measure post-launch so we know if campaigns and funnels are improving. Events map to the tracking plan; metrics feed weekly reporting to Atlas.

---

## Funnel Metrics

| Stage | Metric | Definition | Data Source |
|-------|--------|------------|-------------|
| **Awareness** | Landing page visitors | Unique visitors to / (Landing A or B) | `pageview` (Landing B), first-party analytics (pending) |
| **Engagement** | CTA click rate | % of visitors who click any "Get Started" / "Try It Now" / "Start Free Trial" | `cta_click` (pending) |
| **Signup** | Landing → signup % | Visitors who reach signup flow / total visitors | `signup` gate hit (Landing B), AuthModal open (pending) |
| **Account created** | Signup completion rate | Accounts created / signup flow started | `register_success` (auth) — Lumi target >70% |
| **Consent** | Consent grant rate | Under-13: parents who approve / consent emails sent | `consent_granted` — Lumi target >50% |
| **Activation** | Time to first game | Minutes from account_created → first `POST /api/generate` | Backend timestamps — Lumi target <5 min |
| **Conversion** | Free → paid % | Users who upgrade to Creator or Pro / total signups | Stripe webhooks |

---

## Event-to-Metric Mapping

| Metric | Events Required | Status |
|--------|-----------------|--------|
| Landing page visitors | `pageview` on / | Landing B only (demo_events); Landing A needs first-party |
| CTA click rate | `cta_click` | Pending Elias approval |
| Signup gate conversion | `signup` (Landing B) | Implemented |
| Account created | `register_success` | Auth route; needs event for marketing dashboard |
| Consent grant rate | `consent_granted` | Consent flow; needs event |
| Time to first game | `account_created` + first `POST /api/generate` | Backend; no marketing event needed |
| Free → paid | Stripe `checkout.session.completed` | Billing webhook |

---

## Weekly Reporting Template

**Harper → Atlas (weekly):**

| Metric | This Week | Last Week | Trend |
|--------|-----------|-----------|-------|
| Landing visitors | | | |
| Signup flow started | | | |
| Accounts created | | | |
| Consent grants (under-13) | | | |
| Time to first game (median) | | | |
| Upgrades (Creator/Pro) | | | |
| Ad spend | | | |
| CAC (if paid ads live) | | | |

---

## Leading vs Lagging

| Type | Metric | Use |
|------|--------|-----|
| **Leading** | CTA click rate, signup flow start | Early signal; optimize before conversion |
| **Leading** | Demo generations before gate (Landing B) | Engagement depth |
| **Lagging** | Account created | Core output |
| **Lagging** | Consent grant rate | Under-13 activation blocker |
| **Lagging** | Time to first game | Product-market fit signal |
| **Lagging** | Free → paid | Revenue |

---

## Dashboard Spec (for Nova)

When tracking is Elias-approved and implemented, Harper needs:

1. **Funnel view** — Landing visitors → signup start → account created → first game (by week)
2. **Landing A vs B** — Compare signup rate by variant (from `demo_events` + Landing A data when available)
3. **Consent funnel** — Emails sent → grants → denials (by week)
4. **No child PII** — All aggregates only; no user-level data in marketing dashboard

---

## References

| Doc | Path |
|-----|------|
| Lumi success metrics | `docs/UX_AUDIT.md` section 7 |
| Tracking plan | `docs/MARKETING_TRACKING_PLAN.md` |
| Demo events | `server/services/demoEvents.js` |
