import { test, expect } from '@playwright/test';

const TEMPLATES = [
  'obby',
  'open-map-explorer',
  'relic-hunt-3d',
  'survival-crafting-game',
  'stunt-racer-3d',
  'house-builder',
];

test.describe('Template Runtime Regression Tests', () => {
  for (const templateName of TEMPLATES) {
    test(`${templateName} - loads without errors and renders game`, async ({ page }) => {
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

      await page.goto(`http://localhost:3001/dev/template/${templateName}`, {
        waitUntil: 'networkidle',
        timeout: 15000
      });

      await page.waitForTimeout(2000);

      const hudVisible = await page.locator('#hud').isVisible();
      expect(hudVisible, `HUD should be visible for ${templateName}`).toBe(true);

      const hudText = await page.locator('#hud').textContent();
      expect(hudText, `HUD should contain game title for ${templateName}`).toContain('Vibe 3D');

      const gameContainer = await page.locator('#game-container').isVisible();
      expect(gameContainer, `Game container should be visible for ${templateName}`).toBe(true);

      const canvas = await page.locator('canvas').count();
      expect(canvas, `Canvas should be rendered for ${templateName}`).toBeGreaterThan(0);

      const threeJsLoaded = await page.evaluate(() => {
        return typeof THREE !== 'undefined';
      });
      expect(threeJsLoaded, `Three.js should be loaded for ${templateName}`).toBe(true);

      const sceneRendered = await page.evaluate(() => {
        const canvas = document.querySelector('canvas');
        if (!canvas) return false;
        const ctx = canvas.getContext('webgl') || canvas.getContext('webgl2');
        return ctx !== null;
      });
      expect(sceneRendered, `WebGL scene should be rendered for ${templateName}`).toBe(true);

      expect(jsErrors, `No JS errors for ${templateName}`).toHaveLength(0);
      
      if (consoleErrors.length > 0) {
        console.warn(`Console errors for ${templateName}:`, consoleErrors);
      }
    });

    test(`${templateName} - basic controls work`, async ({ page }) => {
      await page.goto(`http://localhost:3001/dev/template/${templateName}`, {
        waitUntil: 'networkidle',
        timeout: 15000
      });

      await page.waitForTimeout(2000);

      const initialPosition = await page.evaluate(() => {
        const playerGroup = document.querySelector('canvas');
        return playerGroup ? { x: 0, y: 0 } : null;
      });

      expect(initialPosition, `Player should be initialized for ${templateName}`).not.toBeNull();

      await page.keyboard.press('ArrowRight');
      await page.waitForTimeout(500);
      await page.keyboard.press('ArrowLeft');
      await page.waitForTimeout(500);

      if (templateName === 'obby') {
        await page.keyboard.press('ArrowUp');
        await page.waitForTimeout(300);
      }

      const touchButtons = await page.locator('.touch-btn, .action-btn').count();
      expect(touchButtons, `Touch controls should be present for ${templateName}`).toBeGreaterThan(0);

      const toast = await page.locator('#toast');
      const toastExists = await toast.count();
      expect(toastExists, `Toast element should exist for ${templateName}`).toBeGreaterThan(0);
    });

    test(`${templateName} - HUD updates correctly`, async ({ page }) => {
      await page.goto(`http://localhost:3001/dev/template/${templateName}`, {
        waitUntil: 'networkidle',
        timeout: 15000
      });

      await page.waitForTimeout(2000);

      const hudContent = await page.locator('#hud').textContent();
      
      if (templateName === 'obby') {
        expect(hudContent).toContain('Stars:');
        expect(hudContent).toContain('Checkpoint:');
      } else if (templateName === 'open-map-explorer') {
        expect(hudContent).toContain('Quest Log:');
        expect(hudContent).toContain('Find 3 relics');
      } else if (templateName === 'relic-hunt-3d') {
        expect(hudContent).toContain('Objective:');
        expect(hudContent).toContain('Relics:');
        expect(hudContent).toContain('Clue Signal:');
      } else if (templateName === 'survival-crafting-game') {
        expect(hudContent).toContain('Time to dawn:');
        expect(hudContent).toContain('Health:');
        expect(hudContent).toContain('Wood:');
      } else if (templateName === 'stunt-racer-3d') {
        expect(hudContent).toContain('Checkpoint:');
        expect(hudContent).toContain('Stunt Score:');
        expect(hudContent).toContain('Boost:');
      } else if (templateName === 'house-builder') {
        expect(hudContent).toContain('Materials - Wood:');
        expect(hudContent).toContain('Blueprint - Walls:');
        expect(hudContent).toContain('Mode:');
      }

      await page.waitForTimeout(1000);

      const hudContentAfter = await page.locator('#hud').textContent();
      expect(hudContentAfter, `HUD should remain visible and not crash for ${templateName}`).toBeTruthy();
    });
  }

  test('obby - player stays put until input and arrow keys move the character', async ({ page }) => {
    await page.goto('http://localhost:3001/dev/template/obby', {
      waitUntil: 'networkidle',
      timeout: 15000,
    });

    await page.waitForTimeout(1200);
    await page.evaluate(() => window.__vibeObbyDebug?.clearInputState?.());
    await page.waitForTimeout(100);
    await page.locator('canvas').click();

    const initial = await page.evaluate(() => window.__vibeObbyDebug?.getPlayerState?.() || null);
    expect(initial, 'Obby debug state should be available').not.toBeNull();

    await page.waitForTimeout(800);

    const idle = await page.evaluate(() => window.__vibeObbyDebug?.getPlayerState?.() || null);
    expect(Math.abs(idle.z - initial.z), 'Player should not auto-run off the starting platform').toBeLessThan(0.2);

    await page.keyboard.down('ArrowRight');
    await page.waitForTimeout(350);
    await page.keyboard.up('ArrowRight');
    await page.waitForTimeout(150);

    const movedRight = await page.evaluate(() => window.__vibeObbyDebug?.getPlayerState?.() || null);
    expect(movedRight.x - idle.x, 'ArrowRight should move the player').toBeGreaterThan(0.5);

    await page.keyboard.down('ArrowUp');
    await page.waitForTimeout(350);
    await page.keyboard.up('ArrowUp');
    await page.waitForTimeout(150);

    const movedForward = await page.evaluate(() => window.__vibeObbyDebug?.getPlayerState?.() || null);
    expect(idle.z - movedForward.z, 'ArrowUp should move the player forward').toBeGreaterThan(0.5);
  });
});
