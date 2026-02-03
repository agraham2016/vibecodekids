import express from 'express';
import cors from 'cors';
import Anthropic from '@anthropic-ai/sdk';
import Stripe from 'stripe';
import dotenv from 'dotenv';
import { randomBytes, createHash } from 'crypto';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer } from 'http';
import { getSystemPrompt, getContentFilter, sanitizeOutput } from './prompts.js';
import { initMultiplayer, getRoomInfo, getActiveRooms } from './multiplayer.js';

// Load environment variables
dotenv.config();

// Initialize Stripe
const stripe = process.env.STRIPE_SECRET_KEY 
  ? new Stripe(process.env.STRIPE_SECRET_KEY)
  : null;

// Stripe Price IDs
const STRIPE_PRICES = {
  creator: process.env.STRIPE_CREATOR_PRICE_ID || 'price_1Swp0yFORYWq7U9VvV0bCabA',
  pro: process.env.STRIPE_PRO_PRICE_ID || 'price_1Swp2cFORYWq7U9VF15M6NY8'
};

// Base URL for redirects (trim whitespace and remove trailing slash)
const BASE_URL = (process.env.BASE_URL || 'https://vibecodekidz.org').trim().replace(/\/+$/, '');
console.log('📍 BASE_URL configured as:', JSON.stringify(BASE_URL));
console.log('📍 Stripe initialized:', stripe ? 'YES' : 'NO');

// Simple password hashing (for production, use bcrypt)
function hashPassword(password) {
  return createHash('sha256').update(password).digest('hex');
}

// ========== MEMBERSHIP TIER SYSTEM ==========

const MEMBERSHIP_TIERS = {
  free: {
    name: "Free",
    price: 0,
    gamesPerMonth: 3,
    promptsPerDay: 30,
    playsPerDay: 50,
    aiCoversPerMonth: 0,
    aiSpritesPerMonth: 0,
    canAccessPremiumAssets: false
  },
  creator: {
    name: "Creator",
    price: 7,
    gamesPerMonth: 25,
    promptsPerDay: 150,
    playsPerDay: Infinity,
    aiCoversPerMonth: 5,
    aiSpritesPerMonth: 0,
    canAccessPremiumAssets: true,
    stripePriceId: STRIPE_PRICES.creator
  },
  pro: {
    name: "Pro",
    price: 14,
    gamesPerMonth: 50,
    promptsPerDay: 300,
    playsPerDay: Infinity,
    aiCoversPerMonth: 20,
    aiSpritesPerMonth: 10,
    canAccessPremiumAssets: true,
    stripePriceId: STRIPE_PRICES.pro
  }
};

const RATE_LIMITS = {
  promptsPerMinute: 5,      // Max 5 AI requests per minute
  promptsPerHour: 30,       // Max 30 AI requests per hour
  cooldownMinutes: 5        // Must wait 5 min after hitting limit
};

// Helper to check and reset daily/monthly counters
function checkAndResetCounters(user) {
  const now = new Date();
  const today = now.toISOString().split('T')[0];
  const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  
  // Reset daily counters if new day
  if (!user.dailyResetDate || !user.dailyResetDate.startsWith(today)) {
    user.promptsToday = 0;
    user.playsToday = 0;
    user.dailyResetDate = now.toISOString();
  }
  
  // Reset monthly counters if new month
  const userMonth = user.monthlyResetDate ? user.monthlyResetDate.substring(0, 7) : '';
  if (userMonth !== thisMonth) {
    user.gamesCreatedThisMonth = 0;
    user.aiCoversUsedThisMonth = 0;
    user.aiSpritesUsedThisMonth = 0;
    user.monthlyResetDate = now.toISOString();
  }
  
  return user;
}

// Helper to get user's tier limits
function getUserLimits(user) {
  const tier = user.membershipTier || 'free';
  return MEMBERSHIP_TIERS[tier] || MEMBERSHIP_TIERS.free;
}

// Helper to calculate remaining usage
function calculateUsageRemaining(user) {
  const limits = getUserLimits(user);
  user = checkAndResetCounters(user);
  
  return {
    tier: user.membershipTier || 'free',
    tierName: limits.name,
    gamesRemaining: Math.max(0, limits.gamesPerMonth - (user.gamesCreatedThisMonth || 0)),
    gamesLimit: limits.gamesPerMonth,
    promptsRemaining: Math.max(0, limits.promptsPerDay - (user.promptsToday || 0)),
    promptsLimit: limits.promptsPerDay,
    aiCoversRemaining: Math.max(0, limits.aiCoversPerMonth - (user.aiCoversUsedThisMonth || 0)),
    aiCoversLimit: limits.aiCoversPerMonth,
    canAccessPremiumAssets: limits.canAccessPremiumAssets
  };
}

// Generate session token
function generateToken() {
  return randomBytes(32).toString('hex');
}

// In-memory session store (for production, use Redis or database)
const sessions = new Map();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// Projects storage path
const PROJECTS_DIR = path.join(__dirname, '..', 'data', 'projects');
// Users storage path
const USERS_DIR = path.join(__dirname, '..', 'data', 'users');

// Ensure data directories exist
async function ensureDataDirs() {
  try {
    await fs.mkdir(PROJECTS_DIR, { recursive: true });
    await fs.mkdir(USERS_DIR, { recursive: true });
  } catch (err) {
    // Directories already exist
  }
}
ensureDataDirs();

// Initialize Anthropic client
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

app.use(cors());
app.use(express.json());

// Check if running in production (built frontend exists)
const distPath = path.join(__dirname, '..', 'dist');
const isProduction = await fs.access(distPath).then(() => true).catch(() => false);

// Serve static files from public folder (gallery, play, admin pages)
app.use(express.static(path.join(__dirname, '..', 'public')));

