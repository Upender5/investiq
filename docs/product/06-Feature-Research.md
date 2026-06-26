# 06 — Feature Research & Specifications

**InvestIQ Product Research** | Version 1.0 | June 2026

---

## Feature Specification Template

Every feature in this document follows this structure:

```
Feature Name
├── Purpose
├── Problem Solved
├── User Story
├── Acceptance Criteria
├── Dependencies
├── Priority (MoSCoW)
├── Complexity (T-shirt)
├── Business Impact
├── Implementation Details
│   ├── Frontend
│   ├── Backend
│   ├── Database
│   ├── API
│   ├── AI
│   ├── Security
│   ├── Notifications
│   └── Analytics
├── Edge Cases
└── Future Improvements
```

---

## 6.1 Core MVP Features

### F1: 30-Second Onboarding

| Field | Detail |
|-------|--------|
| **Purpose** | Minimize drop-off in first 30 seconds of app usage |
| **Problem Solved** | 60% of users abandon apps with >3 screen onboarding |
| **User Story** | *As a student, I want to start using InvestIQ immediately, so I don't lose interest.* |
| **Acceptance Criteria** | <br>1. Phone number + OTP = 2 taps<br>2. Name, age, college, course, year = 5 taps<br>3. Total onboarding < 30 seconds<br>4. KYC deferred until first investment |
| **Dependencies** | SMS gateway (Twilio/MSG91), phone number validation |
| **Priority** | **Must Have** |
| **Complexity** | Small |
| **Business Impact** | Critical — determines activation rate |

**Implementation:**

| Layer | Detail |
|-------|--------|
| **Frontend** | React Native: Animated progress bar, auto-advance on valid input, haptic feedback |
| **Backend** | Java/Spring Boot: OTP generation (6-digit, 5-min expiry), rate limiting (3 OTPs/hour) |
| **Database** | PostgreSQL: `users` table with `onboarding_status` enum |
| **API** | `POST /api/v1/auth/otp/send` → `POST /api/v1/auth/otp/verify` → `POST /api/v1/users` |
| **AI** | N/A |
| **Security** | OTP encrypted at rest, brute-force protection, device fingerprinting |
| **Notifications** | SMS fallback if WhatsApp unavailable |
| **Analytics** | Funnel: Download → Open → OTP Sent → OTP Verified → Profile Complete |

**Edge Cases:**
- Invalid phone number → Show country code picker, validate via libphonenumber
- OTP not received → Resend with cooldown (30s, 60s, 120s)
- Duplicate phone → "Already registered? Log in"
- No network → Queue request, retry with exponential backoff

**Future Improvements:**
- Social login (Google) for faster onboarding
- Deep link from Instagram ad → Pre-fill UTM params
- Referral code auto-detection from clipboard

---

### F2: Progressive KYC (DigiLocker + Video KYC)

| Field | Detail |
|-------|--------|
| **Purpose** | SEBI-compliant identity verification with minimal friction |
| **Problem Solved** | KYC abandonment is #1 drop-off point in fintech apps |
| **User Story** | *As a student, I want to verify my identity without visiting a branch, so I can start investing from my hostel.* |
| **Acceptance Criteria** | <br>1. DigiLocker PAN fetch: 1 tap<br>2. Aadhaar OTP: 1 tap<br>3. Video KYC: 2 minutes, selfie + liveness<br>4. CKYC check: Auto-detect existing KYC<br>5. Full KYC status visible in profile |
| **Dependencies** | DigiLocker API, UIDAI Aadhaar API, Video KYC provider (HyperVerge/Fractal), CKYC registry |
| **Priority** | **Must Have** |
| **Complexity** | Large |
| **Business Impact** | Regulatory requirement; enables all investing features |

**Implementation:**

| Layer | Detail |
|-------|--------|
| **Frontend** | React Native: Camera integration, liveness detection UI, document upload with compression |
| **Backend** | Java/Spring Boot: DigiLocker OAuth2 flow, Aadhaar eKYC, video review queue |
| **Database** | PostgreSQL: `kyc_records` table with `status`, `digilocker_consent_id`, `video_kyc_url` |
| **API** | `POST /api/v1/users/me/kyc/initiate` → `POST /api/v1/users/me/kyc/digilocker` → `POST /api/v1/users/me/kyc/video` |
| **AI** | Face matching (AWS Rekognition), liveness detection (HyperVerge), OCR for document parsing |
| **Security** | AES-256 encryption for PAN/Aadhaar, PII redaction in logs, 7-year audit trail |
| **Notifications** | Push: "KYC approved! Start your first SIP" |
| **Analytics** | KYC funnel: Initiated → DigiLocker → Aadhaar → Video → Approved → Rejected |

