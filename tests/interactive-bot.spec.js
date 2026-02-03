// @ts-check
import { test, expect } from '@playwright/test';

/**
 * INTERACTIVE BOT TEST
 * 
 * This test runs in headed mode (visible browser) and simulates
 * a kid using the platform step by step. Watch the browser to see
 * exactly what's happening!
 * 
 * Run with: npm run test:bot
 */

test('Interactive Bot - Watch Me Use The App!', async ({ page }) => {
  // Slow down actions so you can watch
  test.slow(); // Triples the timeout
  
  console.log('\n');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('   🤖 KID VIBE CODE - INTERACTIVE TEST BOT');
  console.log('   Watch the browser window to see the bot in action!');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('\n');

  // Step 1: Open the app
  console.log('📱 STEP 1: Opening Kid Vibe Code...');
  await page.goto('http://localhost:3000');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);
  console.log('   ✓ App loaded!\n');

  // Step 2: Look around the UI
  console.log('👀 STEP 2: Exploring the interface...');
  await page.waitForTimeout(1500);
  
  // Take a screenshot of initial state
  await page.screenshot({ path: 'test-results/01-initial-load.png' });
  console.log('   ✓ Screenshot saved: 01-initial-load.png\n');

  // Step 3: Find the input area
  console.log('🔍 STEP 3: Looking for the chat input...');
  const inputArea = page.locator('textarea').first();
  
  if (await inputArea.count() === 0) {
    console.log('   ⚠️ No textarea found, trying input...');
  }
  
  await expect(inputArea).toBeVisible({ timeout: 10000 });
  console.log('   ✓ Found the input area!\n');

  // Step 4: Type a fun game request like a kid would
  console.log('⌨️ STEP 4: Typing a game request...');
  const gameRequest = "Make a fun game where colorful balloons float up and I pop them by clicking!";
  
  // Type slowly so you can watch
  await inputArea.click();
  await page.waitForTimeout(500);
  
  // Type character by character for dramatic effect
  for (const char of gameRequest) {
    await inputArea.type(char, { delay: 30 });
  }
  
  await page.waitForTimeout(1000);
  console.log(`   ✓ Typed: "${gameRequest}"\n`);
  
  // Take screenshot of typed message
  await page.screenshot({ path: 'test-results/02-message-typed.png' });

  // Step 5: Send the message
  console.log('📤 STEP 5: Sending the request...');
  
  // Try pressing Enter or clicking a send button
  // First, let's try to find a send button
  const sendButton = page.locator('button[type="submit"], button:has-text("Send"), button:has-text("Create"), button[aria-label*="send" i]').first();
  
  if (await sendButton.count() > 0) {
    await sendButton.click();
    console.log('   ✓ Clicked send button!\n');
  } else {
    // Try pressing Enter
    await page.keyboard.press('Enter');
    console.log('   ✓ Pressed Enter to send!\n');
  }

  // Step 6: Wait for AI to generate code
  console.log('⏳ STEP 6: Waiting for AI to generate code...');
  console.log('   (This usually takes 10-30 seconds)');
  
  // Wait and take periodic screenshots
  for (let i = 1; i <= 6; i++) {
    await page.waitForTimeout(5000);
    console.log(`   ... ${i * 5} seconds...`);
    
    // Check if code appeared
    const codeEditor = page.locator('.monaco-editor, .view-lines, pre code');
    if (await codeEditor.count() > 0) {
      console.log('   ✓ Code is appearing!\n');
      break;
    }
  }
  
  await page.screenshot({ path: 'test-results/03-after-generation.png' });
  console.log('   ✓ Screenshot saved: 03-after-generation.png\n');

  // Step 7: Check the preview
  console.log('🖼️ STEP 7: Checking the preview panel...');
  const previewFrame = page.locator('iframe').first();
  
  if (await previewFrame.count() > 0) {
    console.log('   ✓ Preview iframe found!\n');
    await page.screenshot({ path: 'test-results/04-preview.png' });
  } else {
    console.log('   ℹ️ No preview iframe visible yet\n');
  }

  // Step 8: Try the share button
  console.log('📤 STEP 8: Looking for share functionality...');
  const shareButton = page.locator('button:has-text("Share")').first();
  
  if (await shareButton.count() > 0 && await shareButton.isEnabled()) {
    console.log('   ✓ Share button found! Clicking...');
    await shareButton.click();
    await page.waitForTimeout(1500);
    await page.screenshot({ path: 'test-results/05-share-modal.png' });
    console.log('   ✓ Screenshot saved: 05-share-modal.png\n');
    
    // Close modal
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);
  } else {
    console.log('   ℹ️ Share button not available (need code first)\n');
  }

  // Step 9: Visit the gallery
  console.log('🏛️ STEP 9: Visiting the gallery...');
  await page.goto('http://localhost:3000/gallery');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);
  await page.screenshot({ path: 'test-results/06-gallery.png' });
  console.log('   ✓ Gallery loaded! Screenshot saved: 06-gallery.png\n');

  // Final summary
  console.log('═══════════════════════════════════════════════════════════');
  console.log('   🎉 TEST COMPLETE!');
  console.log('   ');
  console.log('   Screenshots saved in: kid-vibe-code/test-results/');
  console.log('   - 01-initial-load.png');
  console.log('   - 02-message-typed.png');
  console.log('   - 03-after-generation.png');
  console.log('   - 04-preview.png');
  console.log('   - 05-share-modal.png');
  console.log('   - 06-gallery.png');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('\n');
});