// In production, serve the built React app
if (isProduction) {
  app.use(express.static(distPath));
}

// Serve play page for /play/:id routes
app.get('/play/:id', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'play.html'));
});

// Serve gallery page
app.get('/gallery', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'gallery.html'));
});

// Serve admin page
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'admin.html'));
});

// ========== RATE LIMITING MIDDLEWARE ==========

// Check rate limits for API calls
async function checkRateLimits(userId) {
  if (!userId) return { allowed: true }; // Anonymous users handled differently
  
  const userPath = path.join(USERS_DIR, `${userId}.json`);
  
  try {
    const data = await fs.readFile(userPath, 'utf-8');
    let user = JSON.parse(data);
    const now = Date.now();
    
    // Check if user is in cooldown
    if (user.rateLimitedUntil && now < new Date(user.rateLimitedUntil).getTime()) {
      const waitSeconds = Math.ceil((new Date(user.rateLimitedUntil).getTime() - now) / 1000);
      return { 
        allowed: false, 
        reason: 'cooldown',
        waitSeconds,
        message: `Slow down! Take a ${Math.ceil(waitSeconds / 60)}-minute break and try again.`
      };
    }
    
    // Clean old requests (keep last 60 minutes)
    user.recentRequests = (user.recentRequests || [])
      .filter(ts => now - ts < 60 * 60 * 1000);
    
    // Check per-minute limit
    const lastMinuteRequests = user.recentRequests.filter(ts => now - ts < 60 * 1000);
    if (lastMinuteRequests.length >= RATE_LIMITS.promptsPerMinute) {
      user.rateLimitedUntil = new Date(now + RATE_LIMITS.cooldownMinutes * 60 * 1000).toISOString();
      await fs.writeFile(userPath, JSON.stringify(user, null, 2));
      return { 
        allowed: false, 
        reason: 'rate_limit',
        message: 'Whoa, slow down! 🐢 Take a 5-minute break and come back with fresh ideas!'
      };
    }
    
    // Check per-hour limit
    const lastHourRequests = user.recentRequests.filter(ts => now - ts < 60 * 60 * 1000);
    if (lastHourRequests.length >= RATE_LIMITS.promptsPerHour) {
      return { 
        allowed: false, 
        reason: 'hourly_limit',
        message: "You've been super creative this hour! 🌟 Take a short break and come back soon."
      };
    }
    
    // Track this request
    user.recentRequests.push(now);
    await fs.writeFile(userPath, JSON.stringify(user, null, 2));
    
    return { allowed: true };
    
  } catch (error) {
    // If user file doesn't exist or error, allow the request
    return { allowed: true };
  }
}

// Check tier limits for a specific action
async function checkTierLimits(userId, action) {
  if (!userId) {
    // Anonymous users get very limited access
    return { 
      allowed: false, 
      reason: 'login_required',
      message: 'Please log in to create games! It only takes a minute. 🚀'
    };
  }
  
  const userPath = path.join(USERS_DIR, `${userId}.json`);
  
  try {
    const data = await fs.readFile(userPath, 'utf-8');
    let user = JSON.parse(data);
    user = checkAndResetCounters(user);
    
    const limits = getUserLimits(user);
    
    if (action === 'generate') {
      // Check daily prompt limit
      if ((user.promptsToday || 0) >= limits.promptsPerDay) {
        return { 
          allowed: false, 
          reason: 'daily_limit',
          message: `You've used all ${limits.promptsPerDay} prompts for today! 🌙 Come back tomorrow for more creating.`,
          upgradeRequired: true
        };
      }
      
      // Check monthly game limit (counted when saving, not generating)
      // But warn if close to limit
      const gamesRemaining = limits.gamesPerMonth - (user.gamesCreatedThisMonth || 0);
      
      return { 
        allowed: true, 
        user,
        gamesRemaining,
        promptsRemaining: limits.promptsPerDay - (user.promptsToday || 0)
      };
    }
    
    if (action === 'save_game') {
      if ((user.gamesCreatedThisMonth || 0) >= limits.gamesPerMonth) {
        return { 
          allowed: false, 
          reason: 'monthly_limit',
          message: `You've created ${limits.gamesPerMonth} games this month! 🎮 Upgrade to create more.`,
          upgradeRequired: true
        };
      }
      return { allowed: true, user };
    }
    
    if (action === 'ai_cover') {
      if (limits.aiCoversPerMonth === 0) {
        return { 
          allowed: false, 
          reason: 'tier_required',
          message: 'AI Cover Art is a Creator feature! ✨ Upgrade to unlock.',
          upgradeRequired: true
        };
      }
      if ((user.aiCoversUsedThisMonth || 0) >= limits.aiCoversPerMonth) {
        return { 
          allowed: false, 
          reason: 'monthly_limit',
          message: `You've used all ${limits.aiCoversPerMonth} AI covers this month.`,
          upgradeRequired: true
        };
      }
      return { allowed: true, user };
    }
    
    return { allowed: true, user };
    
  } catch (error) {
    return { allowed: false, reason: 'error', message: 'Could not verify your account.' };
  }
}

// Increment usage counter
async function incrementUsage(userId, action) {
  if (!userId) return;
  
  const userPath = path.join(USERS_DIR, `${userId}.json`);
  
  try {
    const data = await fs.readFile(userPath, 'utf-8');
    let user = JSON.parse(data);
    user = checkAndResetCounters(user);
    
    if (action === 'generate') {
      user.promptsToday = (user.promptsToday || 0) + 1;
    } else if (action === 'save_game') {
      user.gamesCreatedThisMonth = (user.gamesCreatedThisMonth || 0) + 1;
    } else if (action === 'ai_cover') {
      user.aiCoversUsedThisMonth = (user.aiCoversUsedThisMonth || 0) + 1;
    }
    
    await fs.writeFile(userPath, JSON.stringify(user, null, 2));
  } catch (error) {
    console.error('Error incrementing usage:', error);
  }
}

