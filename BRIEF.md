# AI Deal Scanner — Product Brief

**Date:** 2026-03-13  
**Epic:** Kanban #62  
**First Customer:** Alex Kouba (non-technical business broker)  
**Builder:** Forge (coder agent)

---

## The Problem

Business brokers like Alex spend **10+ hours per week** manually scrolling through Reddit, LinkedIn, Twitter looking for business sale signals.

**Pain points:**
- Manual search is time-consuming and inconsistent
- Miss leads because they can't monitor 24/7
- Hard to qualify: is "I'm tired of my business" a real lead or just venting?
- No organized system — leads get lost in browser tabs and notes

**Validation:**
- Alex confirmed this is a real problem affecting his deal flow
- Similar products exist for real estate (Reonomy) and sales (Clay.com) but nothing specific to business brokers
- Brokers typically charge 10-12% commission on deals ($500k sale = $50k commission), so high ROI for better lead gen

---

## The Solution

**AI Deal Scanner** — Automated lead generation SaaS for business brokers.

**What it does:**
1. **Monitors Reddit** for business sale signals (keywords: "tired of", "selling business", "want out")
2. **AI qualification** — GPT-4o-mini scores each lead (1-10), extracts business type, location, urgency
3. **CRM dashboard** — Brokers see qualified leads ranked by score, with AI-generated outreach drafts
4. **Self-serve setup** — Non-technical users can configure subreddits, keywords, and API keys

**Why it's better than manual search:**
- Never miss a lead (24/7 monitoring)
- AI filters out noise (score 8+ = serious intent)
- Organized in one place (no more browser tabs)
- Outreach drafts save time (AI personalizes each message)

---

## Target Market

**Primary:** Business brokers (100k+ in US alone)  
**Secondary:** M&A advisors, deal sourcers, acquisition entrepreneurs

**Pricing hypothesis:**
- **Free tier:** 10 leads/week, Reddit only
- **Pro ($49/month):** Unlimited leads, multi-platform (Twitter, LinkedIn), priority support
- **Enterprise ($199/month):** Team accounts, custom keywords, webhook integrations

---

## MVP Scope (What You're Building)

### Core Features (Must Have)

