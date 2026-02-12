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
import { getSystemPrompt, getContentFilter, sanitizeOutput, detectTemplate, getTemplateInfo } from './prompts.js';
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

// Data storage paths - use /app/data for Railway volume persistence
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '..', 'data');
const PROJECTS_DIR = path.join(DATA_DIR, 'projects');
const USERS_DIR = path.join(DATA_DIR, 'users');

console.log('📂 Data directory:', DATA_DIR);
console.log('📂 Projects directory:', PROJECTS_DIR);
console.log('📂 Users directory:', USERS_DIR);

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

// ========== GAME TEMPLATES ==========
const TEMPLATES_DIR = path.join(__dirname, 'templates');

/**
 * Load a game template by type
 * @param {string} type - Template type (racing, shooter, platformer, etc.)
 * @returns {string|null} - Template HTML or null if not found
 */
async function loadTemplate(type) {
  const templatePath = path.join(TEMPLATES_DIR, `${type}.html`);
  try {
    const template = await fs.readFile(templatePath, 'utf-8');
    // Add marker so we know a template was used
    return template.replace('</html>', `<!-- TEMPLATE:${type} --></html>`);
  } catch (err) {
    console.error('Template not found:', type, err.message);
    return null;
  }
}

/**
 * Check if the current code is the default/empty state
 * (meaning user hasn't started building yet)
 */
function isDefaultCode(code) {
  if (!code) return true;
  // Check for default welcome screen markers
  return code.includes('Vibe Code Studio') && 
         code.includes('Tell me what you want to create') &&
         !code.includes('<!-- TEMPLATE:');
}

// Initialize Anthropic client
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

app.use(cors());
// Increase body size limit to allow image uploads (base64 images can be large)
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

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

/**
 * Pre-customize a template based on gameConfig
 * Swaps colors, themes, labels, and character references in the template HTML
 */
function preCustomizeTemplate(templateHtml, gameConfig) {
  if (!gameConfig || !templateHtml) return templateHtml;
  
  let html = templateHtml;
  
  // ========== VISUAL STYLE COLOR MAPPINGS ==========
  const styleColors = {
    neon: {
      primary: '#8b5cf6',
      secondary: '#ec4899',
      background: '#0f0a1e',
      text: '#e0d4ff',
      accent: '#06d6a0',
      bgGradient: 'linear-gradient(135deg, #0f0a1e 0%, #1a0e2e 100%)',
    },
    retro: {
      primary: '#f59e0b',
      secondary: '#ef4444',
      background: '#1a1a2e',
      text: '#e2e8f0',
      accent: '#22c55e',
      bgGradient: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
    },
    cute: {
      primary: '#f472b6',
      secondary: '#a78bfa',
      background: '#fdf2f8',
      text: '#4a1942',
      accent: '#34d399',
      bgGradient: 'linear-gradient(135deg, #fdf2f8 0%, #fce7f3 100%)',
    },
    spooky: {
      primary: '#a855f7',
      secondary: '#f97316',
      background: '#0c0a1a',
      text: '#c4b5fd',
      accent: '#22d3ee',
      bgGradient: 'linear-gradient(135deg, #0c0a1a 0%, #1a0f2b 100%)',
    },
    clean: {
      primary: '#3b82f6',
      secondary: '#10b981',
      background: '#f8fafc',
      text: '#1e293b',
      accent: '#f59e0b',
      bgGradient: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
    },
  };
  
  const colors = styleColors[gameConfig.visualStyle] || styleColors.neon;
  
  // Replace CSS custom properties if present
  html = html.replace(/--game-primary:\s*[^;]+;/g, `--game-primary: ${colors.primary};`);
  html = html.replace(/--game-secondary:\s*[^;]+;/g, `--game-secondary: ${colors.secondary};`);
  html = html.replace(/--game-bg:\s*[^;]+;/g, `--game-bg: ${colors.background};`);
  html = html.replace(/--game-text:\s*[^;]+;/g, `--game-text: ${colors.text};`);
  html = html.replace(/--game-accent:\s*[^;]+;/g, `--game-accent: ${colors.accent};`);
  
  // Replace title/heading text with theme-appropriate text
  const themeTitle = `${gameConfig.theme.charAt(0).toUpperCase() + gameConfig.theme.slice(1)} ${gameConfig.gameType.charAt(0).toUpperCase() + gameConfig.gameType.slice(1)}`;
  html = html.replace(/<!-- GAME_TITLE -->[^<]*<!-- \/GAME_TITLE -->/g, `<!-- GAME_TITLE -->${themeTitle}<!-- /GAME_TITLE -->`);
  
  // Replace character placeholder
  html = html.replace(/<!-- PLAYER_CHARACTER -->[^<]*<!-- \/PLAYER_CHARACTER -->/g, `<!-- PLAYER_CHARACTER -->${gameConfig.character}<!-- /PLAYER_CHARACTER -->`);
  
  // Replace obstacle placeholder
  html = html.replace(/<!-- OBSTACLES -->[^<]*<!-- \/OBSTACLES -->/g, `<!-- OBSTACLES -->${gameConfig.obstacles}<!-- /OBSTACLES -->`);
  
  return html;
}