// Content filtering middleware
const filterContent = (content) => {
  const blockedPatterns = getContentFilter();
  const lowerContent = content.toLowerCase();
  
  for (const pattern of blockedPatterns) {
    if (lowerContent.includes(pattern)) {
      return {
        blocked: true,
        reason: "Let's keep our creations fun and friendly! Try asking about something else you'd like to build."
      };
    }
  }
  
  return { blocked: false };
};

// Helper to format message content for Claude (with optional image)
function formatMessageContent(text, imageBase64) {
  if (!imageBase64) {
    return text;
  }

  // Extract the media type and base64 data from data URL
  const matches = imageBase64.match(/^data:([^;]+);base64,(.+)$/);
  if (!matches) {
    return text;
  }

  const mediaType = matches[1];
  const base64Data = matches[2];

  // Return array format for multimodal content
  return [
    {
      type: 'image',
      source: {
        type: 'base64',
        media_type: mediaType,
        data: base64Data
      }
    },
    {
      type: 'text',
      text: text
    }
  ];
}

// Main generation endpoint
app.post('/api/generate', async (req, res) => {
  try {
    const { message, image, currentCode, conversationHistory = [] } = req.body;

    // Get user from session if logged in
    const token = req.headers.authorization?.replace('Bearer ', '');
    let userId = null;
    
    if (token) {
      const session = sessions.get(token);
      if (session) {
        userId = session.userId;
      }
    }
    
    // Check rate limits (anti-bot protection)
    const rateLimitCheck = await checkRateLimits(userId);
    if (!rateLimitCheck.allowed) {
      return res.status(429).json({
        message: rateLimitCheck.message,
        code: null,
        rateLimited: true,
        waitSeconds: rateLimitCheck.waitSeconds
      });
    }
    
    // Check tier limits
    const tierCheck = await checkTierLimits(userId, 'generate');
    if (!tierCheck.allowed) {
      return res.status(403).json({
        message: tierCheck.message,
        code: null,
        upgradeRequired: tierCheck.upgradeRequired,
        reason: tierCheck.reason
      });
    }

    // Content filter check
    const contentCheck = filterContent(message);
    if (contentCheck.blocked) {
      return res.json({
        message: contentCheck.reason,
        code: null
      });
    }

    // Build conversation with system prompt
    const systemPrompt = getSystemPrompt(currentCode);
    
    // Format conversation history for Claude (with image support)
    const messages = [
      ...conversationHistory.map(msg => ({
        role: msg.role,
        content: formatMessageContent(msg.content, msg.image)
      })),
      {
        role: 'user',
        content: formatMessageContent(message, image)
      }
    ];

    // Call Claude API
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      system: systemPrompt,
      messages: messages
    });

    // Increment usage counter after successful generation
    await incrementUsage(userId, 'generate');

    // Extract response
    const assistantMessage = response.content[0].text;
    
    // Parse code from response if present
    let code = null;
    const codeMatch = assistantMessage.match(/```html\n([\s\S]*?)```/);
    if (codeMatch) {
      code = codeMatch[1].trim();
    } else {
      // Check for full HTML without code blocks
      const htmlMatch = assistantMessage.match(/<!DOCTYPE html>[\s\S]*<\/html>/i);
      if (htmlMatch) {
        code = htmlMatch[0];
      }
    }

    // Sanitize the output message
    const cleanMessage = sanitizeOutput(assistantMessage);

    // Include usage info in response
    const usage = userId ? calculateUsageRemaining(tierCheck.user) : null;

    res.json({
      message: cleanMessage,
      code: code,
      usage: usage
    });

  } catch (error) {
    console.error('API Error:', error);
    
    // Kid-friendly error message
    res.status(500).json({
      message: "Oops! My brain got a little confused. 🤔 Can you try asking me again?",
      code: null
    });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Vibe Code Studio server is running! 🚀' });
});

// ========== PROJECT SHARING API ==========

// Generate a short, kid-friendly ID
function generateProjectId() {
  const chars = 'abcdefghjkmnpqrstuvwxyz23456789'; // No confusing chars like 0/O, 1/l
  let id = '';
  const bytes = randomBytes(6);
  for (let i = 0; i < 6; i++) {
    id += chars[bytes[i] % chars.length];
  }
  return id;
}

// Save a project
app.post('/api/projects', async (req, res) => {
  try {
    const { title, code, creatorName, isPublic = false, category = 'other', multiplayer = false } = req.body;
    
    if (!code || !title) {
      return res.status(400).json({ error: 'Title and code are required' });
    }
    
    // Content filter the title and creator name
    const titleCheck = filterContent(title);
    if (titleCheck.blocked) {
      return res.status(400).json({ error: 'Please choose a different title' });
    }
    
    // Check if user is logged in
    const token = req.headers.authorization?.replace('Bearer ', '');
    let userId = null;
    let displayName = creatorName || 'Anonymous';
    
    if (token) {
      const session = sessions.get(token);
      if (session) {
        userId = session.userId;
        displayName = session.displayName;
        
        // Check tier limits for saving games
        const tierCheck = await checkTierLimits(userId, 'save_game');
        if (!tierCheck.allowed) {
          return res.status(403).json({ 
            error: tierCheck.message,
            upgradeRequired: tierCheck.upgradeRequired
          });
        }
      }
    }
    
    const id = generateProjectId();
    const project = {
      id,
      title: title.slice(0, 50), // Limit title length
      code,
      creatorName: displayName.slice(0, 30),
      userId: userId, // Link to user account if logged in
      isPublic: Boolean(isPublic),
      multiplayer: Boolean(multiplayer), // Enable multiplayer for this project
      category: category || 'other',
      createdAt: new Date().toISOString(),
      views: 0,
      likes: 0
    };
    
    await fs.writeFile(
      path.join(PROJECTS_DIR, `${id}.json`),
      JSON.stringify(project, null, 2)
    );
    
    // Increment game counter for logged-in users
    if (userId) {
      await incrementUsage(userId, 'save_game');
    }
    
    // Get updated usage info
    let usage = null;
    if (userId) {
      const userPath = path.join(USERS_DIR, `${userId}.json`);
      try {
        const userData = await fs.readFile(userPath, 'utf-8');
        const user = JSON.parse(userData);
        usage = calculateUsageRemaining(user);
      } catch (e) {
        // Ignore errors
      }
    }
    
    res.json({ 
      success: true, 
      id,
      shareUrl: `/play/${id}`,
      usage: usage
    });
    
  } catch (error) {
    console.error('Save project error:', error);
    res.status(500).json({ error: 'Could not save project' });
  }
});

