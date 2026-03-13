#!/usr/bin/env node

/**
 * Quick test of Reddit scanner
 */

import fetch from 'node-fetch';

async function testScan() {
  const subreddit = 'smallbusiness';
  const keyword = 'selling business';
  
  console.log(`🔍 Testing Arctic Shift API...`);
  console.log(`   Searching r/${subreddit} for "${keyword}"\n`);
  
  const url = `https://arctic-shift.photon-reddit.com/api/posts/search?subreddit=${subreddit}&query=${encodeURIComponent(keyword)}&sort=desc&limit=10`;
  
  const response = await fetch(url);
  const data = await response.json();
  
  const posts = data.data || [];
  console.log(`✅ Found ${posts.length} posts\n`);
  
  // Show first 3
  posts.slice(0, 3).forEach((post, i) => {
    console.log(`${i + 1}. ${post.title}`);
    console.log(`   👤 u/${post.author} | r/${post.subreddit}`);
    console.log(`   🗓️ ${new Date(post.created_utc * 1000).toLocaleDateString()}`);
    console.log(`   🔗 https://reddit.com${post.permalink}`);
    
    if (post.selftext) {
      const snippet = post.selftext.slice(0, 100);
      console.log(`   📝 ${snippet}...`);
    }
    console.log('');
  });
  
  // Test deduplication and date filtering
  const cutoff = Math.floor(Date.now() / 1000) - (7 * 24 * 60 * 60);
  const recent = posts.filter(p => p.created_utc >= cutoff);
  console.log(`📊 Posts from last 7 days: ${recent.length}/${posts.length}`);
  
  return recent;
}

testScan().catch(console.error);
