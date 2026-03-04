// @ts-check
import { test, expect } from '@playwright/test';

/**
 * Gate 6.2 User Test: Signup → First Game in < 2 Minutes
 *
 * Path A (age 13): Full flow from landing page signup through first game creation.
 * Reference: docs/GATE_6_2_USER_TEST_SCRIPT.md
 * LAUNCH_READINESS.md Gate 6.2
 *
 * Prerequisites: ANTHROPIC_API_KEY in .env, server running, built frontend.
 * Run: npm run build && node server/index.js (in one terminal), then
 *      PLAYWRIGHT_BASE_URL=http://localhost:3001 npm run test:gate62
 */

const UNIQUE_USERNAME = `gate62_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

test.describe('Gate 6.2: Signup → First Game', () => {
  test.setTimeout(180000); // 3 min — AI generation can take 60+ sec

  test('Path A: Age 13 signup → Studio → first game', async ({ page }) => {
    const startTime = Date.now();

    // --- Phase 1: Signup ---
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // 1.1 Click signup CTA (works on both Landing A and B)
    await page.getByRole('button', { name: /Get Started Free/i }).first().click();

    // 1.2 Plan selector: Continue with Free Trial (Free is default)
    await page.getByRole('button', { name: /Continue with Free Trial/i }).click();

    // 1.3–1.8 Fill signup form
    await page.getByLabel(/Display Name/i).fill('TestKid');
    await page.getByLabel(/How old are you/i).fill('13');
    await page.getByLabel(/Username/i).fill(UNIQUE_USERNAME);
    await page.getByLabel(/Password/i).fill('TestPass123!');
    await page.getByLabel(/I agree to the.*Privacy Policy/i).check();

    // 1.9 Submit
    await page.getByRole('button', { name: /Let's Go!/i }).click();

    // Wait for redirect to Studio (welcome overlay)
    await expect(page.locator('.welcome-overlay, .welcome-card')).toBeVisible({ timeout: 15000 });

    const signupTime = (Date.now() - startTime) / 1000;
    console.log(`  Phase 1 (signup): ${signupTime.toFixed(1)}s`);

    // --- Phase 2: First game ---
    const phase2Start = Date.now();

    // 2.2 Click "I Know What I Want!" (faster than Help Me Pick)
    await page.getByRole('button', { name: /I Know What I Want/i }).click();

    // 2.3b Type game prompt in chat
    const chatInput = page.locator('.chat-input-area textarea');
    await expect(chatInput).toBeVisible({ timeout: 5000 });
    await chatInput.fill('Make me a simple platformer with a jumping character');
    await chatInput.press('Enter');

    // 2.4 Wait for AI to finish, then verify game generated
    await page.locator('.chat-message.assistant.loading').waitFor({ state: 'detached', timeout: 90000 });
    await expect(page.locator('.chat-message.assistant:not(.loading)')).toHaveCount(1, { timeout: 5000 });
    await expect(page.locator('.preview-iframe')).toBeVisible();

    const gameTime = (Date.now() - phase2Start) / 1000;
    const totalTime = (Date.now() - startTime) / 1000;
    console.log(`  Phase 2 (first game): ${gameTime.toFixed(1)}s`);
    console.log(`  Total: ${totalTime.toFixed(1)}s (target < 120s)`);

    expect(totalTime).toBeLessThan(180); // Automated test allows 3 min; manual target is 2 min
  });
});