// Get a single project
app.get('/api/projects/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Sanitize ID to prevent path traversal
    if (!/^[a-z0-9]{6}$/.test(id)) {
      return res.status(400).json({ error: 'Invalid project ID' });
    }
    
    const projectPath = path.join(PROJECTS_DIR, `${id}.json`);
    const data = await fs.readFile(projectPath, 'utf-8');
    const project = JSON.parse(data);
    
    // Increment view count
    project.views = (project.views || 0) + 1;
    await fs.writeFile(projectPath, JSON.stringify(project, null, 2));
    
    res.json(project);
    
  } catch (error) {
    if (error.code === 'ENOENT') {
      return res.status(404).json({ error: 'Project not found' });
    }
    console.error('Get project error:', error);
    res.status(500).json({ error: 'Could not load project' });
  }
});

// Get gallery (public projects)
app.get('/api/gallery', async (req, res) => {
  try {
    const { category, limit = 50 } = req.query;
    
    const files = await fs.readdir(PROJECTS_DIR);
    const projects = [];
    
    for (const file of files) {
      if (!file.endsWith('.json')) continue;
      
      try {
        const data = await fs.readFile(path.join(PROJECTS_DIR, file), 'utf-8');
        const project = JSON.parse(data);
        
        // Only include public projects
        if (project.isPublic) {
          // Filter by category if specified
          if (!category || project.category === category) {
            // Don't send the full code to gallery listing (save bandwidth)
            projects.push({
              id: project.id,
              title: project.title,
              creatorName: project.creatorName,
              ageMode: project.ageMode,
              category: project.category,
              multiplayer: project.multiplayer || false,
              createdAt: project.createdAt,
              views: project.views || 0,
              likes: project.likes || 0
            });
          }
        }
      } catch (err) {
        // Skip invalid files
      }
    }
    
    // Sort by newest first
    projects.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    
    // Limit results
    res.json(projects.slice(0, parseInt(limit)));
    
  } catch (error) {
    console.error('Gallery error:', error);
    res.status(500).json({ error: 'Could not load gallery' });
  }
});

// Like a project
app.post('/api/projects/:id/like', async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!/^[a-z0-9]{6}$/.test(id)) {
      return res.status(400).json({ error: 'Invalid project ID' });
    }
    
    const projectPath = path.join(PROJECTS_DIR, `${id}.json`);
    const data = await fs.readFile(projectPath, 'utf-8');
    const project = JSON.parse(data);
    
    project.likes = (project.likes || 0) + 1;
    await fs.writeFile(projectPath, JSON.stringify(project, null, 2));
    
    res.json({ likes: project.likes });
    
  } catch (error) {
    if (error.code === 'ENOENT') {
      return res.status(404).json({ error: 'Project not found' });
    }
    res.status(500).json({ error: 'Could not like project' });
  }
});

// ========== ADMIN API ==========

// Get all users
app.get('/api/admin/users', async (req, res) => {
  try {
    const files = await fs.readdir(USERS_DIR);
    const users = [];
    
    for (const file of files) {
      if (!file.endsWith('.json')) continue;
      
      try {
        const data = await fs.readFile(path.join(USERS_DIR, file), 'utf-8');
        const user = JSON.parse(data);
        // Don't send password hash to frontend
        const { passwordHash, ...safeUser } = user;
        users.push(safeUser);
      } catch (err) {
        // Skip invalid files
      }
    }
    
    // Sort by newest first
    users.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    res.json(users);
    
  } catch (error) {
    if (error.code === 'ENOENT') {
      return res.json([]);
    }
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Could not load users' });
  }
});

// Approve a user
app.post('/api/admin/users/:id/approve', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Sanitize ID to prevent path traversal
    if (!/^[a-zA-Z0-9_-]+$/.test(id)) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }
    
    const userPath = path.join(USERS_DIR, `${id}.json`);
    const data = await fs.readFile(userPath, 'utf-8');
    const user = JSON.parse(data);
    
    user.status = 'approved';
    user.approvedAt = new Date().toISOString();
    
    await fs.writeFile(userPath, JSON.stringify(user, null, 2));
    
    res.json({ success: true, message: 'User approved' });
    
  } catch (error) {
    if (error.code === 'ENOENT') {
      return res.status(404).json({ error: 'User not found' });
    }
    console.error('Approve user error:', error);
    res.status(500).json({ error: 'Could not approve user' });
  }
});

