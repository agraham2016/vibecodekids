import { test, expect } from '@playwright/test';

test.describe('RPG Template Runtime Regression Tests', () => {
  test('village-quest loads with visible HUD and canvas', async ({ page }) => {
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

    await page.goto('http://localhost:3001/dev/template/village-quest', {
      waitUntil: 'networkidle',
      timeout: 15000,
    });

    await page.waitForTimeout(2000);

    await expect(page.locator('canvas')).toHaveCount(1);
    await expect(page.locator('#hud')).toBeVisible();

    const hudText = await page.locator('#hud').textContent();
    expect(hudText).toContain('Vibe 2D Village Quest');
    expect(hudText).toContain('Level:');
    expect(hudText).toContain('XP:');
    expect(hudText).toContain('Quest Log:');

    expect(jsErrors, 'No JS errors for village-quest').toHaveLength(0);
    expect(consoleErrors, 'No console errors for village-quest').toHaveLength(0);
  });
});
