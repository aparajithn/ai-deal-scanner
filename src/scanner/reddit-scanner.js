#!/usr/bin/env node

/**
 * Reddit Scanner — AI Deal Scanner MVP
 * 
 * Scans Reddit for business sale signals using Arctic Shift API.
 * Detects keywords like "tired of", "selling business", "looking to exit".
 * 
 * Task #64 — Reddit Scanner
 */

import fetch from 'node-fetch';

// Test configuration (will come from Supabase scan_configs in production)
const CONFIG = {
  subreddits: ['smallbusiness', 'Entrepreneur'],
  keywords: [
    'tired of',
    'selling business',
    'want out',
    'looking to exit',
    'ready to sell',
    'need to sell',
    'selling my business'
  ],
  daysBack: 7, // Only scan posts from last 7 days
  maxPostsPerSubreddit: 50
};

/**
 * Fetch posts from Arctic Shift API
 */
async function searchReddit(subreddit, keyword) {
  const url = `https://arctic-shift.photon-reddit.com/api/posts/search?subreddit=${subreddit}&query=${encodeURIComponent(keyword)}&sort=desc&limit=25`;
  
  console.log(`🔍 Searching r/${subreddit} for "${keyword}"...`);
  
  try {
    const response = await fetch(url);
    
    if (!response.ok) {
      console.error(`❌ Arctic Shift API error: ${response.status} ${response.statusText}`);
      return [];
    }
    
    const data = await response.json();
    
    // Arctic Shift returns { data: [...] }
    const posts = data.data || [];
    console.log(`   Found ${posts.length} posts`);
    
    return posts;
  } catch (error) {
    console.error(`❌ Error fetching from Arctic Shift:`, error.message);
    return [];
  }
}

/**
 * Filter posts by date (last N days)
 */
function filterByDate(posts, daysBack) {
  const cutoffTimestamp = Math.floor(Date.now() / 1000) - (daysBack * 24 * 60 * 60);
  
  return posts.filter(post => {
    const postTime = post.created_utc || 0;
    return postTime >= cutoffTimestamp;
  });
}

/**
 * Extract relevant data from Reddit post
 */
function extractLeadData(post, keyword) {
  return {
    source: 'reddit',
    source_id: post.id,
    author: post.author,
    title: post.title,
    content: post.selftext || post.title, // selftext is body, fallback to title
    url: `https://reddit.com${post.permalink}`,
    subreddit: post.subreddit,
    posted_at: new Date(post.created_utc * 1000).toISOString(),
    matched_keyword: keyword,
    upvotes: post.score,
    num_comments: post.num_comments
  };
}

/**
 * Deduplicate posts (by source_id)
 */
function deduplicate(leads) {
  const seen = new Set();
  return leads.filter(lead => {
    if (seen.has(lead.source_id)) {
      return false;
    }
    seen.add(lead.source_id);
    return true;
  });
}

/**
 * Main scanner function
 */
async function scanReddit() {
  console.log('🚀 Starting Reddit scan...\n');
  console.log(`📋 Config:`);
  console.log(`   Subreddits: ${CONFIG.subreddits.join(', ')}`);
  console.log(`   Keywords: ${CONFIG.keywords.length} keywords`);
  console.log(`   Days back: ${CONFIG.daysBack}`);
  console.log('');
  
  const allLeads = [];
  
  // Scan each subreddit
  for (const subreddit of CONFIG.subreddits) {
    console.log(`\n📂 Scanning r/${subreddit}...`);
    
    // Try each keyword
    for (const keyword of CONFIG.keywords) {
      const posts = await searchReddit(subreddit, keyword);
      const recentPosts = filterByDate(posts, CONFIG.daysBack);
      
      // Convert to lead format
      const leads = recentPosts.map(post => extractLeadData(post, keyword));
      allLeads.push(...leads);
      
      // Rate limiting: wait 1 second between requests
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  console.log(`\n\n📊 Scan Results:`);
  console.log(`   Total posts found: ${allLeads.length}`);
  
  // Deduplicate
  const uniqueLeads = deduplicate(allLeads);
  console.log(`   Unique posts: ${uniqueLeads.length}`);
  
  // Sort by date (newest first)
  uniqueLeads.sort((a, b) => new Date(b.posted_at) - new Date(a.posted_at));
  
  return uniqueLeads;
}

/**
 * Display leads in terminal
 */
function displayLeads(leads) {
  console.log('\n\n🎯 Top Leads:\n');
  
  leads.slice(0, 10).forEach((lead, index) => {
    console.log(`${index + 1}. [r/${lead.subreddit}] ${lead.title}`);
    console.log(`   👤 u/${lead.author} | 🗓️ ${new Date(lead.posted_at).toLocaleDateString()}`);
    console.log(`   🔑 Matched: "${lead.matched_keyword}"`);
    console.log(`   🔗 ${lead.url}`);
    
    // Show snippet of content
    const snippet = (lead.content || lead.title).slice(0, 150);
    console.log(`   📝 ${snippet}${lead.content.length > 150 ? '...' : ''}`);
    console.log('');
  });
  
  if (leads.length > 10) {
    console.log(`... and ${leads.length - 10} more leads\n`);
  }
}

/**
 * Save leads to JSON file (for testing)
 */
async function saveToFile(leads, filename = 'leads.json') {
  const fs = await import('fs/promises');
  await fs.writeFile(filename, JSON.stringify(leads, null, 2));
  console.log(`✅ Saved ${leads.length} leads to ${filename}`);
}

// Run scanner
if (import.meta.url === `file://${process.argv[1]}`) {
  scanReddit()
    .then(leads => {
      displayLeads(leads);
      return saveToFile(leads, 'reddit-leads.json');
    })
    .catch(error => {
      console.error('❌ Scanner failed:', error);
      process.exit(1);
    });
}

export { scanReddit, searchReddit, extractLeadData, deduplicate };