// Deny a user
app.post('/api/admin/users/:id/deny', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Sanitize ID to prevent path traversal
    if (!/^[a-zA-Z0-9_-]+$/.test(id)) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }
    
    const userPath = path.join(USERS_DIR, `${id}.json`);
    const data = await fs.readFile(userPath, 'utf-8');
    const user = JSON.parse(data);
    
    user.status = 'denied';
    user.deniedAt = new Date().toISOString();
    
    await fs.writeFile(userPath, JSON.stringify(user, null, 2));
    
    res.json({ success: true, message: 'User denied' });
    
  } catch (error) {
    if (error.code === 'ENOENT') {
      return res.status(404).json({ error: 'User not found' });
    }
    console.error('Deny user error:', error);
    res.status(500).json({ error: 'Could not deny user' });
  }
});

// Get all projects (admin view - includes all, not just public)
app.get('/api/admin/projects', async (req, res) => {
  try {
    const files = await fs.readdir(PROJECTS_DIR);
    const projects = [];
    
    for (const file of files) {
      if (!file.endsWith('.json')) continue;
      
      try {
        const data = await fs.readFile(path.join(PROJECTS_DIR, file), 'utf-8');
        const project = JSON.parse(data);
        // Don't send full code in listing (save bandwidth)
        projects.push({
          id: project.id,
          title: project.title,
          creatorName: project.creatorName,
          category: project.category,
          isPublic: project.isPublic,
          createdAt: project.createdAt,
          views: project.views || 0,
          likes: project.likes || 0
        });
      } catch (err) {
        // Skip invalid files
      }
    }
    
    // Sort by newest first
    projects.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    res.json(projects);
    
  } catch (error) {
    if (error.code === 'ENOENT') {
      return res.json([]);
    }
    console.error('Get projects error:', error);
    res.status(500).json({ error: 'Could not load projects' });
  }
});

// Delete a project
app.delete('/api/admin/projects/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Sanitize ID to prevent path traversal
    if (!/^[a-z0-9]{6}$/.test(id)) {
      return res.status(400).json({ error: 'Invalid project ID' });
    }
    
    const projectPath = path.join(PROJECTS_DIR, `${id}.json`);
    await fs.unlink(projectPath);
    
    res.json({ success: true, message: 'Project deleted' });
    
  } catch (error) {
    if (error.code === 'ENOENT') {
      return res.status(404).json({ error: 'Project not found' });
    }
    console.error('Delete project error:', error);
    res.status(500).json({ error: 'Could not delete project' });
  }
});

// Get dashboard stats
app.get('/api/admin/stats', async (req, res) => {
  try {
    let totalUsers = 0;
    let pendingUsers = 0;
    let approvedUsers = 0;
    let deniedUsers = 0;
    let totalProjects = 0;
    
    // Count users
    try {
      const userFiles = await fs.readdir(USERS_DIR);
      for (const file of userFiles) {
        if (!file.endsWith('.json')) continue;
        totalUsers++;
        
        try {
          const data = await fs.readFile(path.join(USERS_DIR, file), 'utf-8');
          const user = JSON.parse(data);
          if (user.status === 'pending') pendingUsers++;
          else if (user.status === 'approved') approvedUsers++;
          else if (user.status === 'denied') deniedUsers++;
        } catch (err) {
          // Skip invalid files
        }
      }
    } catch (err) {
      // Users directory doesn't exist yet
    }
    
    // Count projects
    try {
      const projectFiles = await fs.readdir(PROJECTS_DIR);
      totalProjects = projectFiles.filter(f => f.endsWith('.json')).length;
    } catch (err) {
      // Projects directory doesn't exist yet
    }
    
    res.json({
      totalUsers,
      pendingUsers,
      approvedUsers,
      deniedUsers,
      totalProjects
    });
    
  } catch (error) {
    console.error('Stats error:', error);
    res.status(500).json({ error: 'Could not load stats' });
  }
});

// ========== USER AUTHENTICATION API ==========

// Register new user
app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, password, displayName } = req.body;
    
    // Validate input
    if (!username || !password || !displayName) {
      return res.status(400).json({ error: 'Username, password, and display name are required' });
    }
    
    // Username validation (alphanumeric, 3-20 chars)
    if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
      return res.status(400).json({ error: 'Username must be 3-20 characters (letters, numbers, underscore only)' });
    }
    
    // Password validation (at least 4 chars for kids)
    if (password.length < 4) {
      return res.status(400).json({ error: 'Password must be at least 4 characters' });
    }
    
    // Display name validation
    if (displayName.length < 1 || displayName.length > 30) {
      return res.status(400).json({ error: 'Display name must be 1-30 characters' });
    }
    
    // Content filter check
    const usernameCheck = filterContent(username);
    const displayNameCheck = filterContent(displayName);
    if (usernameCheck.blocked || displayNameCheck.blocked) {
      return res.status(400).json({ error: 'Please choose a different username or display name' });
    }
    
    // Check if username already exists
    const userId = `user_${username.toLowerCase()}`;
    const userPath = path.join(USERS_DIR, `${userId}.json`);
    
    try {
      await fs.access(userPath);
      return res.status(400).json({ error: 'Username already taken' });
    } catch {
      // User doesn't exist, good to proceed
    }
    
    // Create new user with membership fields
    const now = new Date();
    const user = {
      id: userId,
      username: username.toLowerCase(),
      displayName: displayName.trim(),
      passwordHash: hashPassword(password),
      status: 'pending', // Requires admin approval
      createdAt: now.toISOString(),
      projectCount: 0,
      // Membership fields
      membershipTier: 'free',
      membershipExpires: null,
      gamesCreatedThisMonth: 0,
      aiCoversUsedThisMonth: 0,
      aiSpritesUsedThisMonth: 0,
      monthlyResetDate: now.toISOString(),
      promptsToday: 0,
      playsToday: 0,
      dailyResetDate: now.toISOString(),
      recentRequests: [],
      rateLimitedUntil: null,
      // Track if user has seen upgrade prompt
      hasSeenUpgradePrompt: false,
      lastLoginAt: null
    };
    
    await fs.writeFile(userPath, JSON.stringify(user, null, 2));
    
    res.json({ 
      success: true, 
      message: 'Account created! Please wait for admin approval before logging in.' 
    });
    
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: 'Could not create account' });
  }
});

