# AI Deal Scanner

**Automated lead generation for business brokers**

AI Deal Scanner monitors Reddit for business sale signals, qualifies leads with AI, and delivers them in a clean CRM dashboard. Built for business brokers, M&A advisors, and deal sourcers who need automated lead gen.

---

## The Problem

Business brokers spend 10+ hours/week manually scrolling through Reddit, LinkedIn, Twitter looking for business sale signals. They miss leads, struggle to qualify intent, and have no organized system.

## The Solution

- **24/7 Reddit monitoring** — Configurable subreddits + keywords
- **AI qualification** — GPT-4o-mini scores each lead (1-10), extracts business type, location, urgency
- **CRM dashboard** — Ranked leads with AI-generated outreach drafts
- **Self-serve setup** — Non-technical users can configure everything

---

## Tech Stack

**Frontend:**
- React 18 + Vite
- Tailwind CSS
- Supabase Auth
- Deployed on Vercel

**Backend:**
- Node.js + Express
- Cron scheduler (runs every 6 hours)
- Deployed on Render

**Database:**
- Supabase (PostgreSQL + Auth + Row Level Security)

**APIs:**
- Arctic Shift (Reddit proxy, no API key needed)
- OpenAI GPT-4o-mini (lead qualification)

---

## Features

### MVP (Current)
- ✅ Reddit scanner (r/smallbusiness, r/Entrepreneur, custom subreddits)
- ✅ Keyword detection ("tired of", "selling business", "looking to exit")
- ✅ AI lead scoring (1-10 intent score)
- ✅ Business intelligence extraction (type, location, urgency)
- ✅ Outreach message drafts (AI-personalized)
- ✅ CRM dashboard (filterable, sortable, searchable)
- ✅ Lead detail pages (full context + AI analysis)
- ✅ Settings (configure subreddits, keywords, scan interval)
- ✅ Multi-tenant (RLS-enforced data isolation)

### Roadmap (v2)
- Twitter/X scanning
- LinkedIn scanning
- Telegram bot notifications
- Email outreach automation
- Zapier integration
- Team workspaces

---

## Project Structure

```
projects/2026-03-13-ai-deal-scanner/
├── README.md                    # This file
├── BRIEF.md                     # Comprehensive product brief for Forge
├── ARCHITECTURE.md              # System architecture & design
├── .env.example                 # Environment variables template
│
├── src/
│   ├── scanner/                 # Backend scanner service (Render)
│   │   ├── reddit-scanner.js    # ✅ Built & tested
│   │   ├── ai-qualifier.js      # ✅ Built & tested
│   │   ├── index.js             # Express server (to be built by Forge)
│   │   ├── cron.js              # Background scanner (to be built by Forge)
│   │   └── db.js                # Supabase client (to be built by Forge)
│   │
│   └── frontend/                # React dashboard (to be built by Forge)
│       └── (React app goes here)
│
└── supabase/
    └── schema.sql               # Database schema (defined in BRIEF.md)
```

---

## Setup Instructions

**Full setup guide is in [BRIEF.md](./BRIEF.md)** under "Setup Instructions (for Alex)".

### Quick Start (for developers)

1. **Clone repo**
   ```bash
   git clone https://github.com/aparajithn/ai-deal-scanner.git
   cd ai-deal-scanner
   ```

2. **Set up Supabase**
   - Create project at https://supabase.com
   - Run schema from `supabase/schema.sql`
   - Copy Project URL, anon key, service_role key

3. **Set up OpenAI**
   - Get API key from https://platform.openai.com/api-keys

4. **Backend (local testing)**
   ```bash
   cd src/scanner
   npm install
   
   # Create .env
   cp .env.example .env
   # Edit .env with your keys
   
   # Test Reddit scanner
   node reddit-scanner.js
   
   # Test AI qualifier (requires OPENAI_API_KEY)
   node ai-qualifier.js
   ```

5. **Frontend (local dev)**
   ```bash
   cd src/frontend
   npm install
   
   # Create .env.local
   cp .env.example .env.local
   # Edit with your Supabase URL + anon key
   
   npm run dev
   ```

6. **Deploy**
   - Backend → Render (follow BRIEF.md deployment guide)
   - Frontend → Vercel (`vercel --prod`)

---

## Cost Estimate

**MVP (1 user, 100 leads/week):**
- Supabase: Free tier
- Vercel: Free tier
- Render: Free tier
- OpenAI: ~$0.50/month

**Total: ~$0.50/month**

**Scale (10 users, 1000 leads/week):**
- Total: ~$37/month (~$3.70/user)
- Unit economics at $49/month pricing: 92% margin

---

## Current Status

**✅ Completed:**
- Architecture defined (ARCHITECTURE.md)
- Reddit scanner built & tested (reddit-scanner.js)
- AI qualification engine built (ai-qualifier.js)
- Database schema designed
- Comprehensive product brief written (BRIEF.md)

**🚧 In Progress:**
- Backend Express server (to be built by Forge)
- React frontend (to be built by Forge)
- Deployment to Render + Vercel (to be built by Forge)

**📋 Next Steps:**
1. Forge builds backend (Express + cron)
2. Forge builds frontend (React dashboard)
3. Deploy to Render + Vercel
4. End-to-end testing
5. Hand off to Alex Kouba for validation

---

## License

MIT

---

## Contact

Built by [Aparajith Nagarajan](https://github.com/aparajithn) via OpenClaw agents (Maven → Forge).

**First Customer:** Alex Kouba (business broker)

For questions or feedback, open an issue on GitHub.
