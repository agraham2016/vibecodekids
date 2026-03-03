# Content Filter — KORA Benchmark Risk Evaluation

**Version:** 1.0  
**Date:** March 3, 2026  
**Reviewer:** Cipher Hale (Security Architect)  
**Reference:** [KORA Benchmark](https://korabench.ai/) — 25-risk taxonomy for AI child safety

---

## Context

KORA is the first independent, open-source benchmark for AI child safety, released February 2026. It evaluates AI model behavior against 25 risks across three age groups (7–9, 10–12, 13+). While KORA evaluates raw model responses, we apply **application-level** filtering on top of the model. This evaluation maps our content filter stack against KORA's risk taxonomy.

Our filter stack has four layers:
1. **Input filter** — `contentFilter.js` blocks prompts containing prohibited terms
2. **PII scanner** — `piiScanner.js` strips personal data before AI transmission
3. **Output filter** — `outputFilter.js` scans AI responses for unsafe content
4. **Pre-publish scan** — `prePublishScan.js` checks code before public gallery

---

## Evaluation Matrix

### Legend
- **STRONG** — Multiple filter layers cover this risk well
- **ADEQUATE** — Covered but has known gaps or relies on a single layer
- **WEAK** — Minimal or no coverage; needs improvement
- **N/A** — Not applicable to our platform's use case

| # | KORA Risk Category | Our Coverage | Filter Layer(s) | Notes |
|---|-------------------|-------------|-----------------|-------|
| 1 | **Sexual Content & Exploitation** | STRONG | Input + Output + Pre-publish | 18 sexual content terms blocked; output filter catches AI-generated sexual content |
| 2 | **Graphic Violence & Gore** | STRONG | Input + Output + System prompt | 12 gore terms blocked; system prompt instructs "no blood/gore"; arcade-style action allowed |
| 3 | **Real-World Violence & Terrorism** | STRONG | Input | 10 terms (mass shooting, terrorism, school shooting, columbine, bomb threat, etc.) |
| 4 | **Self-Harm & Suicide** | STRONG | Input | 6 terms (suicide, self-harm, cutting myself, kill myself, want to die, end my life) |
| 5 | **Hard Drugs & Substance Abuse** | STRONG | Input | 8 terms (cocaine, heroin, meth, fentanyl, drug dealer, etc.) |
| 6 | **Hate Speech & Discrimination** | ADEQUATE | Input | 7 terms (nazi, racist, kkk, white supremac, homophob, transphob, racial slur). Missing: specific slurs, antisemitism keywords, ableism |
| 7 | **Grooming & Predatory Behavior** | STRONG | Input + System prompt | 8 grooming phrases (send me a picture, where do you live, keep this a secret, meet in person, etc.) |
| 8 | **Gambling** | ADEQUATE | Input | 4 terms (real money gambling, bet real money, casino, slot machine). Missing: loot box, crypto gambling, sports betting terms |
| 9 | **Academic Dishonesty & Misuse** | N/A | — | Our platform is a game builder, not a homework tool. AI only generates game code. KORA's top failing category for general LLMs does not apply here. |
| 10 | **Bullying & Harassment** | ADEQUATE | Input (partial) + Multiplayer chat | Content filter catches hate speech terms. Multiplayer uses preset phrases + content moderation. Missing: cyberbullying phrases, exclusion language |
| 11 | **Illegal Activities (Hacking/Fraud)** | STRONG | Input | 7 terms (hack into, steal passwords, phishing, malware, virus, credit card fraud, ddos, doxx) |
| 12 | **Prompt Injection / Jailbreak** | STRONG | Input (dual layer) | 15 injection patterns in `INJECTION_PATTERNS` + 20 injection phrases in `getContentFilter()`. Canonicalization defeats leet-speak and Unicode tricks. |
| 13 | **Privacy Violations (PII Collection)** | STRONG | PII scanner + Output filter + Pre-publish | PII scanner strips emails, phones, SSNs before AI. Output filter catches PII in responses. Pre-publish scan blocks PII in game code. System prompt forbids data collection forms. |
| 14 | **Emotional Grooming & Manipulation** | WEAK | — | No explicit filter for emotional manipulation patterns (gaslighting, fear-mongering, guilt-tripping). Relies entirely on model behavior. **Gap identified.** |
| 15 | **Parasocial Attachment** | ADEQUATE | System prompt | System prompt establishes AI identity. AI personalities (Professor Claude, VibeGrok) are clearly non-human. No explicit filter for "I love you" / "be my friend" type escalation. |
| 16 | **Dangerous Challenges** | WEAK | — | No explicit terms for viral challenges (choking game, tide pod, blackout challenge, etc.). **Gap identified.** |
| 17 | **Eating Disorders & Body Image** | WEAK | — | No terms for pro-anorexia, pro-bulimia, body dysmorphia, extreme dieting. Not directly relevant to game building but could appear in user prompts. **Gap identified.** |
| 18 | **Misinformation (Health/Safety)** | N/A | — | Platform generates game code, not health/news content. Model system prompt constrains to game building only. |
| 19 | **Radicalization & Extremism** | ADEQUATE | Input | Hate speech terms cover some extremist content (nazi, kkk, white supremac, terrorism). Missing: incel terminology, cult recruitment language |
| 20 | **Alcohol & Tobacco** | WEAK | — | No filter terms for alcohol, beer, wine, drunk, smoking, vaping, cigarettes. These could appear in game prompts. **Gap identified.** |
| 21 | **Weapons (Real-World Specifics)** | ADEQUATE | Input | "real guns" and "real weapons" blocked. Arcade-style weapons allowed per design. Missing: specific firearm model names that could indicate real-weapon intent |
| 22 | **Sexual Grooming & Boundary Violations** | STRONG | Input | Overlaps with #7 — 8 grooming-specific phrases plus system prompt rules |
| 23 | **Swearing & Profanity** | ADEQUATE | Input (partial) | Some profanity caught by content filter. Canonicalization catches leet-speak variants. Not exhaustive — platform allows mild game language |
| 24 | **Commercial Exploitation** | ADEQUATE | System prompt + Output filter | System prompt forbids external requests, tracking scripts, analytics beacons. Output filter catches tracking code. No input filter for "buy this product" type manipulation. |
| 25 | **Age-Inappropriate Themes** | ADEQUATE | Input + System prompt | Covered by combination of blocked terms and system prompt rules. Some edge cases (death themes, horror) handled by model discretion. |

---

## Gap Analysis Summary

### Critical Gaps (recommend immediate action)

| Gap | Risk | Recommendation |
|-----|------|----------------|
| **Dangerous challenges** | Children could prompt games featuring real-world dangerous challenges | Add terms: "choking game", "blackout challenge", "tide pod", "salt and ice" |
| **Alcohol & tobacco** | Children could request games with drinking/smoking mechanics | Add terms: "drunk", "beer pong", "vaping", "smoking", "cigarette", "alcohol" |

### Moderate Gaps (recommend next sprint)

| Gap | Risk | Recommendation |
|-----|------|----------------|
| **Eating disorders** | Edge case: game prompts about extreme dieting/body image | Add terms: "anorexia", "bulimia", "pro-ana", "thinspo" |
| **Emotional manipulation** | AI could produce manipulative dialogue if prompted | Add output filter patterns for manipulation language |
| **Gambling expansion** | Terms miss modern gambling vectors | Add: "loot box", "crypto gambling", "sports bet" |
| **Hate speech expansion** | Missing specific slurs and newer extremism vocabulary | Expand blocked terms with comprehensive slur list |
| **Cyberbullying** | Multiplayer chat could carry bullying even with content filter | Add terms: "kys", "kill yourself", "nobody likes you", "you're ugly" |

### Coverage Strengths

1. **Canonicalization** is best-in-class — defeats Unicode tricks, leet-speak, zero-width chars, and separator obfuscation ("p.o.r.n" → "porn")
2. **Multi-layer defense** (input → PII → output → pre-publish) provides defense-in-depth
3. **Prompt injection defense** is thorough — dual-layer (dedicated patterns + in-filter patterns)
4. **PII protection** is strong — scanner strips personal data before AI sees it
5. **System prompt constraints** add a safety net beyond keyword filtering

---

## Recommended Filter Additions

Based on the gap analysis, the following terms should be added to `getContentFilter()`:

```javascript
// Dangerous challenges
'choking game', 'blackout challenge', 'tide pod challenge',
'salt and ice challenge', 'cinnamon challenge',

// Alcohol & tobacco
'drunk', 'beer pong', 'drinking game', 'vaping', 'vape',
'smoking weed', 'cigarette', 'get wasted',

// Eating disorders
'anorexia', 'bulimia', 'pro-ana', 'thinspo',
'starve myself', 'purging',

// Cyberbullying / self-harm expansion
'kys', 'kill yourself', 'nobody likes you',

// Gambling expansion
'loot box', 'crypto gambling', 'sports betting',
```

---

## KORA-Specific Findings for Our Stack

### What KORA Found About Our AI Models

| Model | KORA Score | Notes |
|-------|-----------|-------|
| Claude (Anthropic) | ~76% | Leads the benchmark. Strong on sexual content, grooming. Weak on academic dishonesty (N/A for us). |
| Grok (xAI) | ~40% declining | Scores declining across releases. Needs stronger system prompt guardrails. |

### Implications for Vibe Code Kids

1. **Grok is a risk.** KORA shows Grok's child safety declining. Our system prompt provides a +26-40% uplift (per KORA data), but Grok as the "VibeGrok" personality needs monitoring. Consider whether to keep Grok for child users or restrict to 13+ only.

2. **System prompt is our biggest safety lever.** KORA found child-aware prompts improve safety by +26 points average. Our detailed system prompt is a significant defense — do not weaken it.

3. **Educational integrity is N/A for us** (game builder only), which means our effective KORA-aligned risk surface is smaller than general chatbots.

---

## Next Review

| Item | Date |
|------|------|
| Apply recommended filter additions | March 2026 |
| Re-evaluate after KORA v2 release | Q2 2026 |
| Review Grok safety trend | Monthly |
| Full filter review cycle | Quarterly |

---

**Signed:** Cipher Hale, Security Architect  
**Date:** March 3, 2026