**Edge Cases:**
- DigiLocker not linked → Manual PAN upload + OCR
- Video KYC fails liveness → Retry with guidance ("Move closer", "Better lighting")
- CKYC already exists → Skip to broker account linking
- Minor (<18) → Guardian consent flow, guardian PAN required
- Rejected KYC → Human review queue, email with reason

**Future Improvements:**
- Aadhaar face auth (no OTP needed)
- Video KYC in vernacular languages
- Auto-KYC via college ID (partner universities)

---

### F3: Goal-Based Investment Buckets

| Field | Detail |
|-------|--------|
| **Purpose** | Visual, emotional connection to savings goals |
| **Problem Solved** | Students don't save because goals feel abstract and distant |
| **User Story** | *As a student, I want to see my "Laptop Fund" grow visually, so I stay motivated to save.* |
| **Acceptance Criteria** | <br>1. Create goal: Name, target amount, deadline, icon<br>2. Visual jar/bucket fills as contributions grow<br>3. AI suggests monthly contribution based on deadline<br>4. Auto-allocate SIP to goal<br>5. Goal completion celebration animation |
| **Dependencies** | SIP engine, fund selection algorithm, UI animation library |
| **Priority** | **Must Have** |
| **Complexity** | Medium |
| **Business Impact** | Core retention driver; 3x higher SIP retention with goal visualization |

**Implementation:**

| Layer | Detail |
|-------|--------|
| **Frontend** | React Native: Lottie animations for jar filling, haptic feedback on milestone, parallax scroll |
| **Backend** | Java/Spring Boot: Goal CRUD, contribution tracking, auto-allocation logic |
| **Database** | PostgreSQL: `goals` table with `target_amount`, `current_amount`, `deadline`, `allocation_percentage` |
| **API** | `POST /api/v1/users/me/goals` → `GET /api/v1/users/me/goals` → `PUT /api/v1/users/me/goals/{id}` |
| **AI** | Goal feasibility calculator: "At ₹500/month, you'll reach ₹24,000 by March 2027" |
| **Security** | Goal data encrypted; no PII in analytics |
| **Notifications** | Push: "50% to your Laptop Goal! 🎉" |
| **Analytics** | Goal creation rate, completion rate, avg time to goal |

**Edge Cases:**
- Goal amount < ₹100 → "Minimum goal: ₹1,000"
- Deadline < 3 months → Warn: "Short-term goals should use liquid funds"
- Multiple goals, insufficient funds → AI conflict resolver
- Goal reached early → "Congratulations! Start next goal?"
- Goal missed deadline → "Extend deadline or increase contribution?"

**Future Improvements:**
- Goal templates: "MBA Fund", "Europe Trip", "Emergency Fund"
- Goal co-funding (parent matches)
- Goal-based insurance (trip cancellation, device protection)

---

### F4: Round-Up Investing

| Field | Detail |
|-------|--------|
| **Purpose** | Convert spending friction into saving frictionlessness |
| **Problem Solved** | Students spend via UPI but never save; round-ups make saving automatic |
| **User Story** | *As a student, I want my spare change from UPI payments to be invested automatically, so I save without thinking.* |
| **Acceptance Criteria** | <br>1. Link UPI app (PhonePe/GPay/Paytm)<br>2. Choose round-up amount: nearest ₹10/₹50/₹100<br>3. Auto-invest spare change in selected fund<br>4. Daily/weekly summary of round-ups<br>5. Pause/resume anytime |
| **Dependencies** | UPI transaction access (AA framework or SMS parsing), broker API for micro-investments |
| **Priority** | **Must Have** |
| **Complexity** | Large |
| **Business Impact** | Proven model (Jar: 10M+ users); 40% higher engagement |

**Implementation:**

