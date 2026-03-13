-- AI Deal Scanner - Supabase Schema
-- Multi-tenant SaaS with Row Level Security (RLS)
-- Database: PostgreSQL via Supabase

-- ============================================================
-- 1. USERS TABLE
-- ============================================================
-- Note: Supabase Auth manages user authentication automatically
-- We create a users table synced with auth.users for additional fields

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Trigger to auto-create user row when someone signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email)
  VALUES (NEW.id, NEW.email)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- 2. SCAN CONFIGURATIONS TABLE
-- ============================================================
-- Stores per-user settings for Reddit scanning

CREATE TABLE IF NOT EXISTS scan_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  
  -- Scan settings
  subreddits TEXT[] DEFAULT ARRAY['smallbusiness', 'Entrepreneur'],
  keywords TEXT[] DEFAULT ARRAY['tired of', 'selling business', 'want out', 'looking to exit', 'ready to sell', 'need to sell', 'selling my business'],
  enabled BOOLEAN DEFAULT true,
  scan_interval_hours INTEGER DEFAULT 6,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  -- Each user has one config row
  UNIQUE(user_id)
);

-- RLS Policies for scan_configs
ALTER TABLE scan_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own scan configs"
  ON scan_configs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own scan configs"
  ON scan_configs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own scan configs"
  ON scan_configs FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own scan configs"
  ON scan_configs FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================
-- 3. LEADS TABLE
-- ============================================================
-- Stores all scanned and qualified leads

CREATE TABLE IF NOT EXISTS leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  
  -- Source data (from Reddit scanner)
  source TEXT NOT NULL DEFAULT 'reddit',
  source_id TEXT NOT NULL, -- Reddit post ID (e.g., "1a2b3c4")
  author TEXT,
  title TEXT NOT NULL,
  content TEXT,
  url TEXT,
  subreddit TEXT,
  posted_at TIMESTAMPTZ,
  matched_keyword TEXT,
  upvotes INTEGER DEFAULT 0,
  num_comments INTEGER DEFAULT 0,
  
  -- AI analysis (from AI qualifier)
  intent_score INTEGER CHECK (intent_score >= 1 AND intent_score <= 10),
  ai_tag TEXT CHECK (ai_tag IN ('hot', 'warm', 'cold', 'error')),
  business_type TEXT,
  location TEXT,
  urgency TEXT CHECK (urgency IN ('immediate', 'soon', 'exploring', 'none', 'unknown')),
  reasoning TEXT,
  outreach_message TEXT,
  qualification_error TEXT, -- Error message if AI qualification fails
  
  -- CRM fields
  status TEXT DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'interested', 'not_interested', 'closed')),
  notes TEXT,
  contacted_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  -- Prevent duplicate leads per user
  UNIQUE(user_id, source_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_leads_user_id ON leads(user_id);
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_intent_score ON leads(intent_score DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON leads(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_leads_ai_tag ON leads(ai_tag);
CREATE INDEX IF NOT EXISTS idx_leads_source_id ON leads(source_id);

-- RLS Policies for leads
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own leads"
  ON leads FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own leads"
  ON leads FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own leads"
  ON leads FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own leads"
  ON leads FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================
-- 4. TRIGGER FOR updated_at TIMESTAMPS
-- ============================================================
-- Auto-update updated_at when rows are modified

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_scan_configs_updated_at
  BEFORE UPDATE ON scan_configs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_leads_updated_at
  BEFORE UPDATE ON leads
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- 5. INITIAL DATA (Optional)
-- ============================================================
-- Create default scan config for new users automatically

CREATE OR REPLACE FUNCTION create_default_scan_config()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO scan_configs (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_user_created_default_config
  AFTER INSERT ON users
  FOR EACH ROW EXECUTE FUNCTION create_default_scan_config();

-- ============================================================
-- SETUP COMPLETE
-- ============================================================
-- To apply this schema:
-- 1. Go to Supabase Dashboard → SQL Editor
-- 2. Paste this entire file
-- 3. Click "Run"
-- 
-- To test RLS:
-- 1. Create 2 test users via Supabase Auth
-- 2. Insert leads for each user
-- 3. Verify they can only see their own data
