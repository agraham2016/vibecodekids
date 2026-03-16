import { test, expect } from '@playwright/test';

test.describe('Sports Template Runtime Regression Tests', () => {
  test('trick-shot-arena loads with visible HUD and canvas', async ({ page }) => {
    const consoleErrors = [];
    const jsErrors = [];

    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    page.on('pageerror', (error) => {
      jsErrors.push(error.message);
    });

    await page.goto('http://localhost:3001/dev/template/trick-shot-arena', {
      waitUntil: 'networkidle',
      timeout: 15000,
    });

    await page.waitForTimeout(2000);

    await expect(page.locator('canvas')).toHaveCount(1);
    await expect(page.locator('#hud')).toBeVisible();

    const hudText = await page.locator('#hud').textContent();
    expect(hudText).toContain('Vibe 2D Trick Shot Arena');
    expect(hudText).toContain('Score:');
    expect(hudText).toContain('Round:');
    expect(hudText).toContain('Shots Left:');

    expect(jsErrors, 'No JS errors for trick-shot-arena').toHaveLength(0);
    expect(consoleErrors, 'No console errors for trick-shot-arena').toHaveLength(0);
  });
});
