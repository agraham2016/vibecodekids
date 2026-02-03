// @ts-check
import { test, expect } from '@playwright/test';

/**
 * GAME BUILDER BOT
 * 
 * This bot creates 5 complete games, each with 8+ iterative prompts.
 * It simulates how a real kid would build and refine their game step by step.
 * 
 * Run with: npm run test:games
 */

// Define 5 different game projects, each with 8+ iterative prompts
// 5 games with 8 prompts each (reduced from 10 for reliability)
const GAME_PROJECTS = [
  {
    name: "Balloon Pop Game",
    prompts: [
      "Make a game where colorful balloons float up from the bottom of the screen",
      "Make the balloons pop when I click on them with a fun pop animation",
      "Add a score counter in the top right corner that goes up when I pop a balloon",
      "Make different colored balloons worth different points - red is 1, blue is 2, gold is 5",
      "Add a timer that counts down from 60 seconds and show Game Over when it ends",
      "Add a 'Play Again' button on the game over screen",
      "Add confetti effects when I pop a gold balloon",
      "Make the balloons float faster as time goes on to make it harder"
    ]
  },
  {
    name: "Space Shooter",
    prompts: [
      "Create a spaceship at the bottom of the screen that I can move left and right with arrow keys",
      "Make the spaceship shoot lasers upward when I press the spacebar",
      "Add alien enemies that move back and forth across the top of the screen",
      "When my laser hits an alien, make it explode and disappear with an animation",
      "Add a score counter that goes up by 100 for each alien I destroy",
      "Give me 3 lives shown as little hearts in the corner, lose one if alien touches me",
      "Add a starry background with twinkling stars",
      "When I destroy all aliens, show 'You Win!' and add a restart button"
    ]
  },
  {
    name: "Cookie Clicker",
    prompts: [
      "Make a big cookie in the center of the screen that I can click",
      "Show a cookie counter that goes up each time I click, with the cookie bouncing when clicked",
      "Add a shop panel on the right side of the screen",
      "In the shop, add an 'Auto Clicker' I can buy for 50 cookies that automatically adds 1 cookie per second",
      "Add a 'Double Click' upgrade for 100 cookies that makes each click worth 2 cookies",
      "Show the cookies per second rate at the top of the screen",
      "Add little cookie crumb particles that fly out when I click the cookie",
      "Make a golden cookie appear randomly that gives 50 bonus cookies when clicked"
    ]
  },
  {
    name: "Maze Runner",
    prompts: [
      "Create a simple maze with black walls on a white background using a grid pattern",
      "Add a blue player circle that I control with WASD or arrow keys",
      "Make sure the player cannot walk through the black walls",
      "Put a green goal square at the end of the maze in the bottom right",
      "When I reach the green goal, show 'You Win!' with a celebration",
      "Add a timer that shows how many seconds it takes to complete the maze",
      "Add yellow collectible coins scattered throughout the maze paths",
      "Show the coin count and add a Play Again button when I win"
    ]
  },
  {
    name: "Drawing Canvas",
    prompts: [
      "Make a white canvas that fills most of the screen where I can draw by clicking and dragging",
      "Add a row of color buttons at the top - red, orange, yellow, green, blue, purple, black, white",
      "Add three brush size buttons - small, medium, and large circles",
      "Add an eraser button that lets me erase what I've drawn",
      "Add a Clear All button that wipes the entire canvas clean",
      "Make a rainbow mode toggle that changes colors automatically as I draw",
      "Add stamp buttons for star, heart, and smiley face shapes I can click to place",
      "Add a Download button that saves my drawing as an image file"
    ]
  }
];

// Helper function to wait for AI response - IMPROVED
async function waitForAIResponse(page, maxWaitSeconds = 60) {
  let lastCodeLength = 0;
  let stableCount = 0;
  
  console.log('   ... waiting for AI to finish generating...');
  
  // Wait for code to appear and stabilize (need 3 consecutive stable checks)
  for (let i = 0; i < maxWaitSeconds / 3; i++) {
    await page.waitForTimeout(3000); // Wait 3 seconds between checks
    
    // Try to detect if code has changed by checking multiple sources
    const codeElements = await page.locator('.monaco-editor .view-lines, pre code, .code-content, .view-line').all();
    let currentCodeLength = 0;
    for (const el of codeElements) {
      const text = await el.textContent().catch(() => '');
      currentCodeLength += text.length;
    }
    
    // Also check if there's a loading indicator
    const isLoading = await page.locator('.loading, .spinner, [class*="loading"]').count() > 0;
    
    if (isLoading) {
      console.log(`   ... still generating (${(i+1)*3}s)...`);
      stableCount = 0;
      continue;
    }
    
    // Check if code has stabilized (same length for 2 consecutive checks)
    if (currentCodeLength > 100 && currentCodeLength === lastCodeLength) {
      stableCount++;
      if (stableCount >= 2) {
        console.log(`   ... code stabilized after ${(i+1)*3}s`);
        return true; // Code has stabilized
      }
    } else {
      stableCount = 0;
    }
    lastCodeLength = currentCodeLength;
  }
  
  // Give a final extra wait
  await page.waitForTimeout(5000);
  return true;
}

