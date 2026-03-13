/**
 * Supabase Database Client
 * 
 * Provides database access for the scanner service.
 * Uses service_role key to bypass RLS (needed for cron jobs).
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables:');
  console.error('   SUPABASE_URL:', supabaseUrl ? '✓' : '✗');
  console.error('   SUPABASE_SERVICE_KEY:', supabaseServiceKey ? '✓' : '✗');
  process.exit(1);
}

// Create Supabase client with service_role key (bypasses RLS)
export const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

/**
 * Get all users with enabled scan configs
 */
export async function getActiveUsers() {
  const { data, error } = await supabase
    .from('scan_configs')
    .select(`
      *,
      users (
        id,
        email
      )
    `)
    .eq('enabled', true);
  
  if (error) {
    console.error('❌ Error fetching active users:', error);
    return [];
  }
  
  return data || [];
}

/**
 * Get user's scan config
 */
export async function getScanConfig(userId) {
  const { data, error } = await supabase
    .from('scan_configs')
    .select('*')
    .eq('user_id', userId)
    .single();
  
  if (error) {
    console.error(`❌ Error fetching scan config for user ${userId}:`, error);
    return null;
  }
  
  return data;
}

/**
 * Save raw lead (before AI qualification)
 */
export async function saveRawLead(userId, leadData) {
  const { data, error } = await supabase
    .from('leads')
    .insert({
      user_id: userId,
      ...leadData
    })
    .select()
    .single();
  
  if (error) {
    // If duplicate (unique constraint violation), that's OK
    if (error.code === '23505') {
      return null; // Lead already exists
    }
    console.error('❌ Error saving raw lead:', error);
    return null;
  }
  
  return data;
}

/**
 * Update lead with AI qualification results
 */
export async function updateLeadWithAI(leadId, aiData) {
  const { data, error } = await supabase
    .from('leads')
    .update({
      intent_score: aiData.intent_score,
      ai_tag: aiData.ai_tag,
      business_type: aiData.business_type,
      location: aiData.location,
      urgency: aiData.urgency,
      reasoning: aiData.reasoning,
      outreach_message: aiData.outreach_message,
      qualification_error: aiData.qualification_error || null
    })
    .eq('id', leadId)
    .select()
    .single();
  
  if (error) {
    console.error(`❌ Error updating lead ${leadId} with AI data:`, error);
    return null;
  }
  
  return data;
}

/**
 * Get unqualified leads (missing AI analysis)
 */
export async function getUnqualifiedLeads(userId, limit = 10) {
  const { data, error } = await supabase
    .from('leads')
    .select('*')
    .eq('user_id', userId)
    .is('intent_score', null)
    .order('created_at', { ascending: false })
    .limit(limit);
  
  if (error) {
    console.error(`❌ Error fetching unqualified leads for user ${userId}:`, error);
    return [];
  }
  
  return data || [];
}

/**
 * Check if lead already exists (deduplication)
 */
export async function leadExists(userId, sourceId) {
  const { data, error } = await supabase
    .from('leads')
    .select('id')
    .eq('user_id', userId)
    .eq('source_id', sourceId)
    .single();
  
  if (error) {
    // Not found is OK (lead doesn't exist)
    if (error.code === 'PGRST116') {
      return false;
    }
    console.error('❌ Error checking lead existence:', error);
    return false;
  }
  
  return !!data;
}

/**
 * Get lead statistics for a user
 */
export async function getLeadStats(userId) {
  // Get counts by tag
  const { data: tagCounts, error: tagError } = await supabase
    .from('leads')
    .select('ai_tag')
    .eq('user_id', userId);
  
  if (tagError) {
    console.error('❌ Error fetching tag counts:', tagError);
    return null;
  }
  
  // Get counts by status
  const { data: statusCounts, error: statusError } = await supabase
    .from('leads')
    .select('status')
    .eq('user_id', userId);
  
  if (statusError) {
    console.error('❌ Error fetching status counts:', statusError);
    return null;
  }
  
  // Calculate stats
  const stats = {
    total: tagCounts.length,
    hot: tagCounts.filter(l => l.ai_tag === 'hot').length,
    warm: tagCounts.filter(l => l.ai_tag === 'warm').length,
    cold: tagCounts.filter(l => l.ai_tag === 'cold').length,
    new: statusCounts.filter(l => l.status === 'new').length,
    contacted: statusCounts.filter(l => l.status === 'contacted').length,
    interested: statusCounts.filter(l => l.status === 'interested').length
  };
  
  return stats;
}

// Test connection
supabase.from('users').select('count').single()
  .then(() => console.log('✅ Supabase connection OK'))
  .catch(err => console.error('❌ Supabase connection failed:', err.message));
