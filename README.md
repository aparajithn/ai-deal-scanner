# AI Deal Scanner

**Automated lead generation for business brokers**

AI Deal Scanner monitors Reddit for business sale signals, qualifies leads with AI, and delivers them in a clean CRM dashboard. Built for business brokers, M&A advisors, and deal sourcers who need automated lead gen.

🔗 **GitHub:** https://github.com/aparajithn/ai-deal-scanner

---

## Features

✅ **Reddit Scanner** — Monitors custom subreddits for business sale keywords  
✅ **AI Qualification** — GPT-4o-mini scores leads (1-10) and generates outreach drafts  
✅ **CRM Dashboard** — Filter, search, and manage leads  
✅ **Lead Detail Pages** — Full context with AI analysis and outreach suggestions  
✅ **Multi-tenant** — Row Level Security (RLS) for data isolation  
✅ **Self-serve Setup** — Non-technical users can configure everything

---

## Tech Stack

- **Frontend:** React 18 + Vite + Tailwind CSS → Deployed on **Vercel**
- **Backend:** Node.js + Express + Cron → Deployed on **Render**
- **Database:** Supabase (PostgreSQL + Auth + RLS)
- **APIs:** Arctic Shift (Reddit), OpenAI (GPT-4o-mini)

---

## Quick Start (Local Development)

### Prerequisites
- Node.js 18+
- Supabase account
- OpenAI API key

### 1. Clone Repository
```bash
git clone https://github.com/aparajithn/ai-deal-scanner.git
cd ai-deal-scanner
```

### 2. Set Up Supabase
1. Go to https://supabase.com/dashboard
2. Create new project: "ai-deal-scanner"
3. Go to **SQL Editor** → Paste contents of `supabase/schema.sql` → Run
4. Go to **Settings → API**:
   - Copy **Project URL** (e.g., `https://xxxxx.supabase.co`)
   - Copy **anon public** key (starts with `eyJhbGci...`)
   - Copy **service_role** key (keep this secret!)

### 3. Get OpenAI API Key
1. Go to https://platform.openai.com/api-keys
2. Create new key (starts with `sk-...`)

### 4. Backend Setup
```bash
cd src/scanner
npm install

# Create .env file
cp .env.example .env
# Edit .env with your keys:
#   SUPABASE_URL=https://xxxxx.supabase.co
#   SUPABASE_SERVICE_KEY=eyJhbGci... (service_role key)
#   OPENAI_API_KEY=sk-...
#   RENDER_API_KEY=your_random_string
#   PORT=3000

# Test scanner
node reddit-scanner.js

# Test AI qualifier (requires OPENAI_API_KEY)
node ai-qualifier.js

# Start API server
npm start
```

### 5. Frontend Setup
```bash
cd src/frontend
npm install

# Create .env.local file
cp .env.example .env.local
# Edit .env.local:
#   VITE_SUPABASE_URL=https://xxxxx.supabase.co
#   VITE_SUPABASE_ANON_KEY=eyJhbGci... (anon key, NOT service_role)

# Start dev server
npm run dev
```

Visit http://localhost:5173 and sign up!

---

## Production Deployment

### Deploy Backend to Render

1. **Create Render Account:** https://render.com/
2. **New Web Service:**
   - Repository: `aparajithn/ai-deal-scanner`
   - Root Directory: `src/scanner`
   - Build Command: `npm install`
   - Start Command: `npm start`
3. **Environment Variables:**
   ```
   SUPABASE_URL=https://xxxxx.supabase.co
   SUPABASE_SERVICE_KEY=eyJhbGci... (service_role key)
   OPENAI_API_KEY=sk-...
   RENDER_API_KEY=<generate random string>
   NODE_ENV=production
   ```
4. **Deploy** → Copy live URL (e.g., `https://ai-deal-scanner.onrender.com`)
5. **Add Cron Job:**
   - Go to service → **Settings → Cron Jobs**
   - Command: `node cron.js`
   - Schedule: `0 */6 * * *` (every 6 hours)

### Deploy Frontend to Vercel

```bash
cd src/frontend

# Install Vercel CLI (if not already installed)
npm install -g vercel

# Deploy
vercel --prod

# When prompted:
# - Link to existing project? No
# - Project name: ai-deal-scanner
# - Directory: ./ (current directory is already src/frontend)

# Set environment variables (do this BEFORE deploying or via Vercel dashboard):
vercel env add VITE_SUPABASE_URL production
# Paste: https://xxxxx.supabase.co

vercel env add VITE_SUPABASE_ANON_KEY production
# Paste: eyJhbGci... (anon key)

# Redeploy with env vars
vercel --prod
```

**Alternative:** Use Vercel Dashboard:
1. Go to https://vercel.com/dashboard
2. **New Project** → Import `aparajithn/ai-deal-scanner`
3. Root Directory: `src/frontend`
4. Framework: **Vite**
5. Environment Variables:
   - `VITE_SUPABASE_URL` = your Supabase URL
   - `VITE_SUPABASE_ANON_KEY` = your anon key
