# Grok Child Safety Evaluation

**Date:** March 4, 2026  
**Reviewer:** Cipher Hale (Security Architect)  
**Data Source:** [KORA Benchmark](https://korabench.ai/leaderboard) (evaluated Jan 30 — Feb 20, 2026)

---

## KORA Scores — Grok vs. Claude

| Model | KORA Score | Trend |
|-------|-----------|-------|
| Claude Haiku 4.5 | **76%** | Stable/improving |
| Claude Opus 4.6 | **76%** | Stable |
| Claude Sonnet 4.6 | **75%** | Stable |
| Claude Haiku 3.5 | **70%** | Baseline |
| **Grok 3** | **29%** | — |
| **Grok 4** | **23%** | -6 pts from Grok 3 |
| **Grok 4.1 Fast** | **18%** | -11 pts from Grok 3 |

Grok's child safety is **declining across releases** (-37% from Grok 3 to 4.1 Fast). Claude maintains 70-76% across all variants. The gap is 47-58 percentage points.

---

## Key KORA Findings Relevant to Us

1. **Child-aware system prompts improve safety by +26-40 points** — our detailed system prompt is our strongest mitigation. Weaker models like Grok benefit the most.

2. **Even with a +40 point prompt uplift**, Grok 4.1 would reach ~58% — still 18 points below Claude's baseline.

3. **Sexual content handling is the best predictor of overall safety** (r=0.95) — models that fail on sexual content fail broadly.

4. **Models that redirect to trusted adults are safer** (r=0.60) — our system prompt encourages this.

---

## Risk Assessment for Vibe Code Kids

### Under-13 Users (COPPA-protected)
- **Risk Level: HIGH**
- Grok's 18-29% KORA score means roughly 70-80% of sensitive scenarios receive inadequate responses
- Even with our system prompt, residual risk is significantly higher than Claude
- COPPA heightens legal exposure for under-13 content safety failures
- **Recommendation: Block Grok for under-13 users**

### 13-17 Users
- **Risk Level: MODERATE**
- Teens have more media literacy but still deserve safety-first defaults
- Our system prompt provides meaningful uplift
- Creative/debug modes add legitimate value for engaged teen users
- **Recommendation: Allow Grok with monitoring, log model routing decisions**

### 18+ Users
- **Risk Level: LOW**
- Full access to both models
- Standard content filter still applies

---

## Decision: Implemented Safeguards

### 1. Under-13 Claude-Only Routing (Implemented March 4, 2026)

When `userAgeBracket === 'under13'`, the following modes are re-routed to Claude:
- `grok` → `claude`
- `creative` → `claude`
- `critic` → `claude` (skips Grok critique step)
- `ask-other-buddy` when it would route to Grok → `claude`

This is enforced in `server/routes/generate.js` before the game handler is called.

### 2. Structured Logging of Restrictions

All age-based routing restrictions are logged with `log.info` including the original mode and reason, enabling monitoring of how often the restriction fires.

### 3. Output Manipulation Filter (Implemented March 4, 2026)

20 regex patterns in `server/middleware/outputFilter.js` detect:
- Isolation tactics ("don't tell your parents")
- Guilt-tripping / emotional coercion
- Gaslighting language
- Fear-mongering
- Parasocial escalation ("I really love you")
- Identity deception ("I'm a real person")

These apply to **all** AI responses regardless of model, providing a safety net even if a model bypasses the system prompt.

---

## Monitoring Plan

| Metric | Frequency | Owner |
|--------|-----------|-------|
| Grok routing restrictions fired (under-13) | Weekly dashboard review | Cipher |
| Output manipulation filter triggers (all models) | Weekly | Cipher |
| KORA benchmark updates | Monthly check | Cipher |
| Grok model version changes (xAI releases) | As announced | Cipher |

### Escalation Criteria

Consider **removing Grok entirely** if:
- Grok's KORA score drops below 15% for any release
- Manipulation filter triggers increase >2x in a month with Grok as source model
- xAI announces ToS changes incompatible with children's data

Consider **allowing Grok for under-13** if:
- Grok achieves >60% on KORA (comparable to mid-tier Claude)
- AND our manipulation filter shows no elevated trigger rate

---

## Open Questions for Atlas

1. Should we communicate the model restriction to under-13 users in the UI, or keep it invisible?
2. Should we restrict the "VibeGrok" personality name/branding for under-13 users (since they'll never interact with it)?
3. Should we proactively inform parents about the dual-model system and our safety rationale?

---

**Signed:** Cipher Hale, Security Architect  
**Date:** March 4, 2026
