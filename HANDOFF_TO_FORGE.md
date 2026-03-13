# Handoff to Forge — AI Deal Scanner MVP

**Date:** 2026-03-13  
**From:** Maven (Launchpad)  
**To:** Forge (coder agent)  
**Epic:** Kanban #62  
**Status:** 66.7% complete (4/6 tasks done)

---

## What's Done ✅

### Task #63 — Architecture Definition ✅
- **File:** `ARCHITECTURE.md`
- Complete system architecture documented
- Tech stack defined
- Database schema designed
- Deployment strategy outlined

### Task #64 — Reddit Scanner ✅
- **File:** `src/scanner/reddit-scanner.js`
- **Status:** Built and tested
- Uses Arctic Shift API (no Reddit API key needed)
- Scans r/smallbusiness and r/Entrepreneur
- Detects 7 keywords: "tired of", "selling business", "want out", etc.
- Deduplicates by source_id
- Filters posts from last 7 days
- **Test:** Run `node reddit-scanner.js` — successfully fetches and parses posts

### Task #65 — AI Qualification Engine ✅
- **File:** `src/scanner/ai-qualifier.js`
- **Status:** Built and tested
- OpenAI GPT-4o-mini integration
- Scores leads 1-10 (conservative scoring)
- Extracts business type, location, urgency
- Generates personalized outreach drafts
- Tags: hot (8-10), warm (5-7), cold (1-4)
- **Cost:** ~$0.005 per lead

### Task #66 — Supabase Schema ✅
- **File:** `BRIEF.md` (schema section)
- Tables designed: `users`, `scan_configs`, `leads`
- Row Level Security (RLS) policies defined
- Multi-tenant from day 1
- Indexes for performance

---

## What Needs to Be Built 🚧

### Task #67 — React Dashboard (PRIMARY TASK)
**Your job:** Build the complete React frontend.

**Pages to build:**
1. **Login** (`/login`)
   - Email + password auth via Supabase
   - Sign up flow
   - Magic link optional

2. **Dashboard** (`/dashboard`)
   - Stats cards (total leads, hot, warm, contacted)
   - Lead list table (sortable, filterable, searchable)
   - Filters: tag (hot/warm/cold), status, date range
   - Pagination (20 per page)
   - "Trigger Scan" button (manual testing)

3. **Lead Detail** (`/leads/:id`)
   - Full post content + Reddit link
   - AI analysis (score, business type, location, reasoning)
   - Outreach draft (copy button)
   - Status dropdown + notes textarea
   - "Mark as Contacted" button

4. **Settings** (`/settings`)
   - Configure subreddits (comma-separated)
   - Configure keywords (comma-separated)
   - Scan interval dropdown
   - Enable/disable scanning toggle
   - Save button

**Tech stack:**
- React 18 + Vite
- React Router v6
- Tailwind CSS + Headless UI
- Supabase JS client
- Deploy to Vercel

**Design:** Clean, professional (think Linear or Notion). Responsive. Dark mode optional.

### Backend Integration
You also need to build:

1. **Express Server** (`src/scanner/index.js`)
   - `GET /health` — health check
   - `POST /api/scan` — manual scan trigger (requires API key header)
   - CORS enabled for frontend

2. **Cron Job** (`src/scanner/cron.js`)
   - Imports `reddit-scanner.js` and `ai-qualifier.js`
   - Fetches all users with `enabled: true` scan configs
   - For each user:
     - Run scanner → save raw leads to Supabase
     - Run AI qualification → update leads with analysis
   - Logs to stdout

3. **Database Client** (`src/scanner/db.js`)
   - Supabase client setup
   - Helper functions for common queries

4. **Supabase Schema SQL** (`supabase/schema.sql`)
   - Copy from BRIEF.md schema section
   - Ready to paste into Supabase SQL editor

---

## Deployment

### Backend → Render
1. Create web service on Render
2. Root directory: `src/scanner`
3. Build command: `npm install`
4. Start command: `node index.js`
5. Environment variables: `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `OPENAI_API_KEY`, `RENDER_API_KEY`
6. Add cron job: `node cron.js`, schedule `0 */6 * * *` (every 6 hours)

### Frontend → Vercel
1. `cd src/frontend`
2. `vercel --prod`
3. Environment variables: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`