// Main generation endpoint
app.post('/api/generate', async (req, res) => {
  try {
    const { message, image, currentCode, conversationHistory = [], gameConfig = null } = req.body;
    console.log(`🎮 Generate request: "${(message || '').slice(0, 80)}" | gameConfig: ${gameConfig ? gameConfig.gameType : 'none'} | hasCode: ${!!currentCode} | historyLen: ${conversationHistory.length}`);

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

    // ========== TEMPLATE DETECTION & PRE-CUSTOMIZATION ==========
    let templateType = null;
    let codeToUse = currentCode;
    
    if (isDefaultCode(currentCode)) {
      // Use gameConfig to select template, or detect from message
      if (gameConfig && gameConfig.gameType) {
        templateType = gameConfig.gameType;
      } else {
        templateType = detectTemplate(message);
      }
      
      if (templateType) {
        let templateCode = await loadTemplate(templateType);
        if (templateCode) {
          // Pre-customize template based on gameConfig survey answers
          if (gameConfig) {
            templateCode = preCustomizeTemplate(templateCode, gameConfig);
            console.log(`📦 Using pre-customized ${templateType} template (theme: ${gameConfig.theme}, style: ${gameConfig.visualStyle})`);
          } else {
            console.log(`📦 Using ${templateType} template for this request`);
          }
          codeToUse = templateCode;
        }
      }
    }

    // Build conversation with system prompt (pass gameConfig and template type)
    const systemPrompt = getSystemPrompt(codeToUse, gameConfig, templateType);
    
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

    // Log prompt size for debugging
    console.log(`📝 System prompt: ${systemPrompt.length} chars | Messages: ${messages.length} | Template: ${templateType || 'none'}`);

    // Call Claude API with retry logic for transient failures
    let response;
    const maxRetries = 2;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        response = await anthropic.messages.create({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 16384,
          system: systemPrompt,
          messages: messages
        });
        break; // Success, exit retry loop
      } catch (apiError) {
        console.error(`⚠️ Claude API attempt ${attempt}/${maxRetries} failed:`, apiError.status, apiError.message, apiError.error || '');
        if (attempt === maxRetries) {
          // All retries exhausted - throw with details
          throw new Error(`Claude API failed after ${maxRetries} attempts: ${apiError.status || ''} ${apiError.message || 'Unknown error'}`);
        }
        // Wait briefly before retry (1 second)
        await new Promise(r => setTimeout(r, 1000));
      }
    }

    // Increment usage counter after successful generation
    await incrementUsage(userId, 'generate');

    // Extract response
    let assistantMessage = response.content[0].text;
    
    // --- Helper: try to extract complete HTML from an AI response ---
    function extractCode(text) {
      // 1) Markdown code block: ```html or ```HTML
      const codeBlockMatch = text.match(/```\s*html\s*\n([\s\S]*?)```/i);
      if (codeBlockMatch) {
        const inner = codeBlockMatch[1].trim();
        if (inner.includes('</html>')) return inner;
      }
      // 2) Any code block containing full HTML
      const blockRegex = /```\s*\w*\s*\n([\s\S]*?)```/gi;
      let blockMatch;
      while ((blockMatch = blockRegex.exec(text)) !== null) {
        const inner = blockMatch[1].trim();
        if (inner.includes('<!DOCTYPE') && inner.includes('</html>')) {
          const extracted = inner.match(/<!DOCTYPE\s+html>[\s\S]*<\/html>/i);
          if (extracted && extracted[0].length > 100) return extracted[0];
        }
      }
      // 3) Raw HTML (no backticks)
      const htmlMatch = text.match(/<!DOCTYPE\s+html>[\s\S]*?<\/html>/i);
      if (htmlMatch) return htmlMatch[0];
      return null;
    }

    // --- Helper: detect if the response was truncated mid-code ---
    function isTruncated(text) {
      const hasPartialHtml = text.includes('<!DOCTYPE') || 
                             text.includes('<html') ||
                             text.includes('<script');
      const hasClosingHtml = text.includes('</html>');
      return hasPartialHtml && !hasClosingHtml;
    }

    // --- Helper: extract the partial code from a truncated response ---
    function extractPartialCode(text) {
      // Try to get everything from <!DOCTYPE or <html onward
      const match = text.match(/<!DOCTYPE\s+html>[\s\S]*/i) || text.match(/<html[\s\S]*/i);
      if (match) return match[0];
      // Fallback: get content after the code fence opener
      const fenceMatch = text.match(/```\s*html\s*\n([\s\S]*)/i);
      if (fenceMatch) return fenceMatch[1];
      return null;
    }

    let code = extractCode(assistantMessage);
    let wasCodeTruncated = false;
    
    // If no complete code found, check if it was truncated
    if (!code && isTruncated(assistantMessage)) {
      console.log('⚠️ Response truncated - attempting continuation...');
      
      // Extract the partial code to send back for continuation
      const partialCode = extractPartialCode(assistantMessage);
      
      if (partialCode) {
        try {
          // Ask Claude to continue from where it left off
          const continuationResponse = await anthropic.messages.create({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 8192,
            system: 'You were generating an HTML game and your response was cut off. Continue EXACTLY where you left off. Do NOT repeat any code that was already written. Do NOT add any explanation text - ONLY output the remaining code to complete the HTML document. The code must end with </html>.',
            messages: [
              {
                role: 'user',
                content: `Continue this HTML code. Pick up EXACTLY where it ends (do not repeat anything):\n\n${partialCode.slice(-3000)}`
              }
            ]
          });
          
          const continuationText = continuationResponse.content[0].text;
          
          // Clean up the continuation (remove any markdown fences)
          let cleanContinuation = continuationText
            .replace(/^```\s*\w*\s*\n?/i, '')
            .replace(/\n?```\s*$/i, '')
            .trim();
          
          // Stitch them together
          const fullCode = partialCode + '\n' + cleanContinuation;
          
          // Check if the stitched result is valid
          if (fullCode.includes('</html>')) {
            // Extract clean HTML from the stitched result
            const stitchedMatch = fullCode.match(/<!DOCTYPE\s+html>[\s\S]*<\/html>/i);
            if (stitchedMatch && stitchedMatch[0].length > 200) {
              code = stitchedMatch[0];
              console.log('✅ Continuation successful - stitched complete HTML (' + code.length + ' chars)');
            }
          }
          
          if (!code) {
            console.log('⚠️ Continuation did not produce valid HTML');
            wasCodeTruncated = true;
          }
          
        } catch (contError) {
          console.error('⚠️ Continuation request failed:', contError.message);
          wasCodeTruncated = true;
        }
      } else {
        wasCodeTruncated = true;
      }
    } else if (!code) {
      console.log('⚠️ No code block found in AI response (preview will not update)');
    }
    
    // If we used a template and AI didn't generate new code, use the template
    if (!code && templateType && codeToUse) {
      code = codeToUse;
      console.log(`📦 Returning ${templateType} template as starting point`);
    }

    // Sanitize the output message
    let cleanMessage = sanitizeOutput(assistantMessage);
    
    // If code was truncated even after continuation attempt, give a helpful message
    if (wasCodeTruncated) {
      cleanMessage = "That game got really big! 😅 Let me try a simpler approach — ask me to add one feature at a time, like 'add a speed powerup' instead of multiple things at once! 🎮";
    }

    // Include usage info in response
    const usage = userId ? calculateUsageRemaining(tierCheck.user) : null;

    res.json({
      message: cleanMessage,
      code: code,
      usage: usage
    });

  } catch (error) {
    console.error('API Error:', error.message || error);
    console.error('Stack:', error.stack);
    
    // Provide a more helpful response depending on the error type
    let friendlyMessage = "Oops! My brain got a little confused. 🤔 Can you try asking me again?";
    let statusCode = 500;
    
    const errMsg = (error.message || '').toLowerCase();
    if (errMsg.includes('rate') || errMsg.includes('429')) {
      friendlyMessage = "I'm a little busy right now! 🐢 Wait a moment and try again.";
      statusCode = 429;
    } else if (errMsg.includes('timeout') || errMsg.includes('timed out')) {
      friendlyMessage = "That took too long! 🕐 Try asking for something a bit simpler.";
    } else if (errMsg.includes('overloaded') || errMsg.includes('529')) {
      friendlyMessage = "The servers are super busy! 🚀 Try again in a minute.";
      statusCode = 503;
    }
    
    res.status(statusCode).json({
      message: friendlyMessage,
      code: null
    });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Vibe Code Studio server is running! 🚀' });
});

// ========== TEMPLATES API ==========

// Get list of available templates
app.get('/api/templates', (req, res) => {
  const templates = getTemplateInfo();
  res.json({ templates });
});

// Get a specific template by type
app.get('/api/templates/:type', async (req, res) => {
  const { type } = req.params;
  const validTypes = ['racing', 'shooter', 'platformer', 'frogger', 'puzzle', 'clicker', 'rpg'];
  
  if (!validTypes.includes(type)) {
    return res.status(400).json({ error: 'Invalid template type' });
  }
  
  const templateCode = await loadTemplate(type);
  
  if (!templateCode) {
    return res.status(404).json({ error: 'Template not found' });
  }
  
  const templateInfo = getTemplateInfo()[type];
  
  res.json({
    type,
    name: templateInfo.name,
    icon: templateInfo.icon,
    description: templateInfo.description,
    code: templateCode
  });
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

// Delete own project (removes from studio and arcade/gallery)
app.delete('/api/projects/:id', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ error: 'Please log in to delete projects' });
    }

    const session = sessions.get(token);
    if (!session) {
      return res.status(401).json({ error: 'Session expired. Please log in again.' });
    }

    const { id } = req.params;
    if (!/^[a-z0-9]{6}$/.test(id)) {
      return res.status(400).json({ error: 'Invalid project ID' });
    }

    const projectPath = path.join(PROJECTS_DIR, `${id}.json`);
    const data = await fs.readFile(projectPath, 'utf-8');
    const project = JSON.parse(data);

    if (project.userId !== session.userId) {
      return res.status(403).json({ error: 'You can only delete your own projects' });
    }

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

// ========== SAVE & VERSION HISTORY ==========

// Save project draft (create or update)
app.post('/api/projects/save', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ error: 'Please log in to save your project' });
    }
    
    const session = sessions.get(token);
    if (!session) {
      return res.status(401).json({ error: 'Session expired. Please log in again.' });
    }
    
    const { projectId, title, code, category = 'other' } = req.body;
    
    if (!code) {
      return res.status(400).json({ error: 'No code to save' });
    }
    
    const projectTitle = title || 'My Project';
    const now = new Date().toISOString();
    
    // If projectId exists and is valid, update existing project
    if (projectId && projectId !== 'new' && /^[a-z0-9]{6}$/.test(projectId)) {
      const projectPath = path.join(PROJECTS_DIR, `${projectId}.json`);
      
      try {
        const existingData = await fs.readFile(projectPath, 'utf-8');
        const existingProject = JSON.parse(existingData);
        
        // Verify ownership
        if (existingProject.userId !== session.userId) {
          return res.status(403).json({ error: 'You can only save your own projects' });
        }
        
        // Save current version to history before updating
        if (!existingProject.versions) {
          existingProject.versions = [];
        }
        
        // Only save version if code actually changed
        if (existingProject.code !== code) {
          existingProject.versions.push({
            versionId: Date.now().toString(),
            code: existingProject.code,
            title: existingProject.title,
            savedAt: existingProject.updatedAt || existingProject.createdAt,
            autoSave: false
          });
          
          // Keep only last 20 versions
          if (existingProject.versions.length > 20) {
            existingProject.versions = existingProject.versions.slice(-20);
          }
        }
        
        // Update the project
        existingProject.title = projectTitle;
        existingProject.code = code;
        existingProject.category = category;
        existingProject.updatedAt = now;
        
        await fs.writeFile(projectPath, JSON.stringify(existingProject, null, 2));
        
        return res.json({
          success: true,
          message: 'Project saved!',
          project: {
            id: existingProject.id,
            title: existingProject.title,
            updatedAt: existingProject.updatedAt,
            versionsCount: existingProject.versions.length
          }
        });
        
      } catch (err) {
        if (err.code !== 'ENOENT') throw err;
        // Project doesn't exist, will create new one below
      }
    }
    
    // Create new project
    const id = randomBytes(3).toString('hex');
    const newProject = {
      id,
      title: projectTitle,
      code,
      category,
      creatorName: session.displayName,
      userId: session.userId,
      isPublic: false, // Drafts are private by default
      isDraft: true,
      createdAt: now,
      updatedAt: now,
      views: 0,
      likes: 0,
      versions: []
    };
    
    await fs.writeFile(
      path.join(PROJECTS_DIR, `${id}.json`),
      JSON.stringify(newProject, null, 2)
    );
    
    res.json({
      success: true,
      message: 'Project created!',
      project: {
        id: newProject.id,
        title: newProject.title,
        createdAt: newProject.createdAt,
        versionsCount: 0
      }
    });
    
  } catch (error) {
    console.error('Save project error:', error);
    res.status(500).json({ error: 'Could not save project' });
  }
});

// Get version history for a project
app.get('/api/projects/:id/versions', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    const { id } = req.params;
    
    if (!/^[a-z0-9]{6}$/.test(id)) {
      return res.status(400).json({ error: 'Invalid project ID' });
    }
    
    const projectPath = path.join(PROJECTS_DIR, `${id}.json`);
    const data = await fs.readFile(projectPath, 'utf-8');
    const project = JSON.parse(data);
    
    // Check if user owns this project
    if (token) {
      const session = sessions.get(token);
      if (!session || project.userId !== session.userId) {
        return res.status(403).json({ error: 'You can only view versions of your own projects' });
      }
    } else {
      return res.status(401).json({ error: 'Please log in to view version history' });
    }
    
    // Return version list (without full code to save bandwidth)
    const versions = (project.versions || []).map((v, index) => ({
      versionId: v.versionId,
      title: v.title,
      savedAt: v.savedAt,
      versionNumber: index + 1
    }));
    
    // Add current version at the end
    versions.push({
      versionId: 'current',
      title: project.title + ' (Current)',
      savedAt: project.updatedAt || project.createdAt,
      versionNumber: versions.length + 1,
      isCurrent: true
    });
    
    res.json({
      projectId: project.id,
      projectTitle: project.title,
      versions: versions.reverse() // Most recent first
    });
    
  } catch (error) {
    if (error.code === 'ENOENT') {
      return res.status(404).json({ error: 'Project not found' });
    }
    console.error('Get versions error:', error);
    res.status(500).json({ error: 'Could not load version history' });
  }
});

// Load a specific version
app.get('/api/projects/:id/versions/:versionId', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    const { id, versionId } = req.params;
    
    if (!/^[a-z0-9]{6}$/.test(id)) {
      return res.status(400).json({ error: 'Invalid project ID' });
    }
    
    const projectPath = path.join(PROJECTS_DIR, `${id}.json`);
    const data = await fs.readFile(projectPath, 'utf-8');
    const project = JSON.parse(data);
    
    // Check ownership
    if (token) {
      const session = sessions.get(token);
      if (!session || project.userId !== session.userId) {
        return res.status(403).json({ error: 'You can only access versions of your own projects' });
      }
    } else {
      return res.status(401).json({ error: 'Please log in to access version history' });
    }
    
    // Return current version
    if (versionId === 'current') {
      return res.json({
        versionId: 'current',
        title: project.title,
        code: project.code,
        savedAt: project.updatedAt || project.createdAt,
        isCurrent: true
      });
    }
    
    // Find the requested version
    const version = (project.versions || []).find(v => v.versionId === versionId);
    
    if (!version) {
      return res.status(404).json({ error: 'Version not found' });
    }
    
    res.json({
      versionId: version.versionId,
      title: version.title,
      code: version.code,
      savedAt: version.savedAt
    });
    
  } catch (error) {
    if (error.code === 'ENOENT') {
      return res.status(404).json({ error: 'Project not found' });
    }
    console.error('Get version error:', error);
    res.status(500).json({ error: 'Could not load version' });
  }
});

// Restore a version (makes it the current version)
app.post('/api/projects/:id/versions/:versionId/restore', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    const { id, versionId } = req.params;
    
    if (!token) {
      return res.status(401).json({ error: 'Please log in to restore versions' });
    }
    
    const session = sessions.get(token);
    if (!session) {
      return res.status(401).json({ error: 'Session expired' });
    }
    
    if (!/^[a-z0-9]{6}$/.test(id)) {
      return res.status(400).json({ error: 'Invalid project ID' });
    }
    
    const projectPath = path.join(PROJECTS_DIR, `${id}.json`);
    const data = await fs.readFile(projectPath, 'utf-8');
    const project = JSON.parse(data);
    
    // Check ownership
    if (project.userId !== session.userId) {
      return res.status(403).json({ error: 'You can only restore your own projects' });
    }
    
    if (versionId === 'current') {
      return res.json({ success: true, message: 'Already on current version' });
    }
    
    // Find the version to restore
    const version = (project.versions || []).find(v => v.versionId === versionId);
    
    if (!version) {
      return res.status(404).json({ error: 'Version not found' });
    }
    
    // Save current as a version before restoring
    if (!project.versions) {
      project.versions = [];
    }
    
    project.versions.push({
      versionId: Date.now().toString(),
      code: project.code,
      title: project.title,
      savedAt: project.updatedAt || project.createdAt,
      autoSave: false
    });
    
    // Keep only last 20 versions
    if (project.versions.length > 20) {
      project.versions = project.versions.slice(-20);
    }
    
    // Restore the old version
    project.code = version.code;
    project.updatedAt = new Date().toISOString();
    
    await fs.writeFile(projectPath, JSON.stringify(project, null, 2));
    
    res.json({
      success: true,
      message: 'Version restored!',
      code: project.code
    });
    
  } catch (error) {
    if (error.code === 'ENOENT') {
      return res.status(404).json({ error: 'Project not found' });
    }
    console.error('Restore version error:', error);
    res.status(500).json({ error: 'Could not restore version' });
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
    let user = JSON.parse(data);
    
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
  console.log('📦 Stripe success callback received');
  try {
    const { session_id } = req.query;
    console.log('📦 Session ID:', session_id);
    
    if (!stripe || !session_id) {
      console.log('❌ Missing stripe or session_id');
      return res.redirect('/?error=payment_failed');
    }
    
    // Retrieve the session to get metadata
    const session = await stripe.checkout.sessions.retrieve(session_id);
    console.log('📦 Payment status:', session.payment_status);
    console.log('📦 Metadata:', JSON.stringify(session.metadata));
    
    if (session.payment_status !== 'paid') {
      console.log('❌ Payment not completed');
      return res.redirect('/?error=payment_incomplete');
    }
    
    const { username, displayName, passwordHash, tier } = session.metadata;
    
    // Create the user account
    const userId = `user_${username}`;
    const userPath = path.join(USERS_DIR, `${userId}.json`);
    console.log('📦 Creating user:', userId);
    console.log('📦 User path:', userPath);
    
    // Check if already created (in case of refresh)
    try {
      await fs.access(userPath);
      // User already exists, just redirect to login
      console.log('📦 User already exists, redirecting');
      return res.redirect('/?signup=success&message=Account already exists, please log in');
    } catch {
      // Create new user
      console.log('📦 User does not exist, creating new account');
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
    console.log('✅ User account created successfully:', userId);
    
    // Redirect to login with success message
    res.redirect('/?signup=success&tier=' + tier);
    
  } catch (error) {
    console.error('❌ Stripe success handler error:', error);
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
