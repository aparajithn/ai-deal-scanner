# Deployment Guide — AI Deal Scanner

This guide walks you through deploying the AI Deal Scanner MVP to production.

**Target:** Non-technical users (like Alex Kouba) should be able to follow this.

---

## Prerequisites

Before you start, you need:

1. **GitHub account** (to host code)
2. **Supabase account** (database) — https://supabase.com
3. **OpenAI account** (AI) — https://platform.openai.com
4. **Render account** (backend) — https://render.com
5. **Vercel account** (frontend) — https://vercel.com

All services have free tiers. Total cost: ~$0.50/month for MVP.

---

## Step 1: Set Up Supabase (Database)

### 1.1 Create Project
1. Go to https://supabase.com/dashboard
2. Click **New Project**
3. Fill in:
   - Name: `ai-deal-scanner`
   - Database Password: (generate strong password, save it)
   - Region: (choose closest to you)
4. Click **Create new project** (takes ~2 minutes)

### 1.2 Create Database Tables
1. When project is ready, go to **SQL Editor** (left sidebar)
2. Open the file `supabase/schema.sql` from the GitHub repo
3. Copy **all** the SQL code
4. Paste into SQL Editor
5. Click **Run** (bottom right)
6. You should see: ✅ Success. No rows returned

### 1.3 Copy API Keys
1. Go to **Settings** → **API** (left sidebar)
2. Copy and save these (you'll need them later):
   - **Project URL** (e.g., `https://abcdefgh.supabase.co`)
   - **anon public** key (starts with `eyJhbGci...`) — 600+ characters
   - **service_role** key (also starts with `eyJhbGci...`) — **KEEP THIS SECRET!**

---

## Step 2: Get OpenAI API Key

1. Go to https://platform.openai.com/api-keys
2. Click **Create new secret key**
3. Name it: `ai-deal-scanner`
4. Copy the key (starts with `sk-...`) — **Save it, you can't see it again!**
5. Add credits if needed (Dashboard → Billing → Add payment method)
   - You'll need ~$5 to start (MVP uses ~$0.50/month)

---

## Step 3: Deploy Backend to Render

### 3.1 Create Render Account
1. Go to https://render.com/
2. Sign up with GitHub (easier for deployments)

### 3.2 Create Web Service
1. Click **New** → **Web Service**
2. Connect your GitHub account (if not already connected)
3. Select repository: `aparajithn/ai-deal-scanner`
4. Fill in:
   - **Name:** `ai-deal-scanner-backend`
   - **Region:** (choose closest to you)
   - **Branch:** `main`
   - **Root Directory:** `src/scanner`
   - **Runtime:** Node
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Instance Type:** Free

### 3.3 Add Environment Variables
Scroll down to **Environment Variables** section. Add these:

| Key | Value |
|-----|-------|
| `SUPABASE_URL` | Your Supabase Project URL from Step 1.3 |
| `SUPABASE_SERVICE_KEY` | Your Supabase service_role key from Step 1.3 |
| `OPENAI_API_KEY` | Your OpenAI key from Step 2 |
| `RENDER_API_KEY` | Generate a random string (run: `openssl rand -hex 32` in terminal) |
| `NODE_ENV` | `production` |

Click **Create Web Service**

### 3.4 Wait for Deployment
- Render will build and deploy your backend (~3-5 minutes)
- When done, you'll see: ✅ **Live** (green dot)
- Copy your service URL (e.g., `https://ai-deal-scanner-backend.onrender.com`)

### 3.5 Add Cron Job (Automatic Scanning)
1. Go to your service dashboard
2. Click **Cron Jobs** tab
3. Click **Add Cron Job**
4. Fill in:
   - **Command:** `node cron.js`
   - **Schedule:** `0 */6 * * *` (every 6 hours)
5. Click **Save**

### 3.6 Test Backend
Open your backend URL in browser: `https://your-backend.onrender.com/health`

You should see:
```json
{
  "status": "ok",
  "service": "ai-deal-scanner",
  "timestamp": "2026-03-13T...",
  "env": {
    "supabase": true,
    "openai": true,
    "render_api_key": true
  }
}
```

If any `env` value is `false`, go back and check your environment variables.

---

## Step 4: Deploy Frontend to Vercel

### 4.1 Create Vercel Account
1. Go to https://vercel.com/
2. Sign up with GitHub

### 4.2 Import Repository
1. Click **Add New...** → **Project**
2. Import `aparajithn/ai-deal-scanner` repository
3. Configure:
   - **Framework Preset:** Vite
   - **Root Directory:** `src/frontend`
   - **Build Command:** `npm run build` (auto-filled)
   - **Output Directory:** `dist` (auto-filled)

### 4.3 Add Environment Variables
Click **Environment Variables** → Add these:

| Key | Value |
|-----|-------|
| `VITE_SUPABASE_URL` | Your Supabase Project URL from Step 1.3 |
| `VITE_SUPABASE_ANON_KEY` | Your Supabase **anon public** key from Step 1.3 |

**⚠️ Important:** Use **anon key**, NOT service_role key! Frontend must use anon key.

### 4.4 Deploy
1. Click **Deploy**
2. Wait ~2-3 minutes
3. When done, you'll see: 🎉 **Congratulations!**
4. Click **Visit** to open your app
5. Copy the URL (e.g., `https://ai-deal-scanner.vercel.app`)

---

## Step 5: Test Your App

### 5.1 Create Account
1. Go to your Vercel URL
2. Click **Sign Up**
3. Enter email + password (at least 6 characters)
4. Check your email for confirmation link (Supabase sends this)
5. Click confirmation link
6. Go back to your app → Click **Sign In**
7. Enter same email + password

### 5.2 Configure Scanner
1. After login, you'll see the Dashboard (empty at first)
2. Click **Settings** (top right)
3. Configure:
   - **Enable automatic scanning:** ✅ (checked)
   - **Subreddits:** `smallbusiness, Entrepreneur, SaaS`
   - **Keywords:** `tired of, selling business, want out, looking to exit, ready to sell, need to sell`
   - **Scan Interval:** Every 6 hours
4. Click **Save Settings**

### 5.3 Wait for First Scan
- Cron job runs every 6 hours
- To test immediately, you can run manually:
  1. Go to backend URL: `https://your-backend.onrender.com/api/scan`
  2. Use a tool like Postman or curl:
     ```bash
     curl -X POST https://your-backend.onrender.com/api/scan \
       -H "X-API-Key: your_render_api_key_here"
     ```

### 5.4 Check Logs
- **Render logs:** Go to Render dashboard → Your service → Logs
- Look for: `🚀 AI Deal Scanner - Cron Job Started`
- Check for errors

---

## Step 6: Use Your Scanner

### Daily Workflow
1. **Dashboard** → See all leads ranked by score
2. **Click a lead** → View full Reddit post + AI analysis
3. **Copy outreach message** → Send DM to Reddit user
4. **Update status** → Mark as contacted/interested/closed
5. **Add notes** → Track your conversations

### Filters
- **Tag:** Hot (8-10), Warm (5-7), Cold (1-4)
- **Status:** New, Contacted, Interested, Not Interested, Closed
- **Search:** Keywords in title or content

---

## Troubleshooting

### No leads appearing after 6+ hours
1. Check Render logs for errors
2. Verify cron job is active (Render → Cron Jobs tab)
3. Test scanner manually (see Step 5.3)
4. Check Supabase table: `leads` (should have rows)

### "Missing Supabase environment variables" error
- Frontend: Check Vercel environment variables
  - Must start with `VITE_`
  - Use **anon key**, not service_role
- Backend: Check Render environment variables
  - Use **service_role key**, not anon

### AI qualification fails
- Check OpenAI API key is correct
- Verify you have credits ($5 minimum recommended)
- Check Render logs for OpenAI errors

### Can't sign in / sign up
- Check Supabase dashboard → Authentication → Providers
- Email should be enabled (it is by default)
- Check email for confirmation link

### Backend sleeps (Free tier)
- Render free tier sleeps after 15 min inactivity
- First request after sleep takes ~30 seconds to wake up
- Upgrade to Starter plan ($7/mo) for always-on

---

## Costs Breakdown

### Free Tier (MVP Testing)
- **Supabase:** Free (500MB DB, 2GB bandwidth)
- **Vercel:** Free (100GB bandwidth)
- **Render:** Free (sleeps after 15min)
- **OpenAI:** Pay-per-use (~$0.50/month for 100 leads)

**Total:** ~$0.50/month

### Production (Always-On)
- **Supabase:** $25/month (Pro plan, more storage)
- **Vercel:** Free (still within limits)
- **Render:** $7/month (Starter plan, no sleep)
- **OpenAI:** ~$5/month (1000 leads)

**Total:** ~$37/month

---

## Next Steps

### MVP Complete! Now:
1. **Test with real use** — Let it run for 1 week
2. **Review lead quality** — Are AI scores accurate?
3. **Adjust keywords** — Fine-tune based on results
4. **Track conversions** — How many leads turn into deals?

### v2 Features (Future)
- Twitter/X scanning
- LinkedIn scanning
- Telegram bot notifications
- Email outreach automation
- Team workspaces

---

## Support

**Issues?** Open an issue on GitHub: https://github.com/aparajithn/ai-deal-scanner/issues

**Questions?** Contact: aparajithn@gmail.com

---

**✅ Deployment Complete!** Your AI Deal Scanner is live and running.
