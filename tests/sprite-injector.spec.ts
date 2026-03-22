import { expect, test } from '@playwright/test';
import { injectSprites } from '../server/services/spriteInjector.js';

test.describe('sprite injector', () => {
  test('rewrites procedural RPG hero art to a real sprite key', async () => {
    const code = `
      class GameScene extends Phaser.Scene {
        preload() {
          const gfx = this.make.graphics({ add: false });
          gfx.fillStyle(0x66ccff);
          gfx.fillCircle(16, 16, 14);
          gfx.generateTexture('playerHero', 32, 32);
          gfx.destroy();
        }

        create() {
          this.player = this.physics.add.sprite(100, 100, 'playerHero');
        }
      }
    `;

    const repaired = await injectSprites(code, 'rpg');

    expect(repaired).toContain("this.load.image('hero', '/assets/sprites/kenney-tiny-dungeon/tile_0096.png');");
    expect(repaired).toContain("this.physics.add.sprite(100, 100, 'hero')");
    expect(repaired).not.toContain("generateTexture('playerHero'");
  });

  test('rewrites procedural racing car art to the canonical player car sprite', async () => {
    const code = `
      class RacingScene extends Phaser.Scene {
        preload() {
          const carCanvas = document.createElement('canvas');
          carCanvas.width = 64;
          carCanvas.height = 64;
          const ctx = carCanvas.getContext('2d');
          ctx.fillStyle = '#ff3333';
          ctx.fillRect(8, 8, 48, 48);
          this.textures.addCanvas('raceCarBody', carCanvas);
        }

        create() {
          this.player = this.physics.add.sprite(200, 300, 'raceCarBody');
        }
      }
    `;

    const repaired = await injectSprites(code, 'racing');

    expect(repaired).toContain("this.load.image('car-player', '/assets/sprites/kenney-racing/Cars/car_blue_1.png');");
    expect(repaired).toContain("this.physics.add.sprite(200, 300, 'car-player')");
    expect(repaired).not.toContain("addCanvas('raceCarBody'");
  });
});