| Layer | Detail |
|-------|--------|
| **Frontend** | React Native: UPI app selector, round-up toggle, transaction history with round-up badges |
| **Backend** | Java/Spring Boot: AA consent management, transaction polling, round-up calculation, batch investing |
| **Database** | PostgreSQL: `round_up_settings`, `round_up_transactions` (TimescaleDB hypertable) |
| **API** | `POST /api/v1/round-ups/enable` → `GET /api/v1/round-ups/transactions` → `POST /api/v1/round-ups/pause` |
| **AI** | Smart round-up: "You spent ₹47 on chai. Round to ₹50 = ₹3 invested." |
| **Security** | AA consent encrypted, transaction data anonymized after 90 days |
| **Notifications** | Daily: "You saved ₹23 today via round-ups!" |
| **Analytics** | Avg round-up per user, round-up frequency, correlation with spending |

**Edge Cases:**
- UPI transaction < ₹10 → Skip (minimum round-up ₹1)
- Insufficient balance for round-up → Queue, retry next day
- User disables UPI access → Graceful degradation to manual entry
- Multiple UPI apps → Merge transactions, deduplicate
- Refund received → Reverse round-up or keep as bonus

**Future Improvements:**
- Merchant-specific round-ups ("Round up all Swiggy orders")
- Round-up multiplier ("2x round-ups during exam season")
- Round-up challenges ("₹100 round-up streak")

---

### F5: Daily Micro-SIP

| Field | Detail |
|-------|--------|
| **Purpose** | Match student cash flow (daily/weekly allowances) vs. monthly salary cycles |
| **Problem Solved** | Monthly SIPs don't align with student income patterns (weekly pocket money) |
| **User Story** | *As a student who gets weekly pocket money, I want to invest ₹25 every day, so it feels manageable.* |
| **Acceptance Criteria** | <br>1. SIP frequency: Daily / Weekly / Bi-weekly / Monthly / Quarterly<br>2. Minimum: ₹10 (daily), ₹100 (weekly)<br>3. Auto-debit via UPI Autopay<br>4. Pause with 1 tap, resume anytime<br>5. SIP streak counter |
| **Dependencies** | UPI Autopay integration, broker SIP API, mandate management |
| **Priority** | **Must Have** |
| **Complexity** | Medium |
| **Business Impact** | Core revenue driver; daily SIPs = 30x more engagement than monthly |

**Implementation:**

| Layer | Detail |
|-------|--------|
| **Frontend** | React Native: SIP creation wizard, calendar view, streak animation, pause/resume toggle |
| **Backend** | Java/Spring Boot: SIP scheduler (Quartz), UPI mandate creation, execution engine |
| **Database** | PostgreSQL: `sip_schedules` table with `frequency`, `execution_day`, `next_execution_date` |
| **API** | `POST /api/v1/sip-schedules` → `PUT /api/v1/sip-schedules/{id}` → `POST /api/v1/sip-schedules/{id}/pause` |
| **AI** | Flexi-SIP: AI adjusts amount based on safe-to-save calculation |
| **Security** | UPI PIN never stored; mandate token encrypted |
| **Notifications** | Pre-debit: "₹25 SIP tomorrow"; Post-debit: "SIP executed ✅"; Missed: "SIP missed. Resume?" |
| **Analytics** | SIP creation rate, pause rate, resume rate, streak distribution |

**Edge Cases:**
- Insufficient balance → Retry next day (max 3 retries), then skip
- UPI Autopay limit exceeded → Alert user to increase limit
- Fund NAV not available (holiday) → Execute next business day
- User pauses >3 times → AI nudge: "Need help adjusting amount?"
- SIP amount > monthly income → Block with warning

**Future Improvements:**
- Auto-step up: Increase by 10% every semester
- Festive bonus SIP: Auto-invest Diwali cash gifts
- Peer challenge: "Match your friend's SIP for 30 days"

---

### F6: InvestIQ Academy (Learn & Earn)

| Field | Detail |
|-------|--------|
| **Purpose** | Turn financial education into an engaging, rewarding experience |
| **Problem Solved** | Financial literacy is boring; students abandon traditional learning |
| **User Story** | *As a student, I want to learn about investing in 2-minute videos, so I can understand without getting bored.* |
| **Acceptance Criteria** | <br>1. Bite-sized lessons: 2-min video + interactive quiz<br>2. SEBI-aligned curriculum<br>3. Learn & Earn: Complete lesson → Earn coins → Redeem for MF investment<br>4. Progress tracking with levels<br>5. Spaced repetition for weak concepts |
| **Dependencies** | Video CDN, quiz engine, coin economy, MF redemption API |
| **Priority** | **Must Have** |
| **Complexity** | Large |
| **Business Impact** | Differentiator; reduces F&O temptation; increases retention 2x |