6. Deploy

---

## Usage Guide

### First-Time Setup
1. Go to your Vercel URL (e.g., `https://ai-deal-scanner.vercel.app`)
2. Click **Sign Up** → Enter email + password
3. Go to **Settings**:
   - Configure subreddits (e.g., `smallbusiness, Entrepreneur, SaaS`)
   - Add keywords (e.g., `tired of, selling business, want out, looking to exit`)
   - Set scan interval (6/12/24 hours)
   - Enable scanning
4. Click **Save Settings**
5. Wait for first scan (or trigger manually if backend has manual scan endpoint)

### Daily Workflow
1. **Dashboard** → See all leads ranked by AI score
2. **Filter by:**
   - Tag (hot/warm/cold)
   - Status (new/contacted/interested)
   - Search (keywords in title/content)
3. **Click lead** → View full analysis
4. **Copy outreach message** → Send DM to Reddit user
5. **Update status** → Mark as contacted/interested/closed
6. **Add notes** → Track conversations

---

## Cost Estimate

### MVP (1 user, 100 leads/week)
- **Supabase:** Free tier (500MB, 2GB bandwidth)
- **Vercel:** Free tier (100GB bandwidth)
- **Render:** Free tier (sleeps after 15min inactivity)
- **OpenAI:** ~$0.50/month (100 leads × $0.005)

**Total:** ~$0.50/month

### Scale (10 users, 1000 leads/week)
- **Supabase:** $25/month (Pro plan)
- **Vercel:** Free tier
- **Render:** $7/month (Starter plan, always-on)
- **OpenAI:** ~$5/month

**Total:** ~$37/month ($3.70/user)

---

## Troubleshooting

### Backend won't start
- Check environment variables are set correctly
- Verify Supabase URL and service_role key
- Check Render logs for errors

### Frontend shows "Missing Supabase environment variables"
- Make sure `.env.local` (dev) or Vercel env vars (prod) are set
- Use **anon key**, not service_role key
- Prefix must be `VITE_` for Vite to expose them

### No leads appearing
- Check scan config is enabled (Settings page)
- Verify cron job is running (Render dashboard → Cron Jobs)
- Check Render logs for scanner errors
- Manually run: `node cron.js` locally to test

### AI qualification fails
- Verify OpenAI API key is valid
- Check you have credits on OpenAI account
- Review backend logs for error messages

### RLS errors (users seeing other users' data)
- Re-run `supabase/schema.sql` to ensure RLS policies are applied
- Check Supabase dashboard → Authentication → Policies

---

## File Structure

```
ai-deal-scanner/
├── README.md                          # This file
├── BRIEF.md                           # Comprehensive product spec
├── ARCHITECTURE.md                    # System design doc
├── .env.example                       # Root env template
│
├── supabase/
│   └── schema.sql                     # Database schema with RLS
│
├── src/
│   ├── scanner/                       # Backend (Render)
│   │   ├── package.json
│   │   ├── index.js                   # Express API server
│   │   ├── cron.js                    # Background scanner
│   │   ├── db.js                      # Supabase client
│   │   ├── reddit-scanner.js          # Reddit scraper
│   │   ├── ai-qualifier.js            # OpenAI integration
│   │   └── .env.example
│   │
│   └── frontend/                      # React app (Vercel)
│       ├── package.json
│       ├── vite.config.js
│       ├── tailwind.config.js
│       ├── index.html
│       ├── src/
│       │   ├── main.jsx
│       │   ├── App.jsx
│       │   ├── lib/supabase.js        # Supabase client
│       │   ├── pages/
│       │   │   ├── Login.jsx
│       │   │   ├── Dashboard.jsx
│       │   │   ├── LeadDetail.jsx
│       │   │   └── Settings.jsx
│       │   └── components/
│       │       ├── Header.jsx
│       │       ├── StatsCard.jsx
│       │       └── LeadList.jsx
│       └── .env.example
```

---

## API Endpoints (Backend)

- `GET /health` — Health check
- `GET /api/active-users` — Get count of users with scanning enabled
- `POST /api/scan` — Trigger manual scan (requires `X-API-Key` header)

---

## Contributing

This is an MVP built for Alex Kouba (business broker). If you want to add features:

1. Fork the repo
2. Create feature branch
3. Submit PR with description

Planned v2 features:
- Twitter/X scanning
- LinkedIn scanning
- Telegram bot notifications
- Email outreach automation
- Zapier integration
- Team workspaces

---

## License

MIT

---

## Contact

Built by [Aparajith Nagarajan](https://github.com/aparajithn) via OpenClaw agents (Maven + Forge).

**First Customer:** Alex Kouba (business broker)

For questions or feedback, open an issue on GitHub.

---

## Acknowledgments

- **Reddit data:** [Arctic Shift API](https://arctic-shift.photon-reddit.com) (public proxy)
- **AI:** OpenAI GPT-4o-mini
- **Database:** Supabase
- **Hosting:** Vercel (frontend) + Render (backend)
