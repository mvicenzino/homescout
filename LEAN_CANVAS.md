# HomeScout - Lean Canvas

## One-Page Business Model

```
┌────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                         HOMESCOUT LEAN CANVAS                                          │
├──────────────────────┬──────────────────────┬──────────────────────┬──────────────────────┬────────────┤
│                      │                      │                      │                      │            │
│      PROBLEM         │      SOLUTION        │   UNIQUE VALUE       │  UNFAIR ADVANTAGE    │  CUSTOMER  │
│                      │                      │    PROPOSITION       │                      │  SEGMENTS  │
│  1. Listings         │  1. Universal        │                      │  1. AI-powered       │            │
│     scattered        │     browser          │  "Your home search,  │     personalized     │  PRIMARY:  │
│     across sites     │     extension        │   organized and      │     analysis         │            │
│                      │                      │   analyzed"          │                      │  First-time│
│  2. No way to        │  2. AI-powered       │                      │  2. Dual-mode        │  home      │
│     organize or      │     affordability    │  The smart home      │     (buyer + agent)  │  buyers    │
│     compare          │     & investment     │  buying companion    │     network effects  │            │
│     objectively      │     analysis         │  that helps you      │                      │  Couples & │
│                      │                      │  save, compare, and  │  3. Cross-platform   │  households│
│  3. "Can I afford    │  3. Household        │  confidently decide  │     aggregation      │  searching │
│     this?" is        │     collaboration    │  — solo or together  │     (not locked to   │  together  │
│     unanswered       │     with shared      │                      │     one portal)      │            │
│                      │     ratings          │                      │                      │  ──────────│
│  4. Partners can't   │                      │                      │  4. Purpose-built    │            │
│     easily decide    │  4. Side-by-side     │                      │     for decisions,   │  SECONDARY:│
│     together         │     comparison       │                      │     not discovery    │            │
│                      │                      │                      │                      │  Independent│
│  EXISTING            │  5. Financial        │                      │                      │  real estate│
│  ALTERNATIVES:       │     calculators      │                      │                      │  agents    │
│                      │     integrated       │                      │                      │            │
│  - Zillow favorites  │                      │                      │                      │            │
│  - Spreadsheets      │                      │                      │                      │            │
│  - Notes apps        │                      │                      │                      │            │
│  - Text threads      │                      │                      │                      │            │
│                      │                      │                      │                      │            │
├──────────────────────┴──────────────────────┼──────────────────────┴──────────────────────┴────────────┤
│                                             │                                                          │
│              KEY METRICS                    │                        CHANNELS                          │
│                                             │                                                          │
│  ACQUISITION:                               │  OWNED:                                                  │
│  • App downloads                            │  • App Store / Google Play                               │
│  • Browser extension installs               │  • Website & SEO                                         │
│  • Registered users                         │  • Browser extension                                     │
│                                             │  • Email marketing                                       │
│  ACTIVATION:                                │                                                          │
│  • Properties saved (target: 5+)            │  EARNED:                                                 │
│  • AI analysis used                         │  • Word of mouth (partner invites)                       │
│  • Partner invited                          │  • Agent referrals to clients                            │
│                                             │  • Social media / Reddit                                 │
│  ENGAGEMENT:                                │  • PR / media coverage                                   │
│  • Weekly active users                      │                                                          │
│  • Properties compared                      │  PAID:                                                   │
│  • Notes/ratings added                      │  • Facebook/Instagram ads                                │
│                                             │  • Google search ads                                     │
│  REVENUE:                                   │  • Real estate podcast sponsorships                      │
│  • Free-to-paid conversion (target: 5-10%) │                                                          │
│  • Monthly recurring revenue (MRR)          │                                                          │
│  • Churn rate (target: <5%)                 │                                                          │
│                                             │                                                          │
├─────────────────────────────────────────────┴──────────────────────────────────────────────────────────┤
│                                                                                                        │
│                                          COST STRUCTURE                                                │
│                                                                                                        │
│  FIXED COSTS:                               VARIABLE COSTS:                                            │
│  • Development & maintenance                • AI API costs (Anthropic Claude)                         │
│  • Cloud infrastructure (Supabase)          • Payment processing (Stripe ~2.9%)                       │
│  • App store fees ($99/yr Apple)            • Customer acquisition (ads)                              │
│                                             • Customer support scaling                                 │
│                                                                                                        │
│  EARLY STAGE MONTHLY BURN: $2,000 - $5,000                                                            │
│  └── Infrastructure: $200-500                                                                         │
│  └── AI API calls: $500-1,500                                                                         │
│  └── Marketing: $500-2,000                                                                            │
│  └── Tools & services: $200-500                                                                       │
│                                                                                                        │
├────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                                        │
│                                          REVENUE STREAMS                                               │
│                                                                                                        │
│  PRIMARY (70%):                             SECONDARY (20%):              FUTURE (10%):               │
│                                                                                                        │
│  Subscriptions                              Partner Referrals             Data & Insights              │
│  ├── Buyer Premium: $9.99/mo               ├── Mortgage lenders          ├── Market trends            │
│  ├── Agent Pro: $29/mo                     ├── Home inspectors           ├── Buyer preferences        │
│  └── Agent Team: $79/mo                    ├── Title companies           └── Brokerage analytics      │
│                                             └── Insurance                                              │
│                                                                                                        │
│  YEAR 1 TARGET: $50K - $200K ARR                                                                      │
│  YEAR 2 TARGET: $600K - $2.5M ARR                                                                     │
│  YEAR 3 TARGET: $3M - $10M ARR                                                                        │
│                                                                                                        │
└────────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## Detailed Breakdown

### 1. PROBLEM

| Problem | Who Feels It | Current Workaround | Why It Fails |
|---------|--------------|-------------------|--------------|
| Listings scattered across multiple sites | All buyers | Separate favorites on each site | No unified view, duplicates, hard to compare |
| No objective way to compare properties | Serious buyers | Spreadsheets, notes | Manual entry, no photos, no calculations |
| "Can I actually afford this?" unanswered | First-time buyers | Generic online calculators | Not personalized to individual finances |
| Partners can't easily decide together | Couples, families | Text screenshots, verbal discussions | Gets lost, no structured feedback, arguments |
| Agents lose track of client preferences | Real estate agents | CRMs, spreadsheets | Disconnected from what clients actually see |

**Early Adopter Profile:**
- First-time home buyer, 28-40 years old
- Buying with partner or spouse
- Has saved 15+ properties across 2-3 sites
- Feeling overwhelmed, needs organization
- Wants confidence they can afford their choice

---

### 2. SOLUTION

| Problem | Solution | Feature |
|---------|----------|---------|
| Scattered listings | Universal capture | Browser extension saves from any site |
| Can't compare objectively | Smart comparison | Side-by-side view with all data points |
| Affordability uncertainty | AI analysis | Personalized affordability & investment scoring |
| Partners can't decide | Household collaboration | Shared ratings, see where you agree |
| Agents lose track | Pro dashboard | Client CRM with preference insights |

**MVP Features (Launch):**
1. Save properties from any listing site
2. Rate and add notes
3. Basic comparison view
4. Mortgage calculator
5. Partner invite

**V2 Features (Post-Launch):**
1. AI property analysis
2. Advanced comparison
3. Agent Pro mode
4. Financial profile integration

---

### 3. UNIQUE VALUE PROPOSITION

**High-Level UVP:**
> "Your home search, organized and analyzed"

**Expanded UVP:**
> "The smart home buying companion that helps you save, compare, and confidently decide — solo or together"

**For Different Segments:**

| Segment | UVP |
|---------|-----|
| Individual buyers | "Finally, a way to organize your home search and know what you can afford" |
| Couples | "The app that helps you and your partner agree on a home" |
| First-time buyers | "AI-powered guidance through your first home purchase" |
| Agents | "See exactly what your clients want, close deals faster" |

---

### 4. UNFAIR ADVANTAGE

Things that **cannot be easily copied or bought:**

| Advantage | Why It's Defensible |
|-----------|---------------------|
| **AI personalization** | Trained on actual buyer decisions over time |
| **Network effects** | Buyers invite partners, agents invite clients |
| **Cross-platform data** | Aggregate insights from all listing sources |
| **Decision-focused positioning** | Zillow focused on discovery, we own decisions |
| **Dual-sided marketplace** | Buyers and agents on same platform |

**Moat Timeline:**
- **Year 1:** Speed & UX (can be copied)
- **Year 2:** Network effects & data (harder to copy)
- **Year 3:** AI models trained on outcomes (very hard to copy)

---

### 5. CUSTOMER SEGMENTS

**Primary Segment: Home Buyers**

| Sub-Segment | Size | Characteristics | Willingness to Pay |
|-------------|------|-----------------|-------------------|
| First-time buyers | 2.1M/year | Overwhelmed, need guidance | High |
| Move-up buyers | 1.8M/year | Coordinating family needs | Medium |
| Relocating buyers | 800K/year | Searching remotely | High |
| Investors | 1.2M/year | Need ROI analysis | Very High |

**Secondary Segment: Real Estate Agents**

| Sub-Segment | Size | Characteristics | Willingness to Pay |
|-------------|------|-----------------|-------------------|
| Solo agents | 800K | Need affordable tools | Medium |
| Small teams | 200K | Need collaboration | High |
| Top producers | 100K | Need efficiency | Very High |

**Beachhead Market:**
- First-time buyers in major US metros
- Ages 28-40, tech-savvy
- Combined household income $100K-$250K
- Currently using spreadsheets or Zillow favorites

---

### 6. CHANNELS

**Acquisition Channels (by priority):**

| Channel | Cost | Volume | Quality |
|---------|------|--------|---------|
| **Organic/SEO** | Low | Medium | High |
| **Word of mouth** | Free | Low→High | Very High |
| **Partner invites** | Free | Medium | Very High |
| **Reddit/communities** | Low | Medium | High |
| **Agent referrals** | Free | Medium | High |
| **Paid social** | Medium | High | Medium |
| **Paid search** | High | High | Medium |

**Channel Strategy by Phase:**

| Phase | Primary Channels |
|-------|------------------|
| Launch (0-6mo) | Product Hunt, Reddit, friends & family, early agent partnerships |
| Growth (6-18mo) | SEO, content marketing, agent referral program, paid social |
| Scale (18mo+) | Paid search, partnerships, enterprise sales |

---

### 7. KEY METRICS

**Pirate Metrics (AARRR):**

| Stage | Metric | Target |
|-------|--------|--------|
| **Acquisition** | App downloads | 10K/month by month 12 |
| **Activation** | Saved 5+ properties | 60% of signups |
| **Retention** | Weekly active users | 40% WAU/MAU |
| **Revenue** | Free-to-paid conversion | 5-10% |
| **Referral** | Partner invites sent | 30% of users |

**North Star Metric:**
> **Properties analyzed per week**
> (Indicates engaged users getting value from core feature)

---

### 8. COST STRUCTURE

**Fixed Monthly Costs:**
| Item | Cost | Notes |
|------|------|-------|
| Supabase (database/auth) | $25-100 | Scales with usage |
| Vercel/hosting | $20-50 | Landing page, web app |
| Apple Developer | $8 | $99/year |
| Google Play | $2 | $25 one-time |
| Domain & email | $20 | Google Workspace |
| **Total Fixed** | **$75-180** | |

**Variable Costs:**
| Item | Cost | Notes |
|------|------|-------|
| Anthropic API | $0.01-0.05/analysis | ~$500-2K/month at scale |
| Stripe fees | 2.9% + $0.30 | Per transaction |
| SendGrid/email | $20-100 | Scales with users |
| Customer support | Variable | Tool costs + time |

**Breakeven Analysis:**
```
Monthly fixed costs: ~$500 (with some marketing)
Average revenue per paid user: ~$12/month (blended)
Breakeven: ~42 paying users