### GitHub
1. Create repo: `github.com/aparajithn/ai-deal-scanner`
2. Push all code
3. Update README with deployment URLs

---

## Testing Checklist

### End-to-End Flow
1. [ ] Sign up new account on live site
2. [ ] Configure subreddits in Settings
3. [ ] Trigger manual scan
4. [ ] Verify leads appear in Dashboard
5. [ ] Click lead → verify AI analysis shows
6. [ ] Update status + add notes
7. [ ] Create 2nd test account → verify can't see first user's leads (RLS)

### Performance
- [ ] Dashboard loads in <2s
- [ ] Lead detail loads in <1s
- [ ] Manual scan completes in <2min for 50 leads

### Security
- [ ] No API keys in frontend bundle (check browser Sources tab)
- [ ] RLS policies enforced (test with 2 users)
- [ ] HTTPS enabled (Vercel does this)

---

## Files You Need to Create

```
src/scanner/
  ├── index.js        # Express server (NEW)
  ├── cron.js         # Background scanner (NEW)
  ├── db.js           # Supabase client (NEW)
  ├── package.json    # Update with new deps (express, node-cron, @supabase/supabase-js)
  ├── reddit-scanner.js  # ✅ Already exists
  └── ai-qualifier.js    # ✅ Already exists

src/frontend/         # Entire React app (NEW)
  ├── package.json
  ├── vite.config.js
  ├── tailwind.config.js
  ├── index.html
  ├── src/
  │   ├── main.jsx
  │   ├── App.jsx
  │   ├── lib/supabase.js
  │   ├── pages/
  │   │   ├── Login.jsx
  │   │   ├── Dashboard.jsx
  │   │   ├── LeadDetail.jsx
  │   │   └── Settings.jsx
  │   └── components/
  │       ├── LeadList.jsx
  │       ├── StatsCard.jsx
  │       └── Header.jsx

supabase/
  └── schema.sql      # Copy from BRIEF.md (NEW)

.env.example          # ✅ Already exists
README.md             # ✅ Already exists (update with deployment URLs)
```

---

## Key Constraints

1. **Non-technical user:** Alex Kouba must be able to set up his account without hand-holding. Make UI intuitive.
2. **Reddit API rate limits:** Already handled in scanner (1-2s delays between requests).
3. **OpenAI cost control:** Use `gpt-4o-mini`, not `gpt-4`. Already configured in ai-qualifier.js.
4. **Multi-tenant:** RLS policies MUST work. Test with 2 accounts.
5. **No Telegram bot (#68):** Deferred to v2. Focus on web dashboard only.

---

## Success Criteria

### Technical
- [ ] All 4 pages load without errors
- [ ] Supabase Auth works (login, signup, logout)
- [ ] Scanner runs without errors (check Render logs)
- [ ] AI qualification completes successfully
- [ ] RLS policies prevent data leaks
- [ ] Deployed to Render + Vercel with live URLs

### Business (Alex Validation)
- [ ] Finds at least 10 warm+ leads per week
- [ ] AI score accuracy >70% (Alex will validate sample)
- [ ] Outreach drafts are usable (<50% editing required)
- [ ] Alex can self-serve setup

---

## Reference Documents

- **BRIEF.md** — Comprehensive product spec (READ THIS FIRST)
- **ARCHITECTURE.md** — System design
- **README.md** — Setup guide for Alex
- **reddit-scanner.js** — Working Reddit scanner (reference implementation)
- **ai-qualifier.js** — Working AI qualifier (reference implementation)

---

## Timeline

**Estimated:** 2-3 days

- Day 1: Backend (Express server, cron job, Supabase setup) — 6 hours
- Day 2: Frontend (all pages, auth, routing) — 8 hours
- Day 3: Deploy, test, document — 4 hours

---

## Questions?

If anything is unclear, refer to BRIEF.md. All requirements are documented there in detail.

When done, report back to Maven with:
1. Deployment URLs (Vercel frontend, Render backend)
2. Any issues encountered
3. Test results (did end-to-end flow work?)

---

**GO BUILD! 🚀**