#### 1. Reddit Scanner (Task #64 ✓)
- Monitor configurable subreddits (default: r/smallbusiness, r/Entrepreneur)
- Keyword detection: "tired of", "selling business", "want out", "looking to exit", etc.
- Uses Arctic Shift API (no Reddit API key needed for MVP)
- Runs every 6 hours via cron job
- Deduplicates (don't scan same post twice)
- Filters by date (last 7 days)

**Implementation notes:**
- Script already built: `src/scanner/reddit-scanner.js`
- Tested and working with Arctic Shift API
- Extracts: title, content, author, subreddit, URL, timestamp, upvotes

#### 2. AI Qualification Engine (Task #65 ✓)
- OpenAI GPT-4o-mini analyzes each post
- Scores intent (1-10):
  - **9-10:** Actively selling NOW
  - **7-8:** Serious intent, specific timeline
  - **5-6:** Considering/frustrated
  - **1-4:** Just venting
- Extracts:
  - Business type (e-commerce, SaaS, restaurant, etc.)
  - Location (city/state if mentioned)
  - Urgency (immediate, soon, exploring, none)
  - Reasoning (2-3 sentence explanation)
  - Outreach message draft (personalized DM)
- Tags: hot (8-10), warm (5-7), cold (1-4)

**Implementation notes:**
- Script already built: `src/scanner/ai-qualifier.js`
- Uses conservative scoring (most leads = 4-6)
- Cost per lead: ~$0.005 (500 tokens × $0.15/1M)

#### 3. Supabase Backend (Task #66)
- **Database:** PostgreSQL with Row Level Security (RLS)
- **Tables:**
  - `users` — broker accounts (id, email, created_at)
  - `scan_configs` — per-user settings (subreddits, keywords, enabled)
  - `leads` — all scraped + qualified leads
- **Auth:** Supabase Auth (email/password, magic link optional)
- **RLS Policies:** Each user sees only their own leads and configs

**Schema:**
```sql
-- Users (managed by Supabase Auth)
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Scan configurations
CREATE TABLE scan_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  subreddits TEXT[] DEFAULT ARRAY['smallbusiness', 'Entrepreneur'],
  keywords TEXT[] DEFAULT ARRAY['tired of', 'selling business', 'want out', 'looking to exit'],
  enabled BOOLEAN DEFAULT true,
  scan_interval_hours INTEGER DEFAULT 6,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE scan_configs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage their own configs"
  ON scan_configs FOR ALL
  USING (auth.uid() = user_id);

-- Leads
CREATE TABLE leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  
  -- Source data
  source TEXT NOT NULL DEFAULT 'reddit',
  source_id TEXT NOT NULL, -- Reddit post ID (unique per user)
  author TEXT,
  title TEXT NOT NULL,
  content TEXT,
  url TEXT,
  subreddit TEXT,
  posted_at TIMESTAMPTZ,
  matched_keyword TEXT,
  
  -- AI analysis
  intent_score INTEGER,
  ai_tag TEXT, -- 'hot', 'warm', 'cold', 'error'
  business_type TEXT,
  location TEXT,
  urgency TEXT,
  reasoning TEXT,
  outreach_message TEXT,
  
  -- CRM fields
  status TEXT DEFAULT 'new', -- 'new', 'contacted', 'interested', 'not_interested', 'closed'
  notes TEXT,
  contacted_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(user_id, source_id) -- Prevent duplicate leads per user
);

ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see only their own leads"
  ON leads FOR ALL
  USING (auth.uid() = user_id);

-- Indexes for performance
CREATE INDEX idx_leads_user_id ON leads(user_id);
CREATE INDEX idx_leads_status ON leads(status);
CREATE INDEX idx_leads_score ON leads(intent_score DESC NULLS LAST);
CREATE INDEX idx_leads_created ON leads(created_at DESC);
CREATE INDEX idx_leads_tag ON leads(ai_tag);
```

#### 4. React Dashboard (Task #67)
Modern, clean UI built with React + Vite + Tailwind CSS.

**Pages:**

**A. Login/Signup (`/login`)**
- Email + password auth via Supabase
- "Sign up" link for new users
- Magic link option (email-only login)
- Redirect to dashboard after login

**B. Dashboard (`/dashboard`)**
- **Header:** Logo, user email, logout button
- **Stats cards:**
  - Total leads (this week)
  - Hot leads (score 8+)
  - Warm leads (score 5-7)
  - Contacted (status = contacted)
- **Lead list (table):**
  - Columns: Score, Title, Business Type, Location, Date, Status, Actions
  - Sortable by score (default), date
  - Filterable by:
    - Tag (hot/warm/cold/all)
    - Status (new/contacted/interested/not_interested/closed/all)
    - Date range (last 7 days / 30 days / all)
  - Search bar (filters by title or content)
  - Pagination (20 leads per page)
  - Click row → go to lead detail page
- **"Trigger Scan" button** (calls backend `/api/scan` endpoint for manual testing)

**C. Lead Detail (`/leads/:id`)**
- **Lead info:**
  - Score badge (color-coded: red=hot, yellow=warm, blue=cold)
  - Title, author, subreddit, posted date
  - Full post content
  - Link to original Reddit post (opens in new tab)
- **AI Analysis:**
  - Business type, location, urgency
  - Reasoning (why this score?)
  - Outreach draft (copy button)
- **CRM Actions:**
  - Status dropdown (new → contacted → interested → not_interested → closed)
  - Notes textarea (save button)
  - "Mark as Contacted" button (sets status + timestamp)
- **Back to Dashboard** button

**D. Settings (`/settings`)**
- **Scan Configuration:**
  - Subreddit list (comma-separated text input, e.g., "smallbusiness, Entrepreneur, SaaS")
  - Keyword list (comma-separated, e.g., "tired of, selling business, want out")
  - Scan interval dropdown (6 hours / 12 hours / 24 hours)
  - Enable/disable scanning toggle
  - "Save Settings" button
- **Account:**
  - Email (read-only)
  - Change password button
  - Delete account button (with confirmation)

**Design:**
- Clean, professional (think Linear or Notion vibes)
- Tailwind CSS (no custom CSS)
- Responsive (works on tablet/mobile)
- Dark mode optional (nice to have, not required)

#### 5. Backend Scanner Service (Render)
Node.js Express app deployed to Render.com.

**Endpoints:**
- `GET /health` — Health check (returns `{ status: 'ok' }`)
- `POST /api/scan` — Trigger manual scan
  - Requires API key header: `X-API-Key: <render_api_key>`
  - Starts scan job in background
  - Returns `{ job_id: '...', status: 'started' }`

**Background Job (Cron):**
- Runs every 6 hours (configurable per user's scan_configs)
- Fetches all users with `enabled: true` scan configs
- For each user:
  1. Run Reddit scanner (fetch posts from their subreddits + keywords)
  2. Filter out posts already in `leads` table (by `source_id`)
  3. Save new raw leads to Supabase
  4. Run AI qualification on new leads
  5. Update leads with AI analysis results
- Logs everything to stdout (visible in Render dashboard)

**Environment Variables:**
- `SUPABASE_URL`
- `SUPABASE_SERVICE_KEY` (bypasses RLS, needed for cron job)
- `OPENAI_API_KEY`
- `RENDER_API_KEY` (for manual scan endpoint auth)

---

### Deferred to v2 (Not in MVP)
- ❌ Telegram bot (#68) — Alex will use web dashboard for now
- ❌ Twitter/LinkedIn scanning — Reddit is enough to validate
- ❌ Email outreach integration — manual copy-paste for MVP
- ❌ Zapier/webhook integrations
- ❌ Team accounts / multi-user workspaces
- ❌ Analytics dashboard (charts, trends)
- ❌ Chrome extension for lead capture

---

## Tech Stack

**Frontend:**
- React 18 + Vite
- React Router v6
- Tailwind CSS + Headless UI
- Supabase JS client
- Deploy: Vercel

**Backend:**
- Node.js 22 + Express
- node-cron (scheduler)
- Supabase JS client
- OpenAI SDK
- Deploy: Render.com (web service + cron)

**Database:**
- Supabase (PostgreSQL + Auth + RLS)

**APIs:**
- Arctic Shift (Reddit proxy, no API key needed)
- OpenAI (GPT-4o-mini)

---

## File Structure

```
projects/2026-03-13-ai-deal-scanner/
├── BRIEF.md                    # This file
├── ARCHITECTURE.md             # System design (already written)
├── README.md                   # Setup guide for Alex
├── .env.example                # Template for environment variables
│
├── src/
│   ├── scanner/                # Backend scanner service (Render)
│   │   ├── package.json
│   │   ├── reddit-scanner.js   # ✓ Already built
│   │   ├── ai-qualifier.js     # ✓ Already built
│   │   ├── index.js            # Express server
│   │   ├── cron.js             # Background scanner job
│   │   └── db.js               # Supabase client setup
│   │
│   └── frontend/               # React dashboard (Vercel)
│       ├── package.json
│       ├── vite.config.js
│       ├── index.html
│       ├── src/
│       │   ├── main.jsx
│       │   ├── App.jsx
│       │   ├── lib/
│       │   │   └── supabase.js  # Supabase client
│       │   ├── pages/
│       │   │   ├── Login.jsx
│       │   │   ├── Dashboard.jsx
│       │   │   ├── LeadDetail.jsx
│       │   │   └── Settings.jsx
│       │   └── components/
│       │       ├── LeadList.jsx
│       │       ├── LeadCard.jsx
│       │       ├── StatsCard.jsx
│       │       └── Header.jsx
│       └── tailwind.config.js
│
└── supabase/
    └── schema.sql              # Database schema (copy-paste to Supabase SQL editor)
```

---

## Setup Instructions (for Alex)

**Step 1: Create Supabase Project**
1. Go to https://supabase.com/dashboard
2. Create new project: "ai-deal-scanner"
3. Copy Project URL and anon (public) key
4. Go to SQL Editor, paste schema from `supabase/schema.sql`, run it
5. Go to Authentication → Providers, enable Email (already enabled by default)
6. Copy service_role key (Settings → API → service_role key) — keep secret!

**Step 2: Get OpenAI API Key**
1. Go to https://platform.openai.com/api-keys
2. Create new API key
3. Copy it (starts with `sk-...`)

**Step 3: Deploy Backend to Render**
1. Push code to GitHub: `github.com/aparajithn/ai-deal-scanner`
2. Go to https://render.com/dashboard
3. New → Web Service
4. Connect GitHub repo: `ai-deal-scanner`
5. Settings:
   - Name: `ai-deal-scanner-backend`
   - Root Directory: `src/scanner`
   - Build Command: `npm install`
   - Start Command: `node index.js`
   - Environment Variables:
     - `SUPABASE_URL`: (from Step 1)
     - `SUPABASE_SERVICE_KEY`: (from Step 1)
     - `OPENAI_API_KEY`: (from Step 2)
     - `RENDER_API_KEY`: (generate random string, e.g., `openssl rand -hex 32`)
6. Create Service
7. Add Cron Job:
   - Go to service → Settings → Cron Jobs
   - Command: `node cron.js`
   - Schedule: `0 */6 * * *` (every 6 hours)

**Step 4: Deploy Frontend to Vercel**
1. Go to https://vercel.com/dashboard
2. New Project → Import Git Repository
3. Select `ai-deal-scanner` repo
4. Settings:
   - Root Directory: `src/frontend`
   - Framework Preset: Vite
   - Environment Variables:
     - `VITE_SUPABASE_URL`: (from Step 1)
     - `VITE_SUPABASE_ANON_KEY`: (from Step 1)
5. Deploy
6. Copy live URL (e.g., `ai-deal-scanner.vercel.app`)

**Step 5: Create Your Account**
1. Go to your Vercel URL
2. Click "Sign up"
3. Enter email + password
4. Login
5. Go to Settings, configure subreddits and keywords
6. Wait for first scan (or trigger manually with "Trigger Scan" button)

---

## Success Metrics

**Technical:**
- [ ] Scanner runs without errors (check Render logs)
- [ ] AI qualification completes in <5s per lead
- [ ] Dashboard loads in <2s
- [ ] RLS policies prevent data leaks (test with 2 accounts)
- [ ] Zero API key leaks in frontend (check browser network tab)

**Business (Alex validation):**
- [ ] Finds at least 10 warm+ leads per week from r/smallbusiness
- [ ] AI score accuracy >70% (Alex manually reviews a sample of 20 leads)
- [ ] Outreach drafts are usable (Alex edits <50% of them)
- [ ] Alex can set up his own account without hand-holding
- [ ] Alex refers at least 1 other broker within first month

---

## Cost Estimate

**MVP (1 user, 100 new leads/week):**
- Supabase: Free tier (500MB, 2GB bandwidth)
- Vercel: Free tier (100GB bandwidth)
- Render: Free tier (sleeps after 15min inactivity, cron wakes it)
- OpenAI: ~$0.50/month (100 leads × 500 tokens × 2 calls × $0.15/1M tokens)

**Total:** ~$0.50/month

**Scale (10 users, 1000 new leads/week):**
- Supabase: $25/month (Pro plan)
- Vercel: Free tier (still within limits)
- Render: $7/month (Starter plan for always-on)
- OpenAI: ~$5/month (1000 leads)

**Total:** ~$37/month (~$3.70/user)

**Unit economics (at $49/month pricing):**
- Cost per user: $3.70
- Revenue per user: $49
- Margin: $45.30 (92%)

---

## Known Limitations & Future Improvements

**Limitations:**
- Reddit only (Twitter/LinkedIn in v2)
- No email automation (manual copy-paste for now)
- No team collaboration (single-user accounts)
- English only (no translation)
- No Chrome extension (manual dashboard login)

**v2 Features (Post-MVP):**
- Twitter/X scanning (via Apify or Playwright)
- LinkedIn scanning (via RapidAPI or Bright Data)
- Telegram bot for instant notifications
- Email warmup + automated outreach (via Lemlist or Instantly)
- Zapier integration (export leads to CRM)
- Team workspaces (shared lead pools)
- White-label option (for M&A firms)

---

## Build Checklist (For Forge)

### Backend
- [ ] Create `src/scanner/index.js` — Express server with `/health` and `/api/scan` endpoints
- [ ] Create `src/scanner/cron.js` — Background scanner job (imports reddit-scanner.js and ai-qualifier.js)
- [ ] Create `src/scanner/db.js` — Supabase client setup
- [ ] Update `package.json` with all dependencies
- [ ] Test scanner locally: `node cron.js` should find leads and save to Supabase

### Frontend
- [ ] Create Vite + React app in `src/frontend/`
- [ ] Set up Tailwind CSS
- [ ] Create `lib/supabase.js` — Supabase client
- [ ] Build Login page (email/password auth)
- [ ] Build Dashboard page (stats + lead list + filters)
- [ ] Build LeadDetail page (full lead info + AI analysis + CRM actions)
- [ ] Build Settings page (scan configs + account)
- [ ] Add routing (React Router)
- [ ] Test authentication flow end-to-end

### Database
- [ ] Create `supabase/schema.sql` with all tables + RLS policies
- [ ] Test RLS: create 2 users, verify they can't see each other's leads

### Deployment
- [ ] Push to GitHub: `aparajithn/ai-deal-scanner`
- [ ] Deploy backend to Render (web service + cron job)
- [ ] Deploy frontend to Vercel
- [ ] Test live URLs

### Documentation
- [ ] Write `README.md` with setup instructions (based on "Setup Instructions" section above)
- [ ] Create `.env.example` files for backend and frontend
- [ ] Add comments to all code

### Final QA
- [ ] Run full end-to-end test:
  1. Sign up new account
  2. Configure subreddits
  3. Trigger manual scan
  4. Verify leads appear in dashboard
  5. Open lead detail, verify AI analysis
  6. Update status, add notes
  7. Check that RLS works (create 2nd account, verify isolation)
- [ ] Check performance:
  - Dashboard loads in <2s
  - Lead detail loads in <1s
  - Manual scan completes in <2min for 50 leads
- [ ] Security check:
  - No API keys in frontend bundle (check browser sources)
  - RLS policies enforced (test with 2 users)
  - HTTPS enabled (Vercel does this automatically)

---

## Timeline

**Total: 2-3 days**

- Day 1: Backend (scanner service + database setup) — 6 hours
- Day 2: Frontend (dashboard + auth + lead list) — 8 hours
- Day 3: Deployment + testing + docs — 4 hours

---

## Handoff to Forge

**What's already done:**
- ✅ Architecture defined (ARCHITECTURE.md)
- ✅ Reddit scanner built and tested (src/scanner/reddit-scanner.js)
- ✅ AI qualification built (src/scanner/ai-qualifier.js)
- ✅ Database schema designed (in this brief)

**What Forge needs to build:**
1. Express backend (index.js, cron.js, db.js)
2. React frontend (all pages + components)
3. Supabase schema file (copy from this brief)
4. README with setup instructions
5. Deploy to Render + Vercel
6. Test end-to-end

**Output location:**
- All code goes in: `/home/node/.openclaw/workspace-maven/projects/2026-03-13-ai-deal-scanner/`
- GitHub repo: `github.com/aparajithn/ai-deal-scanner` (Forge will create + push)

---

**STATUS: Brief complete. Ready to hand off to Forge.**

**Forge:** Read this entire brief carefully. Build exactly what's specified in the MVP scope. Don't add features that are marked "Deferred to v2". Follow the file structure. When done, report build results back to Maven with deployment URLs and any issues encountered.