// Login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }
    
    const userId = `user_${username.toLowerCase()}`;
    const userPath = path.join(USERS_DIR, `${userId}.json`);
    
    try {
      const data = await fs.readFile(userPath, 'utf-8');
      const user = JSON.parse(data);
      
      // Check password
      if (user.passwordHash !== hashPassword(password)) {
        return res.status(401).json({ error: 'Incorrect password' });
      }
      
      // Check approval status
      if (user.status === 'pending') {
        return res.status(403).json({ error: 'Your account is pending approval. Please wait for an admin to approve it.' });
      }
      
      if (user.status === 'denied') {
        return res.status(403).json({ error: 'Your account has been denied. Please contact support.' });
      }
      
      // Create session
      const token = generateToken();
      sessions.set(token, {
        userId: user.id,
        username: user.username,
        displayName: user.displayName,
        createdAt: Date.now()
      });
      
      // Update last login and check counters
      user.lastLoginAt = new Date().toISOString();
      const updatedUser = checkAndResetCounters(user);
      
      // Determine if we should show upgrade prompt
      const showUpgradePrompt = (
        updatedUser.membershipTier === 'free' && 
        !updatedUser.hasSeenUpgradePrompt
      );
      
      // Mark that user has seen the prompt (only once per account)
      if (showUpgradePrompt) {
        updatedUser.hasSeenUpgradePrompt = true;
      }
      
      // Save updated user data
      await fs.writeFile(userPath, JSON.stringify(updatedUser, null, 2));
      
      // Calculate usage remaining
      const usage = calculateUsageRemaining(updatedUser);
      
      // Return user data (without password and internal fields)
      const { passwordHash, recentRequests, rateLimitedUntil, ...safeUser } = updatedUser;
      
      res.json({
        success: true,
        token,
        user: safeUser,
        membership: usage,
        showUpgradePrompt: showUpgradePrompt,
        tiers: MEMBERSHIP_TIERS // Send tier info for upgrade modal
      });
      
    } catch (error) {
      if (error.code === 'ENOENT') {
        return res.status(401).json({ error: 'Username not found' });
      }
      throw error;
    }
    
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Could not log in' });
  }
});

// Get current user (validate session)
app.get('/api/auth/me', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }
    
    const session = sessions.get(token);
    if (!session) {
      return res.status(401).json({ error: 'Invalid or expired session' });
    }
    
    // Get fresh user data
    const userPath = path.join(USERS_DIR, `${session.userId}.json`);
    const data = await fs.readFile(userPath, 'utf-8');
    const user = JSON.parse(data);
    
    // Check if still approved
    if (user.status !== 'approved') {
      sessions.delete(token);
      return res.status(403).json({ error: 'Account no longer approved' });
    }
    
    // Update counters
    user = checkAndResetCounters(user);
    
    // Calculate usage
    const usage = calculateUsageRemaining(user);
    
    const { passwordHash, recentRequests, rateLimitedUntil, ...safeUser } = user;
    res.json({ 
      user: safeUser,
      membership: usage
    });
    
  } catch (error) {
    console.error('Auth check error:', error);
    res.status(500).json({ error: 'Could not verify session' });
  }
});

// Logout
app.post('/api/auth/logout', (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  
  if (token) {
    sessions.delete(token);
  }
  
  res.json({ success: true });
});

// Get user's projects
app.get('/api/auth/my-projects', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }
    
    const session = sessions.get(token);
    if (!session) {
      return res.status(401).json({ error: 'Invalid or expired session' });
    }
    
    // Get all projects by this user
    const files = await fs.readdir(PROJECTS_DIR);
    const projects = [];
    
    for (const file of files) {
      if (!file.endsWith('.json')) continue;
      
      try {
        const data = await fs.readFile(path.join(PROJECTS_DIR, file), 'utf-8');
        const project = JSON.parse(data);
        
        if (project.userId === session.userId) {
          projects.push({
            id: project.id,
            title: project.title,
            category: project.category,
            isPublic: project.isPublic,
            createdAt: project.createdAt,
            views: project.views || 0,
            likes: project.likes || 0
          });
        }
      } catch (err) {
        // Skip invalid files
      }
    }
    
    // Sort by newest first
    projects.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    res.json(projects);
    
  } catch (error) {
    console.error('Get my projects error:', error);
    res.status(500).json({ error: 'Could not load projects' });
  }
});

// ========== MEMBERSHIP API ==========

// Get membership status
app.get('/api/membership/status', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }
    
    const session = sessions.get(token);
    if (!session) {
      return res.status(401).json({ error: 'Invalid or expired session' });
    }
    
    const userPath = path.join(USERS_DIR, `${session.userId}.json`);
    const data = await fs.readFile(userPath, 'utf-8');
    let user = JSON.parse(data);
    user = checkAndResetCounters(user);
    
    const usage = calculateUsageRemaining(user);
    
    res.json({
      membership: usage,
      tiers: MEMBERSHIP_TIERS
    });
    
  } catch (error) {
    console.error('Membership status error:', error);
    res.status(500).json({ error: 'Could not get membership status' });
  }
});

// Get available tiers (public endpoint)
app.get('/api/membership/tiers', (req, res) => {
  res.json({ tiers: MEMBERSHIP_TIERS });
});