**Implementation:**

| Layer | Detail |
|-------|--------|
| **Frontend** | React Native: Video player (Expo AV), quiz UI, coin animation, progress rings |
| **Backend** | Java/Spring Boot: Lesson management, quiz scoring, coin ledger, redemption |
| **Database** | MongoDB: `learning_content` (flexible schema for videos, quizzes, articles); PostgreSQL: `user_progress`, `coin_ledger` |
| **API** | `GET /api/v1/learning/modules` → `POST /api/v1/learning/lessons/{id}/complete` → `POST /api/v1/learning/coins/redeem` |
| **AI** | Personalized learning path: "You struggled with compounding. Here's a simpler explanation." |
| **Security** | Quiz answers encrypted; coin economy audited for fraud |
| **Notifications** | "New lesson: Understanding NAV. Earn 50 coins!" |
| **Analytics** | Lesson completion rate, quiz scores, coin redemption rate, learning → investing correlation |

**Edge Cases:**
- Video fails to load → Audio-only fallback, transcript display
- Quiz retake → Allow 3 attempts, show explanation after wrong answer
- Coin farming → Rate limiting, device fingerprinting, manual review
- Lesson too easy → Skip option after pre-quiz
- Offline mode → Download lessons for commute

**Future Improvements:**
- Live workshops with SEBI-registered advisors
- Peer teaching: "Explain this concept to earn bonus coins"
- Certification: "InvestIQ Certified Beginner" badge for LinkedIn
- AR/VR lessons: "Walk through a stock exchange"

---

### F7: AI Financial Coach (RAG-Based)

| Field | Detail |
|-------|--------|
| **Purpose** | Provide personalized, accurate, SEBI-compliant financial guidance |
| **Problem Solved** | Students get wrong advice from Finfluencers; generic apps don't answer specific questions |
| **User Story** | *As a student, I want to ask "Should I invest in ELSS for tax saving?" and get a cited, accurate answer.* |
| **Acceptance Criteria** | <br>1. Natural language chat (text + voice)<br>2. Every answer cites SEBI/AMFI/RBI source<br>3. No stock tips, no F&O advice, no price predictions<br>4. Personalized based on risk profile, goals, portfolio<br>5. Hindi + English support |
| **Dependencies** | LLM API (OpenAI/Claude), vector DB (pgvector/Pinecone), RAG pipeline, SEBI document corpus |
| **Priority** | **Must Have** |
| **Complexity** | Extra Large |
| **Business Impact** | Core differentiator; reduces support tickets; builds trust |

**Implementation:**

| Layer | Detail |
|-------|--------|
| **Frontend** | React Native: Chat UI (Gifted Chat), voice input (Whisper), typing indicator, citation cards |
| **Backend** | Python/FastAPI: RAG pipeline, intent classification, context assembly, response generation |
| **Database** | PostgreSQL + pgvector: `ai_chat_sessions`, `ai_messages`, `knowledge_base_embeddings` |
| **API** | `POST /api/v1/ai/chat` (SSE streaming) → `GET /api/v1/ai/chat/sessions` → `POST /api/v1/ai/chat/sessions/{id}/feedback` |
| **AI** | RAG: Retrieve from SEBI docs → Re-rank → Generate with GPT-4o/Claude 3.5 → Inject citations → Fact-check |
| **Security** | PII redaction before LLM, guardrails (NeMo/Lakera), audit log of every interaction |
| **Notifications** | "Your AI coach has a new insight about your portfolio" |
| **Analytics** | Chat sessions/user, satisfaction rating, escalation rate, response latency |

**Edge Cases:**
- Question outside knowledge base → "I don't have enough information. Let me connect you with a human advisor."
- User asks for stock tip → Guardrail triggers: "I can't recommend specific stocks. Would you like to learn about diversification?"
- LLM hallucination → Secondary LLM evaluation; faithfulness score <0.9 → human review
- Voice not understood → Text fallback, suggest rephrasing
- High latency → Show "Thinking..." with progress dots; cache common answers

**Future Improvements:**
- Multi-turn reasoning: "If I increase SIP by ₹500, how does it affect my Europe trip goal?"
- Proactive coaching: "I noticed you spent ₹2K on gaming. Want to divert ₹200 to your laptop goal?"
- Voice assistant: "Hey InvestIQ, kitna bacha sakta hoon?"
- Document upload: "Here's my fee receipt. Can I claim tax benefit?"

