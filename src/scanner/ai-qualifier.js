#!/usr/bin/env node

/**
 * AI Lead Qualification Engine
 * 
 * Uses OpenAI GPT-4o-mini to analyze Reddit posts and score them.
 * Extracts: intent score (1-10), business type, location, urgency
 * Generates personalized outreach message draft.
 * 
 * Task #65 — AI Lead Qualification
 */

import OpenAI from 'openai';

/**
 * Qualification prompt template
 */
function buildPrompt(lead) {
  return `You are a lead qualification assistant for business brokers.

Analyze the following Reddit post and determine if the author is interested in selling their business.

POST TITLE: ${lead.title}

POST CONTENT:
${lead.content || lead.title}

AUTHOR: u/${lead.author}
SUBREDDIT: r/${lead.subreddit}
POST URL: ${lead.url}
DATE POSTED: ${new Date(lead.posted_at).toLocaleDateString()}

Return ONLY a valid JSON object with this exact structure (no markdown, no explanation):
{
  "intent_score": <1-10, where 10 = actively listing business for sale RIGHT NOW, 8-9 = seriously exploring sale, 5-7 = frustrated/considering, 1-4 = just venting or hypothetical>,
  "business_type": "<e.g., 'e-commerce', 'restaurant', 'SaaS', 'retail', 'service business', 'manufacturing', 'unknown'>",
  "location": "<city/state/country if mentioned, else 'unknown'>",
  "urgency": "<'immediate' if selling now, 'soon' if 1-6 months, 'exploring' if considering, 'none' if just talking>",
  "reasoning": "<2-3 sentence explanation of your scoring>",
  "outreach_message": "<personalized DM template 2-3 sentences, friendly and helpful tone, reference specific details from their post>"
}

STRICT SCORING RULES:
- Score 9-10: ONLY if they explicitly say "I am selling" or "business is listed for sale" or "actively looking for buyers"
- Score 7-8: Clear intent to sell soon, specific timeline mentioned, asking for advice on selling process
- Score 5-6: Frustrated with business, considering exit, but no concrete timeline
- Score 1-4: Just venting, hypothetical scenarios, or talking about others selling

BE CONSERVATIVE. Most posts should score 4-6. Only clear, serious intent deserves 7+.`;
}

/**
 * Qualify a single lead using OpenAI
 */
async function qualifyLead(lead, openaiApiKey) {
  const openai = new OpenAI({ apiKey: openaiApiKey });
  
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are a lead qualification expert for business brokers. Return only valid JSON.'
        },
        {
          role: 'user',
          content: buildPrompt(lead)
        }
      ],
      temperature: 0.3, // Lower = more consistent scoring
      max_tokens: 500
    });
    
    const content = response.choices[0].message.content.trim();
    
    // Parse JSON response
    const analysis = JSON.parse(content);
    
    // Add tag based on score
    analysis.ai_tag = getTag(analysis.intent_score);
    
    return {
      ...lead,
      ...analysis
    };
    
  } catch (error) {
    console.error(`❌ Error qualifying lead ${lead.source_id}:`, error.message);
    
    // Return lead with error flag
    return {
      ...lead,
      qualification_error: error.message,
      intent_score: null,
      ai_tag: 'error'
    };
  }
}

/**
 * Tag leads based on intent score
 */
function getTag(score) {
  if (score >= 8) return 'hot';
  if (score >= 5) return 'warm';
  return 'cold';
}

/**
 * Batch qualify multiple leads
 */
async function qualifyBatch(leads, openaiApiKey) {
  console.log(`🤖 Qualifying ${leads.length} leads with OpenAI GPT-4o-mini...\n`);
  
  const qualified = [];
  
  for (let i = 0; i < leads.length; i++) {
    const lead = leads[i];
    
    console.log(`[${i + 1}/${leads.length}] Analyzing: ${lead.title.slice(0, 60)}...`);
    
    const result = await qualifyLead(lead, openaiApiKey);
    qualified.push(result);
    
    // Rate limiting: 1 request per second (well under OpenAI's limits)
    if (i < leads.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  return qualified;
}

/**
 * Display qualification results
 */
function displayResults(qualifiedLeads) {
  console.log('\n\n📊 Qualification Results:\n');
  
  const hot = qualifiedLeads.filter(l => l.ai_tag === 'hot');
  const warm = qualifiedLeads.filter(l => l.ai_tag === 'warm');
  const cold = qualifiedLeads.filter(l => l.ai_tag === 'cold');
  
  console.log(`🔥 Hot leads (8-10): ${hot.length}`);
  console.log(`🟡 Warm leads (5-7): ${warm.length}`);
  console.log(`❄️  Cold leads (1-4): ${cold.length}`);
  console.log('');
  
  // Show hot leads
  if (hot.length > 0) {
    console.log('\n🔥 HOT LEADS:\n');
    hot.forEach(lead => {
      console.log(`${lead.intent_score}/10 — ${lead.title}`);
      console.log(`   📍 ${lead.business_type} | ${lead.location} | ${lead.urgency}`);
      console.log(`   💬 "${lead.reasoning}"`);
      console.log(`   📧 Outreach: "${lead.outreach_message}"`);
      console.log(`   🔗 ${lead.url}`);
      console.log('');
    });
  }
  
  // Show top 3 warm leads
  if (warm.length > 0) {
    console.log('\n🟡 TOP WARM LEADS:\n');
    warm.slice(0, 3).forEach(lead => {
      console.log(`${lead.intent_score}/10 — ${lead.title}`);
      console.log(`   📍 ${lead.business_type} | ${lead.location}`);
      console.log(`   💬 "${lead.reasoning}"`);
      console.log('');
    });
  }
}

/**
 * Test with sample lead
 */
async function testQualification() {
  const sampleLead = {
    source: 'reddit',
    source_id: 'test123',
    author: 'test_user',
    title: 'Tired of running my e-commerce business, looking to sell',
    content: `I've been running an online store selling pet supplies for 5 years. Revenue is around $500k/year but I'm burned out. I want to exit in the next 6 months and focus on other projects. Anyone have advice on how to value it?`,
    url: 'https://reddit.com/r/smallbusiness/test',
    subreddit: 'smallbusiness',
    posted_at: new Date().toISOString()
  };
  
  const apiKey = process.env.OPENAI_API_KEY;
  
  if (!apiKey) {
    console.error('❌ OPENAI_API_KEY not set in environment');
    process.exit(1);
  }
  
  console.log('🧪 Testing AI qualification with sample lead...\n');
  
  const result = await qualifyLead(sampleLead, apiKey);
  
  console.log('✅ Qualification result:\n');
  console.log(JSON.stringify(result, null, 2));
}

// Export functions
export { qualifyLead, qualifyBatch, displayResults, buildPrompt };

// Run test if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  testQualification().catch(console.error);
}
