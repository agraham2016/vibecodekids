import { test, expect } from '@playwright/test';

test.describe('Defense Template Runtime Regression Tests', () => {
  test('crystal-defense loads with visible HUD and canvas', async ({ page }) => {
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

    await page.goto('http://localhost:3001/dev/template/crystal-defense', {
      waitUntil: 'networkidle',
      timeout: 15000,
    });

    await page.waitForTimeout(2000);

    await expect(page.locator('canvas')).toHaveCount(1);
    await expect(page.locator('#hud')).toBeVisible();

    const hudText = await page.locator('#hud').textContent();
    expect(hudText).toContain('Vibe 2D Crystal Defense');
    expect(hudText).toContain('Crystal HP');
    expect(hudText).toContain('Wave:');
    expect(hudText).toContain('Guardians:');

    expect(jsErrors, 'No JS errors for crystal-defense').toHaveLength(0);
    expect(consoleErrors, 'No console errors for crystal-defense').toHaveLength(0);
  });
});
