/**
 * AI Deal Scanner - Background Cron Job
 * 
 * Runs every 6 hours (configurable per user).
 * Scans Reddit for all active users, qualifies leads with AI.
 */

import { searchReddit, extractLeadData, filterByDate } from './reddit-scanner.js';
import { qualifyLead } from './ai-qualifier.js';
import {
  getActiveUsers,
  saveRawLead,
  getUnqualifiedLeads,
  updateLeadWithAI,
  leadExists
} from './db.js';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

if (!OPENAI_API_KEY) {
  console.error('❌ OPENAI_API_KEY not set');
  process.exit(1);
}

/**
 * Scan and qualify leads for a single user
 */
async function scanAndQualifyForUser(userConfig) {
  const userId = userConfig.user_id;
  const email = userConfig.users?.email || 'unknown';
  const subreddits = userConfig.subreddits || ['smallbusiness', 'Entrepreneur'];
  const keywords = userConfig.keywords || ['tired of', 'selling business', 'want out'];
  
  console.log(`\n👤 Processing user: ${email}`);
  console.log(`   Subreddits: ${subreddits.join(', ')}`);
  console.log(`   Keywords: ${keywords.length} keywords`);
  
  let newLeadsCount = 0;
  let qualifiedCount = 0;
  const errors = [];
  
  try {
    // Step 1: Scan Reddit for new posts
    console.log('   📡 Scanning Reddit...');
    
    for (const subreddit of subreddits) {
      for (const keyword of keywords) {
        try {
          // Fetch posts from Reddit
          const posts = await searchReddit(subreddit, keyword);
          const recentPosts = filterByDate(posts, 7); // Last 7 days
          
          // Process each post
          for (const post of recentPosts) {
            // Check if we already have this lead
            const exists = await leadExists(userId, post.id);
            if (exists) continue;
            
            // Extract lead data
            const leadData = extractLeadData(post, keyword);
            
            // Save to database
            const saved = await saveRawLead(userId, leadData);
            if (saved) {
              newLeadsCount++;
              console.log(`      ✅ New lead: ${leadData.title.slice(0, 50)}...`);
            }
          }
          
          // Rate limiting
          await new Promise(resolve => setTimeout(resolve, 1500));
          
        } catch (error) {
          console.error(`      ❌ Error scanning r/${subreddit} for "${keyword}":`, error.message);
          errors.push(`Reddit scan error: ${error.message}`);
        }
      }
    }
    
    console.log(`   📊 Found ${newLeadsCount} new leads`);
    
    // Step 2: Qualify unqualified leads with AI
    console.log('   🤖 Qualifying leads with AI...');
    
    const unqualifiedLeads = await getUnqualifiedLeads(userId, 50); // Max 50 per run
    console.log(`   Found ${unqualifiedLeads.length} leads to qualify`);
    
    for (const lead of unqualifiedLeads) {
      try {
        // Run AI qualification
        const qualified = await qualifyLead(lead, OPENAI_API_KEY);
        
        // Update database with AI results
        await updateLeadWithAI(lead.id, {
          intent_score: qualified.intent_score,
          ai_tag: qualified.ai_tag,
          business_type: qualified.business_type,
          location: qualified.location,
          urgency: qualified.urgency,
          reasoning: qualified.reasoning,
          outreach_message: qualified.outreach_message,
          qualification_error: qualified.qualification_error
        });
        
        qualifiedCount++;
        
        if (qualified.intent_score >= 8) {
          console.log(`      🔥 HOT LEAD (${qualified.intent_score}/10): ${lead.title.slice(0, 50)}...`);
        }
        
        // Rate limiting for OpenAI
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (error) {
        console.error(`      ❌ Error qualifying lead ${lead.id}:`, error.message);
        errors.push(`AI qualification error: ${error.message}`);
        
        // Save error to database
        await updateLeadWithAI(lead.id, {
          qualification_error: error.message,
          ai_tag: 'error'
        });
      }
    }
    
    console.log(`   ✅ Qualified ${qualifiedCount} leads`);
    
    return {
      success: true,
      new_leads: newLeadsCount,
      qualified: qualifiedCount,
      errors: errors.length > 0 ? errors : undefined
    };
    
  } catch (error) {
    console.error(`   ❌ Fatal error for user ${email}:`, error);
    return {
      success: false,
      error: error.message,
      new_leads: newLeadsCount,
      qualified: qualifiedCount
    };
  }
}

/**
 * Main cron job - runs for all active users
 */
async function runScanJob() {
  console.log('\n🚀 AI Deal Scanner - Cron Job Started');
  console.log(`   Time: ${new Date().toISOString()}`);
  console.log('');
  
  try {
    // Get all users with enabled scanning
    const users = await getActiveUsers();
    
    if (users.length === 0) {
      console.log('⚠️  No active users found. Exiting.');
      return;
    }
    
    console.log(`📋 Found ${users.length} active user(s)\n`);
    
    const results = [];
    
    // Process each user
    for (const userConfig of users) {
      const result = await scanAndQualifyForUser(userConfig);
      results.push({
        email: userConfig.users?.email,
        ...result
      });
      
      // Pause between users to avoid rate limits
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    // Summary
    console.log('\n\n📊 SCAN JOB SUMMARY:');
    console.log('─────────────────────────────────────────');
    
    let totalNewLeads = 0;
    let totalQualified = 0;
    
    results.forEach(r => {
      totalNewLeads += r.new_leads || 0;
      totalQualified += r.qualified || 0;
      
      console.log(`\n${r.email}:`);
      console.log(`  New leads: ${r.new_leads || 0}`);
      console.log(`  Qualified: ${r.qualified || 0}`);
      if (r.errors) {
        console.log(`  Errors: ${r.errors.length}`);
      }
    });
    
    console.log('\n─────────────────────────────────────────');
    console.log(`Total new leads: ${totalNewLeads}`);
    console.log(`Total qualified: ${totalQualified}`);
    console.log('\n✅ Scan job completed successfully\n');
    
  } catch (error) {
    console.error('\n❌ Scan job failed:', error);
    process.exit(1);
  }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runScanJob()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

export { runScanJob, scanAndQualifyForUser };
