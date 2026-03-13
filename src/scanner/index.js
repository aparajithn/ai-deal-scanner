/**
 * AI Deal Scanner - Express API Server
 * 
 * Provides API endpoints for manual scan triggers and health checks.
 * Deployed on Render.com
 */

import express from 'express';
import cors from 'cors';
import { scanAndQualifyForUser } from './cron.js';
import { getActiveUsers } from './db.js';

const app = express();
const PORT = process.env.PORT || 3000;
const RENDER_API_KEY = process.env.RENDER_API_KEY;

// Middleware
app.use(cors());
app.use(express.json());

/**
 * Health check endpoint
 */
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'ai-deal-scanner',
    timestamp: new Date().toISOString(),
    env: {
      supabase: !!process.env.SUPABASE_URL,
      openai: !!process.env.OPENAI_API_KEY,
      render_api_key: !!process.env.RENDER_API_KEY
    }
  });
});

/**
 * GET /api/active-users
 * Returns count of users with scanning enabled
 */
app.get('/api/active-users', async (req, res) => {
  try {
    const users = await getActiveUsers();
    res.json({
      count: users.length,
      users: users.map(u => ({
        email: u.users.email,
        subreddits: u.subreddits?.length || 0,
        keywords: u.keywords?.length || 0
      }))
    });
  } catch (error) {
    console.error('Error fetching active users:', error);
    res.status(500).json({ error: 'Failed to fetch active users' });
  }
});

/**
 * POST /api/scan
 * Trigger manual scan (requires API key auth)
 * 
 * Headers:
 *   X-API-Key: <RENDER_API_KEY>
 * 
 * Body (optional):
 *   { "userId": "<uuid>" }  // Scan specific user, or all if not provided
 */
app.post('/api/scan', async (req, res) => {
  // Check API key
  const apiKey = req.headers['x-api-key'];
  
  if (!apiKey || apiKey !== RENDER_API_KEY) {
    return res.status(401).json({ error: 'Unauthorized: Invalid or missing API key' });
  }
  
  const { userId } = req.body;
  
  try {
    if (userId) {
      // Scan specific user
      console.log(`🔍 Manual scan triggered for user ${userId}`);
      
      const result = await scanAndQualifyForUser({
        user_id: userId,
        users: { email: 'manual-trigger' }
      });
      
      res.json({
        status: 'completed',
        userId,
        ...result
      });
    } else {
      // Scan all active users
      console.log('🔍 Manual scan triggered for ALL active users');
      
      const users = await getActiveUsers();
      const results = [];
      
      for (const userConfig of users) {
        const result = await scanAndQualifyForUser(userConfig);
        results.push({
          userId: userConfig.user_id,
          email: userConfig.users.email,
          ...result
        });
      }
      
      res.json({
        status: 'completed',
        scanned_users: results.length,
        results
      });
    }
  } catch (error) {
    console.error('Error during manual scan:', error);
    res.status(500).json({
      status: 'error',
      error: error.message
    });
  }
});

/**
 * GET /
 * Root endpoint - API info
 */
app.get('/', (req, res) => {
  res.json({
    name: 'AI Deal Scanner API',
    version: '1.0.0',
    description: 'Reddit lead scanner with AI qualification',
    endpoints: {
      'GET /health': 'Health check',
      'GET /api/active-users': 'Get active users count',
      'POST /api/scan': 'Trigger manual scan (requires X-API-Key header)'
    },
    repository: 'https://github.com/aparajithn/ai-deal-scanner'
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 AI Deal Scanner API listening on port ${PORT}`);
  console.log(`   Health check: http://localhost:${PORT}/health`);
  console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);
});

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  process.exit(0);
});

export default app;