---

### F8: Spend Tracker & Budget Enforcer

| Field | Detail |
|-------|--------|
| **Purpose** | Make students aware of spending patterns and nudge toward saving |
| **Problem Solved** | Students don't know where money goes; no budgeting tool designed for college life |
| **User Story** | *As a student, I want to see that I spent ₹4,200 on Zomato this month, so I can cut back.* |
| **Acceptance Criteria** | <br>1. Auto-categorize UPI transactions (food, travel, entertainment, books)<br>2. 50/30/20 budget visualization<br>3. Merchant-level insights<br>4. Subscription tracker (Netflix, Spotify, gym)<br>5. Spending forecast for month-end |
| **Dependencies** | AA framework for transaction fetch, categorization ML model |
| **Priority** | **Must Have** |
| **Complexity** | Medium |
| **Business Impact** | Engagement driver; data for AI nudges; retention tool |

**Implementation:**

| Layer | Detail |
|-------|--------|
| **Frontend** | React Native: Pie charts (Victory Native), spending timeline, category drill-down, budget rings |
| **Backend** | Python/FastAPI: Transaction ingestion, categorization ML, forecasting |
| **Database** | PostgreSQL + TimescaleDB: `transactions` hypertable, `spending_categories` |
| **API** | `GET /api/v1/users/me/spending/summary` → `GET /api/v1/users/me/spending/categories` → `GET /api/v1/users/me/spending/forecast` |
| **AI** | Categorization: XGBoost on merchant name + amount + time; Forecast: Prophet LSTM |
| **Security** | Transaction data encrypted; no merchant data shared with third parties |
| **Notifications** | "You spent ₹800 on Swiggy this week. Skip one order = ₹50 to your laptop goal!" |
| **Analytics** | Avg categories, budget adherence, forecast accuracy |

**Edge Cases:**
- Unknown merchant → "Uncategorized" → User can tag → ML learns
- Cash transaction → Manual entry with photo receipt
- Shared expense (roommate dinner) → Split feature
- Refund → Negative transaction, adjust category total
- Budget exceeded → Gentle nudge (not alarm): "You're 90% through your food budget"

**Future Improvements:**
- Bill split integration (hostel/PG expenses)
- Cash flow calendar (expected inflows/outflows)
- "No-spend weekend" challenge with community

---

### F9: Paper Trading Simulator

| Field | Detail |
|-------|--------|
| **Purpose** | Let students learn investing without risking real money |
| **Problem Solved** | Fear of losing money prevents first investment; F&O simulators on other platforms encourage gambling |
| **User Story** | *As a student, I want to practice investing with virtual money, so I can learn before risking my savings.* |
| **Acceptance Criteria** | <br>1. ₹10 lakh virtual portfolio<br>2. Real market prices (15-min delay)<br>3. Buy/sell stocks, MFs, ETFs<br>4. Portfolio performance tracking<br>5. College leaderboard (anonymized)<br>6. No F&O, no leverage, no margin |
| **Dependencies** | Market data feed (NSE/BSE), virtual ledger, leaderboard engine |
| **Priority** | **Must Have** |
| **Complexity** | Medium |
| **Business Impact** | Education tool; viral college competitions; safe outlet for trading curiosity |

**Implementation:**

| Layer | Detail |
|-------|--------|
| **Frontend** | React Native: Portfolio chart, order placement UI, leaderboard, performance analytics |
| **Backend** | Java/Spring Boot: Virtual order matching, portfolio valuation, leaderboard calculation |
| **Database** | PostgreSQL: `virtual_portfolios`, `virtual_orders`, `virtual_holdings` |
| **API** | `POST /api/v1/paper-trading/orders` → `GET /api/v1/paper-trading/portfolio` → `GET /api/v1/paper-trading/leaderboard` |
| **AI** | N/A |
| **Security** | Virtual/real portfolios strictly separated; no real money access from paper trading |
| **Notifications** | "Your virtual portfolio is up 5%! Ready to invest real money?" |
| **Analytics** | Paper → real conversion rate, avg virtual portfolio value, competition participation |

**Edge Cases:**
- Market holiday → Prices frozen, orders queued
- Corporate action (dividend, split) → Auto-adjust virtual holdings
- User resets portfolio → Allow once per month
- Leaderboard gaming → Device fingerprinting, manual review