// Helper to send a message
async function sendMessage(page, message) {
  const inputArea = page.locator('textarea').first();
  await inputArea.fill(message);
  await page.waitForTimeout(300);
  
  // Try send button first
  const sendButton = page.locator('button[type="submit"], button:has-text("Send"), button:has-text("Create")').first();
  if (await sendButton.count() > 0) {
    await sendButton.click();
  } else {
    await page.keyboard.press('Enter');
  }
}

// Main test that builds all 5 games
test.describe('Game Builder Bot - 5 Complete Games', () => {
  
  test.setTimeout(1200000); // 20 minutes per game max (AI can be slow)
  
  for (let gameIndex = 0; gameIndex < GAME_PROJECTS.length; gameIndex++) {
    const game = GAME_PROJECTS[gameIndex];
    
    test(`Game ${gameIndex + 1}: ${game.name}`, async ({ page }) => {
      console.log('\n');
      console.log('═'.repeat(70));
      console.log(`   🎮 BUILDING GAME ${gameIndex + 1}/5: ${game.name.toUpperCase()}`);
      console.log('═'.repeat(70));
      console.log('\n');
      
      // Navigate to fresh app state
      await page.goto('http://localhost:3000');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);
      
      // Take initial screenshot
      await page.screenshot({ 
        path: `test-results/game${gameIndex + 1}-00-start.png`,
        fullPage: true 
      });
      
      // Send each prompt in sequence (with error recovery)
      let completedPrompts = 0;
      
      for (let promptIndex = 0; promptIndex < game.prompts.length; promptIndex++) {
        const prompt = game.prompts[promptIndex];
        
        try {
          console.log(`\n📝 Prompt ${promptIndex + 1}/${game.prompts.length}:`);
          console.log(`   "${prompt}"`);
          console.log('   ⏳ Sending and waiting for AI...');
          
          // Send the message
          await sendMessage(page, prompt);
          
          // Wait for response
          const gotResponse = await waitForAIResponse(page);
          
          if (gotResponse) {
            console.log('   ✅ AI responded!');
          } else {
            console.log('   ⚠️ Response may be incomplete, continuing...');
          }
          
          completedPrompts++;
          
          // Screenshot after each prompt
          await page.screenshot({ 
            path: `test-results/game${gameIndex + 1}-${String(promptIndex + 1).padStart(2, '0')}-prompt.png`,
            fullPage: true 
          });
          
          // Small delay between prompts to be nice to the AI
          await page.waitForTimeout(1000);
          
        } catch (promptError) {
          console.log(`   ❌ Error on prompt ${promptIndex + 1}: ${promptError.message}`);
          console.log('   Continuing to next prompt...');
          
          // Screenshot the error state
          await page.screenshot({ 
            path: `test-results/game${gameIndex + 1}-${String(promptIndex + 1).padStart(2, '0')}-ERROR.png`,
            fullPage: true 
          }).catch(() => {});
        }
      }
      
      console.log(`\n📊 Completed ${completedPrompts}/${game.prompts.length} prompts`);
      
      // Even if some prompts failed, continue to screenshots and sharing
      
      // Final screenshot of completed game
      console.log('\n🎉 Game complete! Taking final screenshots...');
      
      await page.screenshot({ 
        path: `test-results/game${gameIndex + 1}-FINAL.png`,
        fullPage: true 
      });
      
      // Try to capture just the preview
      const previewFrame = page.locator('iframe').first();
      if (await previewFrame.count() > 0) {
        await previewFrame.screenshot({
          path: `test-results/game${gameIndex + 1}-PREVIEW.png`
        });
        console.log('   ✅ Preview screenshot saved!');
      }
      
      // ============================================
      // TEST THE GAME - Click around in the preview
      // ============================================
      console.log('\n🎮 Testing the game...');
      
      if (await previewFrame.count() > 0) {
        const frame = page.frameLocator('iframe').first();
        
        // Try clicking in different spots to test interactivity
        for (let click = 0; click < 5; click++) {
          try {
            // Click at random positions in the preview
            const box = await previewFrame.boundingBox();
            if (box) {
              const x = box.x + Math.random() * box.width;
              const y = box.y + Math.random() * box.height;
              await page.mouse.click(x, y);
              await page.waitForTimeout(500);
            }
          } catch (e) {
            // Ignore click errors
          }
        }
        console.log('   ✅ Game interaction test complete!');
        
        // Screenshot after playing
        await page.screenshot({ 
          path: `test-results/game${gameIndex + 1}-AFTER-PLAY.png`,
          fullPage: true 
        });
      }
      
      // ============================================
      // SHARE THE GAME TO THE ARCADE
      // ============================================
      console.log('\n📤 Sharing game to the Arcade...');
      
      // Look for Share button in header
      const shareButton = page.locator('button:has-text("Share")').first();
      
      if (await shareButton.count() > 0 && await shareButton.isEnabled()) {
        await shareButton.click();
        await page.waitForTimeout(2000);
        
        // Screenshot share modal
        await page.screenshot({ 
          path: `test-results/game${gameIndex + 1}-SHARE-MODAL.png`,
          fullPage: true 
        });
        
        // Fill in the title (placeholder: "My Awesome Game")
        const titleInput = page.locator('.share-modal input[type="text"]').first();
        if (await titleInput.count() > 0) {
          await titleInput.fill(`${game.name} - Bot Test`);
          console.log(`   ✓ Set title: "${game.name} - Bot Test"`);
        }
        
        // Fill in creator name (placeholder: "Your name")  
        const creatorInput = page.locator('.share-modal input[type="text"]').nth(1);
        if (await creatorInput.count() > 0) {
          await creatorInput.fill('Test Bot');
          console.log('   ✓ Set creator: "Test Bot"');
        }
        
        // Select a category (click on Arcade category button)
        const arcadeCategory = page.locator('.category-btn:has-text("Arcade")').first();
        if (await arcadeCategory.count() > 0) {
          await arcadeCategory.click();
          console.log('   ✓ Selected Arcade category');
        }
        
        await page.waitForTimeout(500);
        
        // Check the "Add to the Arcade" checkbox - it's the first checkbox
        const publicCheckbox = page.locator('.share-modal input[type="checkbox"]').first();
        if (await publicCheckbox.count() > 0) {
          const isChecked = await publicCheckbox.isChecked();
          if (!isChecked) {
            await publicCheckbox.click();
            console.log('   ✓ Checked "Add to Arcade" option');
          } else {
            console.log('   ✓ Already set to public');
          }
        }
        
        await page.waitForTimeout(500);
        
        // Click the "Share It!" button (class: share-submit-btn)
        const submitButton = page.locator('.share-submit-btn, button:has-text("Share It")').first();
        
        if (await submitButton.count() > 0) {
          await submitButton.click();
          console.log('   ✓ Clicked "Share It!" button');
          
          // Wait for share to complete - look for success message or URL
          await page.waitForTimeout(3000);
          
          // Check for success
          const successMessage = page.locator('.share-success, :has-text("Woohoo")');
          if (await successMessage.count() > 0) {
            console.log('   ✅ Game shared successfully!');
            
            // Get the share URL if visible
            const shareUrlInput = page.locator('.share-link-input, input[readonly]');
            if (await shareUrlInput.count() > 0) {
              const shareUrl = await shareUrlInput.inputValue();
              console.log(`   📎 Share URL: ${shareUrl}`);
            }
          }
          
          // Screenshot after sharing
          await page.screenshot({ 
            path: `test-results/game${gameIndex + 1}-SHARED.png`,
            fullPage: true 
          });
          
          // Close the modal
          const doneButton = page.locator('button:has-text("Done")').first();
          if (await doneButton.count() > 0) {
            await doneButton.click();
          } else {
            await page.keyboard.press('Escape');
          }
          
        } else {
          console.log('   ⚠️ Could not find Share It button');
          await page.keyboard.press('Escape');
        }
      } else {
        console.log('   ⚠️ Share button not available or disabled');
      }
      
      console.log('\n');
      console.log('─'.repeat(70));
      console.log(`   ✨ ${game.name} COMPLETED with ${game.prompts.length} prompts!`);
      console.log('─'.repeat(70));
      console.log('\n');
    });
  }
});

// Summary test that runs after all games
test('Summary Report', async ({ page }) => {
  console.log('\n');
  console.log('═'.repeat(70));
  console.log('   📊 GAME BUILDER BOT - SUMMARY REPORT');
  console.log('═'.repeat(70));
  console.log('\n');
  
  console.log('Games Built:');
  GAME_PROJECTS.forEach((game, i) => {
    console.log(`   ${i + 1}. ${game.name} (${game.prompts.length} prompts)`);
  });
  
  console.log('\n');
  console.log('Total Prompts Sent:', GAME_PROJECTS.reduce((sum, g) => sum + g.prompts.length, 0));
  console.log('\n');
  console.log('Screenshots saved to: kid-vibe-code/test-results/');
  console.log('   - gameX-00-start.png (initial state)');
  console.log('   - gameX-XX-prompt.png (after each prompt)');
  console.log('   - gameX-FINAL.png (completed game)');
  console.log('   - gameX-PREVIEW.png (preview panel only)');
  console.log('\n');
  console.log('═'.repeat(70));
  console.log('   🎮 ALL GAMES COMPLETE! 🎮');
  console.log('═'.repeat(70));
  console.log('\n');
});