With $2K/month burn (including marketing):
Breakeven: ~170 paying users
```

---

### 9. REVENUE STREAMS

**Subscription Revenue:**

| Tier | Price | Target Users | Monthly Revenue |
|------|-------|--------------|-----------------|
| Buyer Free | $0 | 90% of buyers | $0 |
| Buyer Premium | $9.99/mo | 10% of buyers | $9.99 × users |
| Agent Starter | $0 | 70% of agents | $0 |
| Agent Pro | $29/mo | 25% of agents | $29 × users |
| Agent Team | $79/mo | 5% of agents | $79 × users |

**Revenue Model Example (Year 2):**
```
100,000 registered buyers
├── 90,000 free users ($0)
└── 10,000 premium users × $9.99 = $99,900/month

2,000 registered agents
├── 1,400 free users ($0)
├── 500 Pro users × $29 = $14,500/month
└── 100 Team users × $79 = $7,900/month

Subscription MRR: $122,300
Partner referrals: $15,000/month
Total MRR: ~$137,000
Annual Revenue: ~$1.6M
```

---

## Hypotheses to Test

| Hypothesis | Test | Success Metric |
|------------|------|----------------|
| Buyers will save from multiple sites | Track extension usage | 50%+ use on 2+ sites |
| AI analysis drives upgrades | A/B test paywall placement | 5%+ conversion |
| Partners will invite each other | Track invite rate | 30%+ send invite |
| Agents will refer to clients | Track referral source | 20%+ from agents |
| Users will pay $9.99/month | Launch premium tier | 5%+ convert |

---

## Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Zillow adds similar features | Medium | High | Move fast, focus on AI/collaboration |
| Low conversion to paid | Medium | High | Test pricing, add more premium value |
| High churn after purchase | Medium | Medium | Add post-purchase features, agent tools |
| AI costs exceed revenue | Low | Medium | Optimize prompts, cache results |
| Browser extension blocked | Low | High | Mobile paste URL, agent sharing |

---

## 90-Day Plan

**Days 1-30: Validate**
- [ ] Launch on Product Hunt
- [ ] Get 500 beta users
- [ ] Conduct 20 user interviews
- [ ] Measure activation rate

**Days 31-60: Iterate**
- [ ] Fix top 3 user complaints
- [ ] Add most-requested feature
- [ ] Start content marketing
- [ ] Reach 2,000 users

**Days 61-90: Monetize**
- [ ] Launch premium tier
- [ ] Get first 50 paying users
- [ ] Onboard 10 agent beta users
- [ ] Reach $1K MRR

---

*Last updated: January 2025*