**Future Improvements:**
- Inter-college competitions with prizes (MF credits, not cash)
- "What if" scenarios: "What if I invested ₹10K in Nifty 50 in 2020?"
- AI coach reviews virtual portfolio: "You're 80% in one stock. Let's learn diversification."

---

### F10: Community & Campus Network

| Field | Detail |
|-------|--------|
| **Purpose** | Build peer learning and accountability through community |
| **Problem Solved** | Students feel isolated in financial decisions; Telegram groups promote risky tips |
| **User Story** | *As a student, I want to see my college's savings leaderboard, so I feel motivated to save more.* |
| **Acceptance Criteria** | <br>1. College-wise private groups<br>2. Anonymous savings streak leaderboards<br>3. Goal sharing (optional, privacy-controlled)<br>4. Moderated Q&A (no stock tips)<br>5. Campus ambassador program management |
| **Dependencies** | Chat infrastructure (Stream/Twilio), moderation AI, ambassador dashboard |
| **Priority** | **Should Have** |
| **Complexity** | Large |
| **Business Impact** | Viral growth; 30% of signups from referrals; engagement multiplier |

**Implementation:**

| Layer | Detail |
|-------|--------|
| **Frontend** | React Native: Group chat (Stream Chat SDK), leaderboard, ambassador profile |
| **Backend** | Java/Spring Boot: Group management, message moderation, ambassador tracking |
| **Database** | MongoDB: `community_posts`, `community_groups`; PostgreSQL: `leaderboards`, `ambassadors` |
| **API** | `POST /api/v1/community/groups/{id}/messages` → `GET /api/v1/community/leaderboard` → `POST /api/v1/community/ambassadors/apply` |
| **AI** | Content moderation: Detect stock tips, F&O promotion, spam; Auto-flag for human review |
| **Security** | End-to-end encryption for DMs; group messages encrypted at rest |
| **Notifications** | "You ranked #3 in savings streak at Delhi University!" |
| **Analytics** | Messages/user, group activity, ambassador conversion, referral rate |

**Edge Cases:**
- Stock tip in chat → AI detects → Auto-delete + warn user + human review
- Harassment → Report button → 24-hour moderation → Ban if confirmed
- College not in database → "Suggest your college" → Manual addition
- Ambassador fraud (fake accounts) → Device fingerprinting, referral validation

**Future Improvements:**
- Alumni mentorship matching
- Investment clubs (learning groups, not pooled money)
- Campus events: "Finance Fest" integration

---

## 6.2 AI Features (Advanced)

### F11: Behavioral Nudge Engine

| Field | Detail |
|-------|--------|
| **Purpose** | Use behavioral economics to encourage saving and discourage impulsive spending |
| **Problem Solved** | Willpower is finite; students need automated help to stick to goals |
| **User Story** | *As a student, I want gentle reminders when I'm overspending, so I don't blow my budget.* |
| **Acceptance Criteria** | <br>1. Trigger genome: 27 risk signals (time, velocity, volatility, sleep)<br>2. Nudge types: Impulse control, commitment devices, social proof, loss aversion<br>3. Personalized based on persona cluster<br>4. No nudges during market hours or after 9PM<br>5. User can customize nudge frequency |
| **Dependencies** | Spend tracker, persona classifier, notification system |
| **Priority** | **Should Have** |
| **Complexity** | Large |
| **Business Impact** | 25% improvement in savings rate; reduces churn |

**Implementation:**

| Layer | Detail |
|-------|--------|
| **Frontend** | React Native: Nudge card UI, preference settings, nudge history |
| **Backend** | Python/FastAPI: Trigger evaluation, nudge generation, A/B testing framework |
| **Database** | PostgreSQL: `nudges`, `nudge_preferences`, `nudge_outcomes` |
| **API** | `GET /api/v1/nudges` → `PUT /api/v1/nudges/preferences` → `POST /api/v1/nudges/{id}/feedback` |
| **AI** | Persona clustering (K-means), nudge effectiveness prediction (XGBoost), optimal timing (bandit algorithm) |
| **Security** | Nudge data anonymized for analytics; no PII in ML training |
| **Notifications** | Push: Context-aware, time-optimized nudges |
| **Analytics** | Nudge open rate, action rate, opt-out rate, A/B test results |