// Create Stripe checkout session for signup with paid plan
app.post('/api/stripe/create-checkout', async (req, res) => {
  try {
    const { tier, username, displayName, password } = req.body;
    
    if (!stripe) {
      return res.status(500).json({ error: 'Payment system not configured' });
    }
    
    if (!['creator', 'pro'].includes(tier)) {
      return res.status(400).json({ error: 'Invalid tier' });
    }
    
    if (!username || !password || !displayName) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    // Check if username already exists
    const userId = `user_${username.toLowerCase()}`;
    const userPath = path.join(USERS_DIR, `${userId}.json`);
    
    try {
      await fs.access(userPath);
      return res.status(400).json({ error: 'Username already taken' });
    } catch {
      // User doesn't exist, good to proceed
    }
    
    const priceId = MEMBERSHIP_TIERS[tier].stripePriceId;
    const baseUrl = BASE_URL;
    
    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price: priceId,
        quantity: 1,
      }],
      mode: 'subscription',
      success_url: `${baseUrl}/api/stripe/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/?cancelled=true`,
      metadata: {
        username: username.toLowerCase(),
        displayName: displayName.trim(),
        passwordHash: hashPassword(password),
        tier: tier
      }
    });
    
    res.json({ 
      success: true, 
      checkoutUrl: session.url,
      sessionId: session.id
    });
    
  } catch (error) {
    console.error('Stripe checkout error:', error);
    res.status(500).json({ error: 'Could not create checkout session' });
  }
});

// Handle successful Stripe checkout (redirect endpoint)
app.get('/api/stripe/success', async (req, res) => {
  try {
    const { session_id } = req.query;
    
    if (!stripe || !session_id) {
      return res.redirect('/?error=payment_failed');
    }
    
    // Retrieve the session to get metadata
    const session = await stripe.checkout.sessions.retrieve(session_id);
    
    if (session.payment_status !== 'paid') {
      return res.redirect('/?error=payment_incomplete');
    }
    
    const { username, displayName, passwordHash, tier } = session.metadata;
    
    // Create the user account
    const userId = `user_${username}`;
    const userPath = path.join(USERS_DIR, `${userId}.json`);
    
    // Check if already created (in case of refresh)
    try {
      await fs.access(userPath);
      // User already exists, just redirect to login
      return res.redirect('/?signup=success&message=Account already exists, please log in');
    } catch {
      // Create new user
    }
    
    const now = new Date();
    const expireDate = new Date();
    expireDate.setMonth(expireDate.getMonth() + 1);
    
    const user = {
      id: userId,
      username: username,
      displayName: displayName,
      passwordHash: passwordHash,
      status: 'approved', // Auto-approve paid users!
      createdAt: now.toISOString(),
      projectCount: 0,
      membershipTier: tier,
      membershipExpires: expireDate.toISOString(),
      stripeCustomerId: session.customer,
      stripeSubscriptionId: session.subscription,
      gamesCreatedThisMonth: 0,
      aiCoversUsedThisMonth: 0,
      aiSpritesUsedThisMonth: 0,
      monthlyResetDate: now.toISOString(),
      promptsToday: 0,
      playsToday: 0,
      dailyResetDate: now.toISOString(),
      recentRequests: [],
      rateLimitedUntil: null,
      hasSeenUpgradePrompt: true, // They already paid!
      lastLoginAt: null
    };
    
    await fs.writeFile(userPath, JSON.stringify(user, null, 2));
    
    // Redirect to login with success message
    res.redirect('/?signup=success&tier=' + tier);
    
  } catch (error) {
    console.error('Stripe success handler error:', error);
    res.redirect('/?error=account_creation_failed');
  }
});

// Stripe webhook for subscription events
app.post('/api/stripe/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  
  if (!stripe || !webhookSecret) {
    return res.status(400).json({ error: 'Webhook not configured' });
  }
  
  let event;
  
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }
  
  // Handle subscription events
  switch (event.type) {
    case 'customer.subscription.updated':
    case 'customer.subscription.deleted': {
      const subscription = event.data.object;
      // Find user by stripeSubscriptionId and update their status
      try {
        const files = await fs.readdir(USERS_DIR);
        for (const file of files) {
          if (!file.endsWith('.json')) continue;
          const data = await fs.readFile(path.join(USERS_DIR, file), 'utf-8');
          const user = JSON.parse(data);
          if (user.stripeSubscriptionId === subscription.id) {
            if (subscription.status === 'active') {
              // Subscription renewed
              const expireDate = new Date(subscription.current_period_end * 1000);
              user.membershipExpires = expireDate.toISOString();
            } else if (['canceled', 'unpaid', 'past_due'].includes(subscription.status)) {
              // Subscription ended - downgrade to free
              user.membershipTier = 'free';
              user.membershipExpires = null;
            }
            await fs.writeFile(path.join(USERS_DIR, file), JSON.stringify(user, null, 2));
            break;
          }
        }
      } catch (err) {
        console.error('Error updating user subscription:', err);
      }
      break;
    }
  }
  
  res.json({ received: true });
});

// Upgrade membership (for existing users)
app.post('/api/membership/upgrade', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    const { tier } = req.body;
    
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }
    
    const session = sessions.get(token);
    if (!session) {
      return res.status(401).json({ error: 'Invalid or expired session' });
    }
    
    if (!['creator', 'pro'].includes(tier)) {
      return res.status(400).json({ error: 'Invalid tier' });
    }
    
    if (!stripe) {
      return res.status(500).json({ error: 'Payment system not configured' });
    }
    
    const priceId = MEMBERSHIP_TIERS[tier].stripePriceId;
    const baseUrl = BASE_URL;
    
    // Get user info
    const userPath = path.join(USERS_DIR, `${session.userId}.json`);
    const userData = await fs.readFile(userPath, 'utf-8');
    const user = JSON.parse(userData);
    
    // Create Stripe checkout session for upgrade
    const checkoutSession = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price: priceId,
        quantity: 1,
      }],
      mode: 'subscription',
      success_url: `${baseUrl}/api/stripe/upgrade-success?session_id={CHECKOUT_SESSION_ID}&user_id=${session.userId}`,
      cancel_url: `${baseUrl}/?upgrade_cancelled=true`,
      customer_email: user.email || undefined,
      metadata: {
        userId: session.userId,
        tier: tier
      }
    });
    
    res.json({
      success: true,
      checkoutUrl: checkoutSession.url
    });
    
  } catch (error) {
    console.error('Upgrade error:', error);
    res.status(500).json({ error: 'Could not process upgrade' });
  }
});

