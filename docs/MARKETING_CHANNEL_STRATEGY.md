# Marketing Channel Strategy

**Owner:** Harper Lane (Growth Marketer)  
**Context:** Elias approved tracking plan 2026-03-05. Third-party pixels + retargeting allowed on **/esa and /contact only**. Landing (/) and gallery have first-party only.

---

## Attribution by Traffic Source

| Traffic Source | Landing URL | Pixels | Retargeting | Attribution |
|----------------|-------------|--------|-------------|-------------|
| **ESA campaigns** | /esa | ✅ Full (Google, Meta, TikTok) | ✅ Yes | Strong — full funnel visibility |
| **Contact / lead gen** | /contact | ✅ Full | ✅ Yes | Strong |
| **Brand / general** | / | First-party only | ❌ No | UTM + first-party events |
| **Gallery referrals** | /gallery | First-party only | ❌ No | First-party only |

---

## Recommended Channel Mix

### Tier 1: ESA-First (Arizona)

**Why:** Full pixel + retargeting. Best attribution, lowest CAC risk.

- **Google Search:** "Arizona ESA," "ClassWallet," "ESA coding"
- **Meta:** Arizona parent lookalikes, interest: education, ESA
- **Landing:** /esa
- **Retargeting:** Yes — from /esa visitors

### Tier 2: Contact / Lead Magnet

**Why:** Full pixel + retargeting. Good for parents asking questions.

- **Google Search:** "VibeCode Kids," "kids coding AI"
- **Meta:** Broad parent interest
- **Landing:** /contact (or /esa if ESA-focused)
- **Retargeting:** Yes

### Tier 3: General Awareness (Landing)

**Why:** First-party only. Use for broad reach; attribution via UTM + first-party.

- **Google Search:** "kids learn to code," "AI game maker for kids"
- **Meta / TikTok:** Broad parent audiences
- **Landing:** / (main landing)
- **Retargeting:** No
- **Attribution:** UTM params (`utm_source`, `utm_medium`, `utm_campaign`), first-party `page_view` + `cta_click`, signup conversion in our DB

---

## UTM Conventions (Landing Campaigns)

When driving to / or /gallery, use consistent UTM params so first-party data can segment:

```
utm_source=google|meta|tiktok
utm_medium=cpc|social|organic
utm_campaign=launch_q1|esa_az|brand_awareness
utm_content=hero_v1|trust_v1
```

First-party `page_view` and `cta_click` should capture these from `window.location` and send in event payload (add to Nova spec if not already).

---

## Ad Creative → Landing Matrix

| Creative Angle | Best Landing | Pixel Support |
|----------------|--------------|---------------|
| ESA / scholarship | /esa | Full |
| "Contact us" / questions | /contact | Full |
| General value prop | / | First-party only |
| Social proof / arcade | /gallery | First-party only |

---

## Budget Allocation (Revised)

Given pixel constraints, bias spend toward surfaces with full tracking:

| Channel | % | Primary Landing | Rationale |
|---------|---|-----------------|-----------|
| Google Search (ESA intent) | 25% | /esa | Full attribution |
| Google Search (general) | 15% | / | UTM + first-party |
| Meta (ESA/contact) | 20% | /esa, /contact | Full attribution |
| Meta (awareness) | 15% | / | First-party |
| TikTok | 10% | /esa preferred | If ESA creative works |
| Retargeting | 15% | /esa, /contact only | From approved surfaces |

---

## Reporting Limitations

- **Landing (/) campaigns:** No third-party view-through, no retargeting conversion. Rely on first-party signup events and UTM correlation.
- **ESA/contact campaigns:** Full funnel in ad platforms + our first-party.
