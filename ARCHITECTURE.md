# AI Deal Scanner — Architecture Definition

**Epic:** Kanban #62  
**Date:** 2026-03-13  
**Status:** Architecture defined (Task #63 ✓)

---

## Product Overview

**Problem:** Business brokers spend 10+ hours/week manually searching Reddit, LinkedIn, Twitter for business sale signals. Alex Kouba (our first customer) needs automated lead generation.

**Solution:** AI-powered lead scanner that monitors social media, qualifies leads with GPT-4o-mini, and delivers them in a CRM dashboard.

**Target Users:** Business brokers, M&A advisors, deal sourcers (non-technical)

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      USER INTERFACE                         │
│  React Dashboard (Vercel) — Login, Leads, Lead Detail,     │
│  Settings, Analytics                                        │
└─────────────────────────────────────────────────────────────┘
                            ↓ Supabase Auth + API
┌─────────────────────────────────────────────────────────────┐
│                     SUPABASE BACKEND                        │
│  • PostgreSQL (leads, users, scan_configs, ai_analysis)     │
│  • Row Level Security (RLS) for multi-tenant               │
│  • Real-time subscriptions (optional for live updates)     │
└─────────────────────────────────────────────────────────────┘
                            ↑
                            │ writes leads & analysis
                            │
┌─────────────────────────────────────────────────────────────┐
│                    SCANNER SERVICE                          │
│  Node.js service (Render.com) with cron scheduler          │
│  ┌─────────────────────────────────────────────────┐       │
│  │  Reddit Scanner (Arctic Shift API)              │       │
│  │  • Monitors r/smallbusiness, r/Entrepreneur     │       │
│  │  • Keyword detection: "tired of", "selling"     │       │
│  │  • Deduplication (already scanned posts)        │       │
│  └─────────────────────────────────────────────────┘       │
│                       ↓                                     │
│  ┌─────────────────────────────────────────────────┐       │
│  │  AI Qualification Engine (OpenAI GPT-4o-mini)   │       │
│  │  • Score intent (1-10)                          │       │
│  │  • Extract: business type, location, urgency    │       │
│  │  • Generate outreach draft                      │       │
│  │  • Tag: hot/warm/cold                           │       │
│  └─────────────────────────────────────────────────┘       │
│                       ↓                                     │
│  ┌─────────────────────────────────────────────────┐       │
│  │  Write to Supabase                              │       │
│  └─────────────────────────────────────────────────┘       │
└─────────────────────────────────────────────────────────────┘
```

---

## Tech Stack

### Frontend
- **Framework:** React 18 + Vite
- **UI:** Tailwind CSS + Headless UI
- **Auth:** Supabase Auth (email/password)
- **Deploy:** Vercel (auto-deploy from GitHub)
- **Routing:** React Router v6

### Backend
- **Database:** Supabase (PostgreSQL)
- **Scanner Service:** Node.js 22 + Express
- **Deploy:** Render.com (web service + cron)
- **Scheduler:** node-cron (runs every 6 hours)

### Data Sources
- **Reddit:** Arctic Shift API (https://arctic-shift.photon-reddit.com)
  - Search posts: `/api/posts/search`
  - Search comments: `/api/comments/search`
  - No API key required (public proxy to avoid Reddit's VPS block)
  
### AI
- **Provider:** OpenAI
- **Model:** GPT-4o-mini (cost-efficient, ~$0.15 per 1M input tokens)
- **Use case:** Lead qualification, outreach draft generation

---

## Database Schema (Supabase)

### `users` table
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  -- Supabase Auth handles passwords
);
```

### `scan_configs` table
```sql
CREATE TABLE scan_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  subreddits TEXT[] DEFAULT ARRAY['smallbusiness', 'Entrepreneur'],
  keywords TEXT[] DEFAULT ARRAY['tired of', 'selling business', 'want out', 'looking to exit'],
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS Policy
ALTER TABLE scan_configs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can only see their own configs"
  ON scan_configs FOR ALL
  USING (auth.uid() = user_id);
```

### `leads` table
```sql
CREATE TABLE leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  
  -- Source data
  source TEXT NOT NULL, -- 'reddit', 'twitter', etc.
  source_id TEXT UNIQUE NOT NULL, -- Reddit post ID
  author TEXT,
  content TEXT NOT NULL,
  url TEXT,
  subreddit TEXT,
  posted_at TIMESTAMPTZ,
  
  -- AI analysis (populated after qualification)
  ai_score INTEGER, -- 1-10
  ai_tag TEXT, -- 'hot', 'warm', 'cold'
  business_type TEXT,
  location TEXT,
  urgency TEXT, -- 'immediate', 'soon', 'exploring'
  outreach_draft TEXT,
  
  -- CRM fields
  status TEXT DEFAULT 'new', -- 'new', 'contacted', 'interested', 'not_interested', 'closed'
  notes TEXT,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS Policy
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can only see their own leads"
  ON leads FOR ALL
  USING (auth.uid() = user_id);

-- Index for fast lookups
CREATE INDEX idx_leads_user_id ON leads(user_id);
CREATE INDEX idx_leads_status ON leads(status);
CREATE INDEX idx_leads_ai_score ON leads(ai_score DESC);
CREATE INDEX idx_leads_source_id ON leads(source_id); -- deduplication
```

---

## API Endpoints (Backend Service)

### Scanner Service (Render)
- `POST /api/scan` — Trigger manual scan (for testing)
- `GET /api/health` — Health check

### Frontend API (Supabase Client)
All queries go through Supabase client (RLS enforced):
- **Leads:** `supabase.from('leads').select(...)` 
- **Configs:** `supabase.from('scan_configs').select(...)`

---

## Reddit Scanner Logic

### Flow
1. **Fetch user's scan config** from Supabase (subreddits, keywords)
2. **For each subreddit:**
   - Search posts via Arctic Shift API: `/api/posts/search?subreddit={sub}&query={keyword}`
   - Filter by last 7 days (`created_utc`)
3. **Deduplication:**
   - Check if `source_id` (Reddit post ID) already exists in `leads` table
   - Skip if already processed
4. **Extract data:**
   - Content: post title + selftext
   - Author: post author (for DM outreach)
   - URL: permalink
   - Timestamp: `created_utc`
5. **Save raw lead** to Supabase (without AI analysis yet)
6. **Trigger AI qualification** for new leads

### Rate Limiting
- Arctic Shift API: No official rate limit, but be respectful
- Add 1-2 second delay between requests
- Max 100 posts per scan per subreddit

---

## AI Qualification Prompt

```
You are a lead qualification assistant for business brokers.

Analyze the following Reddit post and determine if the author is interested in selling their business.

POST:
{post_content}

AUTHOR: {author}
SUBREDDIT: {subreddit}
URL: {url}

Return a JSON object with:
{
  "intent_score": <1-10, where 10 = actively listing business for sale, 1 = no intent>,
  "business_type": "<e.g., 'e-commerce', 'restaurant', 'SaaS', 'unknown'>",
  "location": "<city/state if mentioned, else 'unknown'>",
  "urgency": "<'immediate', 'soon', 'exploring', 'none'>",
  "reasoning": "<2-3 sentence explanation>",
  "outreach_message": "<personalized DM template (2-3 sentences)>"
}

Be strict: only score 7+ if there's clear indication of wanting to sell.
```

### Tagging Logic
- **Hot** (8-10): Ready to sell, actively looking
- **Warm** (5-7): Exploring options, frustrated
- **Cold** (1-4): Mentioned selling but not serious

---

## MVP Scope (What We're Building)

### ✅ Phase 1 (This Sprint)
1. **Reddit Scanner** (#64)
   - Command-line script that scans Reddit and saves to Supabase
   - Runs locally first, then deploy to Render with cron
   
2. **AI Qualification** (#65)
   - Standalone script that processes unqualified leads
   - OpenAI API integration
   
3. **Supabase Setup** (#66)
   - Create tables with RLS
   - Set up Auth
   
4. **React Dashboard** (#67)
   - Login page
   - Lead list (filterable by score/status)
   - Lead detail page
   - Settings page (configure subreddits/keywords)

### 🚫 Deferred to v2
- Telegram bot (#68) — Alex can use web dashboard for now
- Twitter/LinkedIn scanning — Reddit first
- Email outreach integration — manual for MVP
- Analytics dashboard — basic list view is enough

---

## Deployment Plan

### Frontend (Vercel)
```bash
cd src/frontend
npm install
vercel --prod
```
- Auto-deploy on git push to `main`
- Environment variables: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`

### Backend Scanner (Render)
```bash
cd src/backend
npm install
# Deploy via Render dashboard or CLI
```
- Build command: `npm install`
- Start command: `node scanner.js`
- Add cron job via Render dashboard (every 6 hours)
- Environment variables: `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `OPENAI_API_KEY`

### Database (Supabase)
- Create project via Supabase dashboard
- Run schema migration (copy-paste SQL from this doc)
- Enable RLS policies
- Get `SUPABASE_URL` and `SUPABASE_ANON_KEY` for frontend
- Get `SUPABASE_SERVICE_KEY` for backend (bypasses RLS)

---

## Success Metrics

### Technical
- [ ] Scanner runs without errors
- [ ] AI qualification completes in <5s per lead
- [ ] Dashboard loads in <2s
- [ ] RLS policies prevent cross-user data leaks

### Business (Alex's Validation)
- [ ] Finds at least 10 warm+ leads per week from r/smallbusiness
- [ ] AI score accuracy >70% (Alex validates a sample)
- [ ] Alex can set up his own account without help
- [ ] Outreach drafts are usable (50%+ require minimal editing)

---

## Cost Estimate

### MVP (1 user, 100 leads/week)
- **Supabase:** Free tier (500MB, 2GB bandwidth)
- **Vercel:** Free tier (100GB bandwidth)
- **Render:** Free tier (web service sleeps after 15min inactivity, cron wakes it)
- **OpenAI:** ~$0.50/month (100 leads × 500 tokens × $0.15/1M tokens × 2 calls)

**Total:** ~$0.50/month (essentially free for MVP)

### Scale (10 users, 1000 leads/week)
- **Supabase:** $25/month (Pro plan for more storage)
- **Vercel:** Free tier still OK
- **Render:** $7/month (always-on web service)
- **OpenAI:** ~$5/month

**Total:** ~$37/month (~$3.70 per user)

---

## Next Steps

1. ✅ **Architecture defined** (this doc) — Task #63 DONE
2. **Build Reddit scanner script** — Task #64 (build locally first, validate Arctic Shift API)
3. **Set up Supabase** — Task #66 (create project, run schema)
4. **Build AI qualification** — Task #65 (integrate OpenAI)
5. **Build React dashboard** — Task #67 (spawn Forge for this)
6. **Deploy & test end-to-end**
7. **Write setup guide for Alex** (README.md)

---

**Status:** Architecture complete, moving to implementation (Reddit scanner next).