// Handle successful upgrade
app.get('/api/stripe/upgrade-success', async (req, res) => {
  try {
    const { session_id, user_id } = req.query;
    
    if (!stripe || !session_id || !user_id) {
      return res.redirect('/?error=upgrade_failed');
    }
    
    const session = await stripe.checkout.sessions.retrieve(session_id);
    
    if (session.payment_status !== 'paid') {
      return res.redirect('/?error=payment_incomplete');
    }
    
    const { tier } = session.metadata;
    const userPath = path.join(USERS_DIR, `${user_id}.json`);
    
    const userData = await fs.readFile(userPath, 'utf-8');
    const user = JSON.parse(userData);
    
    const expireDate = new Date();
    expireDate.setMonth(expireDate.getMonth() + 1);
    
    user.membershipTier = tier;
    user.membershipExpires = expireDate.toISOString();
    user.stripeCustomerId = session.customer;
    user.stripeSubscriptionId = session.subscription;
    
    await fs.writeFile(userPath, JSON.stringify(user, null, 2));
    
    res.redirect('/?upgrade=success&tier=' + tier);
    
  } catch (error) {
    console.error('Upgrade success handler error:', error);
    res.redirect('/?error=upgrade_failed');
  }
});

// Admin: Set user tier (for testing/gifting)
app.post('/api/admin/users/:id/set-tier', async (req, res) => {
  try {
    const { id } = req.params;
    const { tier, months = 1 } = req.body;
    
    if (!/^[a-zA-Z0-9_-]+$/.test(id)) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }
    
    if (!['free', 'creator', 'pro'].includes(tier)) {
      return res.status(400).json({ error: 'Invalid tier' });
    }
    
    const userPath = path.join(USERS_DIR, `${id}.json`);
    const data = await fs.readFile(userPath, 'utf-8');
    const user = JSON.parse(data);
    
    user.membershipTier = tier;
    
    if (tier !== 'free') {
      const expireDate = new Date();
      expireDate.setMonth(expireDate.getMonth() + months);
      user.membershipExpires = expireDate.toISOString();
    } else {
      user.membershipExpires = null;
    }
    
    await fs.writeFile(userPath, JSON.stringify(user, null, 2));
    
    res.json({ 
      success: true, 
      message: `User upgraded to ${tier} for ${months} month(s)`,
      tier: user.membershipTier,
      expires: user.membershipExpires
    });
    
  } catch (error) {
    if (error.code === 'ENOENT') {
      return res.status(404).json({ error: 'User not found' });
    }
    console.error('Set tier error:', error);
    res.status(500).json({ error: 'Could not update tier' });
  }
});

// Dismiss upgrade prompt (user clicked "maybe later")
app.post('/api/membership/dismiss-prompt', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }
    
    const session = sessions.get(token);
    if (!session) {
      return res.status(401).json({ error: 'Invalid or expired session' });
    }
    
    const userPath = path.join(USERS_DIR, `${session.userId}.json`);
    const data = await fs.readFile(userPath, 'utf-8');
    const user = JSON.parse(data);
    
    user.hasSeenUpgradePrompt = true;
    user.upgradePromptDismissedAt = new Date().toISOString();
    
    await fs.writeFile(userPath, JSON.stringify(user, null, 2));
    
    res.json({ success: true });
    
  } catch (error) {
    console.error('Dismiss prompt error:', error);
    res.status(500).json({ error: 'Could not dismiss prompt' });
  }
});

// ========== MULTIPLAYER API ==========

// Get room info by code
app.get('/api/rooms/:code', (req, res) => {
  const { code } = req.params;
  const room = getRoomInfo(code);
  
  if (!room) {
    return res.status(404).json({ error: 'Room not found' });
  }
  
  res.json(room);
});

// Get active rooms for a project
app.get('/api/projects/:id/rooms', (req, res) => {
  const { id } = req.params;
  const rooms = getActiveRooms(id);
  res.json(rooms);
});

// Get all active rooms (for discovery)
app.get('/api/rooms', (req, res) => {
  const { projectId } = req.query;
  const rooms = getActiveRooms(projectId);
  res.json(rooms);
});

// Catch-all route for React app (must be after all other routes)
// This serves the React app for any unmatched routes in production
app.get('*', async (req, res, next) => {
  // Skip API routes
  if (req.path.startsWith('/api/')) {
    return next();
  }
  
  const distIndex = path.join(__dirname, '..', 'dist', 'index.html');
  try {
    await fs.access(distIndex);
    res.sendFile(distIndex);
  } catch {
    // In development, let Vite handle it
    next();
  }
});

// Create HTTP server and attach WebSocket
const server = createServer(app);

// Initialize multiplayer WebSocket server
initMultiplayer(server);

server.listen(PORT, () => {
  console.log(`🚀 Vibe Code Studio server running on port ${PORT}`);
  console.log(`   Health check: http://localhost:${PORT}/api/health`);
  console.log(`   Multiplayer WebSocket: ws://localhost:${PORT}/ws/multiplayer`);
  if (isProduction) {
    console.log(`   Mode: Production (serving built frontend)`);
  } else {
    console.log(`   Mode: Development (use Vite for frontend)`);
  }
});