**Edge Cases:**
- User disables all nudges → Respect immediately; offer weekly digest instead
- Nudge misfires (user didn't overspend) → "Was this helpful?" feedback → ML learns
- Multiple nudges same day → Priority queue, max 3/day
- Exam period → Auto-pause all nudges (detect from academic calendar)

**Future Improvements:**
- Predictive nudges: "Based on your pattern, you might overspend this weekend."
- Gamified nudges: "Beat your friend's savings streak!"
- Parent nudges: "Rohan's food budget is at 90%."

---

### F12: Portfolio Health Score

| Field | Detail |
|-------|--------|
| **Purpose** | Give users a single, actionable metric for portfolio quality |
| **Problem Solved** | Students don't understand if their portfolio is good or bad |
| **User Story** | *As a student, I want to know if my portfolio is healthy, so I can make adjustments.* |
| **Acceptance Criteria** | <br>1. 0-100 score based on: diversification, risk alignment, goal progress, fees, tax efficiency<br>2. Breakdown: Asset allocation, sector concentration, fund overlap<br>3. Actionable recommendations: "Reduce overlap between Fund A and Fund B"<br>4. Trend over time<br>5. Peer benchmark: "You're in top 20% of student investors" |
| **Dependencies** | Portfolio data, fund analytics, risk model |
| **Priority** | **Should Have** |
| **Complexity** | Medium |
| **Business Impact** | Engagement; reduces analysis paralysis; drives Plus subscription |

**Implementation:**

| Layer | Detail |
|-------|--------|
| **Frontend** | React Native: Circular progress indicator, radar chart, recommendation cards |
| **Backend** | Python/FastAPI: Portfolio analysis engine, correlation calculation, overlap detection |
| **Database** | PostgreSQL: `portfolio_health_scores` (cached, recalculated daily) |
| **API** | `GET /api/v1/portfolios/me/health-score` → `GET /api/v1/portfolios/me/recommendations` |
| **AI** | Multi-factor scoring model; fund overlap detection (Jaccard similarity); risk-adjusted return calculation |
| **Security** | Score data encrypted; no individual portfolio details in aggregate analytics |
| **Notifications** | "Your portfolio health improved to 78! 🎉" |
| **Analytics** | Avg health score, improvement rate, recommendation follow-through |

---

## 6.3 Feature Prioritization Summary

### MoSCoW Matrix

| Must Have | Should Have | Could Have | Won't Have (V3+) |
|-----------|-------------|------------|------------------|
| F1: 30-Second Onboarding | F10: Community | F13: Parent Dashboard | F20: US Stocks |
| F2: Progressive KYC | F11: Nudge Engine | F14: Tax Filing | F21: P2P Lending |
| F3: Goal Buckets | F12: Health Score | F15: Scholarship Finder | F22: Crypto |
| F4: Round-Up Investing | F16: Voice Assistant | F17: Wearable App | F23: Credit Card |
| F5: Daily Micro-SIP | F18: Advanced Analytics | F19: AR Visualization | F24: Forex |
| F6: Academy | | | |
| F7: AI Coach | | | |
| F8: Spend Tracker | | | |
| F9: Paper Trading | | | |

### RICE Scoring (Top 10)

| Feature | Reach | Impact | Confidence | Effort | RICE |
|---------|-------|--------|------------|--------|------|
| F4: Round-Ups | 10 | 9 | 9 | 6 | **135** |
| F3: Goal Buckets | 9 | 9 | 9 | 5 | **162** |
| F8: Spend Tracker | 9 | 7 | 9 | 5 | **113** |
| F6: Academy | 8 | 7 | 7 | 4 | **98** |
| F7: AI Coach | 8 | 10 | 8 | 8 | **80** |
| F5: Micro-SIP | 7 | 8 | 8 | 6 | **75** |
| F11: Nudge Engine | 7 | 8 | 7 | 5 | **78** |
| F9: Paper Trading | 6 | 8 | 9 | 5 | **86** |
| F2: KYC | 10 | 10 | 9 | 8 | **125** |
| F1: Onboarding | 10 | 8 | 9 | 3 | **240** |

---

## References

1. InvestIQ Internal Feature Brainstorm (Jun 2026)
2. Y Combinator — How to Prioritize Features
3. Intercom — RICE Scoring Framework
4. Marty Cagan — Inspired (Product Management)
5. Nir Eyal — Hooked (Behavioral Design)
6. Daniel Kahneman — Thinking, Fast and Slow (Behavioral Economics)
