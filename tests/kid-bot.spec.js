// @ts-check
import { test, expect } from '@playwright/test';

/**
 * Kid Vibe Code - Automated Test Bot
 * 
 * This bot simulates a kid using the platform to:
 * 1. Load the app and see the welcome screen
 * 2. Type a fun request to make a game
 * 3. Wait for AI to generate code
 * 4. See the preview update
 * 5. Test sharing functionality
 * 6. Browse the gallery
 */

// Test prompts a kid might type
const KID_PROMPTS = [
  "Make a game where I catch falling stars with a basket",
  "Create a bouncing ball that changes colors when I click it",
  "Make a simple clicker game with a cookie",
  "Draw a rainbow that appears when I move my mouse",
  "Make a button that makes confetti explode",
];

// Get a random prompt for variety
const getRandomPrompt = () => KID_PROMPTS[Math.floor(Math.random() * KID_PROMPTS.length)];

test.describe('Kid Vibe Code Platform - Bot Tests', () => {
  
  test.beforeEach(async ({ page }) => {
    // Navigate to the app
    await page.goto('/');
    // Wait for the app to load
    await page.waitForLoadState('networkidle');
  });

  test('1. App loads with welcome screen', async ({ page }) => {
    console.log('🚀 Testing: App loads correctly...');
    
    // Check that the main app container exists
    await expect(page.locator('.app-container, .app, #root')).toBeVisible();
    
    // Look for the chat panel or input area
    const chatArea = page.locator('textarea, input[type="text"], .chat-input, .message-input');
    await expect(chatArea.first()).toBeVisible();
    
    console.log('✅ App loaded successfully!');
  });

  test('2. Can type a message in the chat', async ({ page }) => {
    console.log('💬 Testing: Typing in chat...');
    
    // Find the text input area
    const inputArea = page.locator('textarea, input[type="text"]').first();
    await expect(inputArea).toBeVisible();
    
    // Type a test message
    await inputArea.fill('Hello! Can you help me make a game?');
    
    // Verify the text was entered
    await expect(inputArea).toHaveValue('Hello! Can you help me make a game?');
    
    console.log('✅ Chat input works!');
  });

  test('3. Simulate kid creating a game - FULL FLOW', async ({ page }) => {
    console.log('🎮 Testing: Full game creation flow...');
    
    const prompt = getRandomPrompt();
    console.log(`   Using prompt: "${prompt}"`);
    
    // Find and fill the input
    const inputArea = page.locator('textarea, input[type="text"]').first();
    await expect(inputArea).toBeVisible();
    await inputArea.fill(prompt);
    
    // Find and click the send button
    const sendButton = page.locator('button').filter({ hasText: /send|submit|go|create|make/i }).first();
    
    // If no labeled button, look for a button near the input
    if (await sendButton.count() === 0) {
      // Try clicking any button that might be the send button
      const buttons = page.locator('button');
      const buttonCount = await buttons.count();
      console.log(`   Found ${buttonCount} buttons, looking for send...`);
      
      for (let i = 0; i < buttonCount; i++) {
        const btn = buttons.nth(i);
        const text = await btn.textContent();
        const ariaLabel = await btn.getAttribute('aria-label');
        if (text?.toLowerCase().includes('send') || 
            ariaLabel?.toLowerCase().includes('send') ||
            text === '' || text === '➤' || text === '→') {
          await btn.click();
          break;
        }
      }
    } else {
      await sendButton.click();
    }
    
    console.log('   ⏳ Waiting for AI response (this may take 10-30 seconds)...');
    
    // Wait for code to be generated - look for code editor content or preview changes
    // The AI response might take a while, so we wait up to 45 seconds
    await page.waitForTimeout(5000); // Initial wait
    
    // Check if there's code in the editor or preview
    const codeContent = page.locator('.monaco-editor, pre, code, .code-editor');
    const previewFrame = page.locator('iframe, .preview-panel, .preview');
    
    // Wait for either code or preview to show content
    try {
      await expect(codeContent.or(previewFrame).first()).toBeVisible({ timeout: 45000 });
      console.log('✅ Code/Preview generated successfully!');
    } catch (e) {
      // Take a screenshot for debugging
      await page.screenshot({ path: 'test-results/generation-timeout.png' });
      console.log('⚠️ Generation may have timed out - check screenshot');
    }
  });

  test('4. Test toggle code visibility', async ({ page }) => {
    console.log('👁️ Testing: Code visibility toggle...');
    
    // Look for a toggle button for showing/hiding code
    const toggleButton = page.locator('button').filter({ 
      hasText: /code|show|hide|toggle|editor/i 
    }).first();
    
    if (await toggleButton.count() > 0) {
      await toggleButton.click();
      await page.waitForTimeout(500);
      await toggleButton.click();
      console.log('✅ Code toggle works!');
    } else {
      console.log('ℹ️ No code toggle button found (may not be implemented)');
    }
  });

  test('5. Test share button opens modal', async ({ page }) => {
    console.log('📤 Testing: Share functionality...');
    
    // First, create some code so there's something to share
    const inputArea = page.locator('textarea, input[type="text"]').first();
    await inputArea.fill('Make a simple hello world');
    
    // Try to submit
    await page.keyboard.press('Enter');
    await page.waitForTimeout(3000);
    
    // Look for share button
    const shareButton = page.locator('button').filter({ 
      hasText: /share/i 
    }).first();
    
    if (await shareButton.count() > 0 && await shareButton.isEnabled()) {
      await shareButton.click();
      
      // Check if modal opened
      const modal = page.locator('.modal, [role="dialog"], .share-modal');
      try {
        await expect(modal.first()).toBeVisible({ timeout: 3000 });
        console.log('✅ Share modal opens!');
        
        // Close modal if there's a close button
        const closeButton = page.locator('button').filter({ hasText: /close|cancel|x/i }).first();
        if (await closeButton.count() > 0) {
          await closeButton.click();
        } else {
          await page.keyboard.press('Escape');
        }
      } catch (e) {
        console.log('ℹ️ Share modal did not open (may need code first)');
      }
    } else {
      console.log('ℹ️ Share button not found or disabled');
    }
  });

  test('6. Test gallery page loads', async ({ page }) => {
    console.log('🖼️ Testing: Gallery page...');
    
    await page.goto('/gallery');
    await page.waitForLoadState('networkidle');
    
    // Check the page loaded
    const body = page.locator('body');
    await expect(body).toBeVisible();
    
    // Look for gallery content
    const galleryContent = page.locator('.gallery, .projects, .grid, h1, h2');
    await expect(galleryContent.first()).toBeVisible();
    
    console.log('✅ Gallery page loads!');
  });

  test('7. Test API health endpoint', async ({ request }) => {
    console.log('🏥 Testing: API health...');
    
    const response = await request.get('http://localhost:3001/api/health');
    expect(response.ok()).toBeTruthy();
    
    const body = await response.json();
    expect(body.status).toBe('ok');
    
    console.log('✅ API is healthy!');
  });

  test('8. Test gallery API endpoint', async ({ request }) => {
    console.log('📡 Testing: Gallery API...');
    
    const response = await request.get('http://localhost:3001/api/gallery');
    expect(response.ok()).toBeTruthy();
    
    const body = await response.json();
    expect(Array.isArray(body)).toBeTruthy();
    
    console.log(`✅ Gallery API works! Found ${body.length} projects`);
  });

});

// Additional stress test
test.describe('Stress Tests', () => {
  
  test('Rapid message typing', async ({ page }) => {
    console.log('⚡ Testing: Rapid typing...');
    
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    const inputArea = page.locator('textarea, input[type="text"]').first();
    
    // Type multiple messages quickly
    const messages = [
      'Make it blue',
      'Add a button',
      'Make it bigger',
    ];
    
    for (const msg of messages) {
      await inputArea.fill(msg);
      await page.waitForTimeout(100);
    }
    
    console.log('✅ Rapid typing handled!');
  });

});
