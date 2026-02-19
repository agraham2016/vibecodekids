/**
 * UI Components Snippet (Phaser.js)
 * HUD, health bars, menus, shop screens, score displays.
 * Common UI patterns every game needs.
 */

export const UI_COMPONENTS_SNIPPET = `
// ===== PHASER UI COMPONENT PATTERNS =====

// --- Score Text (stays fixed to camera) ---
//   scoreText = this.add.text(16, 16, 'Score: 0', {
//     fontSize: '28px', fill: '#ffffff',
//     stroke: '#000000', strokeThickness: 4
//   }).setScrollFactor(0).setDepth(100);
//
//   // Update: scoreText.setText('Score: ' + score);

// --- Health Bar (graphics-based, follows camera) ---
//   function createHealthBar(scene, x, y) {
//     const bg = scene.add.rectangle(x, y, 200, 20, 0x333333).setScrollFactor(0).setDepth(100);
//     const fill = scene.add.rectangle(x - 98, y, 196, 16, 0x44ff44)
//       .setOrigin(0, 0.5).setScrollFactor(0).setDepth(101);
//     return { bg, fill, update(hp, maxHp) {
//       const pct = hp / maxHp;
//       fill.width = 196 * pct;
//       fill.fillColor = pct > 0.5 ? 0x44ff44 : pct > 0.25 ? 0xffaa00 : 0xff4444;
//     }};
//   }
//   const hpBar = createHealthBar(this, 120, 30);
//   // In update or damage callback: hpBar.update(player.hp, player.maxHp);

// --- Lives Display (emoji/text) ---
//   livesText = this.add.text(780, 16, '❤️❤️❤️', { fontSize: '24px' })
//     .setOrigin(1, 0).setScrollFactor(0).setDepth(100);
//   // Update: livesText.setText('❤️'.repeat(lives));

// --- Game Over Overlay ---
//   function showGameOver(scene, score) {
//     const overlay = scene.add.rectangle(400, 250, 800, 500, 0x000000, 0.7)
//       .setScrollFactor(0).setDepth(200);
//     scene.add.text(400, 180, 'GAME OVER', {
//       fontSize: '48px', fill: '#ff4444', stroke: '#000', strokeThickness: 5
//     }).setOrigin(0.5).setScrollFactor(0).setDepth(201);
//     scene.add.text(400, 250, 'Score: ' + score, {
//       fontSize: '28px', fill: '#ffffff'
//     }).setOrigin(0.5).setScrollFactor(0).setDepth(201);
//     scene.add.text(400, 320, 'Press SPACE to play again', {
//       fontSize: '20px', fill: '#aaaaaa'
//     }).setOrigin(0.5).setScrollFactor(0).setDepth(201);
//     scene.input.keyboard.once('keydown-SPACE', () => scene.scene.restart());
//   }

// --- Title Screen ---
//   function showTitle(scene, title) {
//     const bg = scene.add.rectangle(400, 250, 800, 500, 0x000000, 0.8).setDepth(200);
//     const t = scene.add.text(400, 180, title, {
//       fontSize: '52px', fill: '#ffcc00', stroke: '#000', strokeThickness: 6
//     }).setOrigin(0.5).setDepth(201);
//     const sub = scene.add.text(400, 280, 'Press SPACE to Start', {
//       fontSize: '22px', fill: '#ffffff'
//     }).setOrigin(0.5).setDepth(201);
//     scene.tweens.add({ targets: sub, alpha: 0.3, duration: 800, yoyo: true, repeat: -1 });
//     scene.input.keyboard.once('keydown-SPACE', () => { bg.destroy(); t.destroy(); sub.destroy(); });
//   }

// --- Shop / Upgrade Buttons ---
//   function createShopButton(scene, x, y, label, cost, onBuy) {
//     const btn = scene.add.rectangle(x, y, 180, 50, 0x334466).setInteractive().setDepth(100);
//     const txt = scene.add.text(x, y, label + ' ($' + cost + ')', {
//       fontSize: '14px', fill: '#fff'
//     }).setOrigin(0.5).setDepth(101);
//     btn.on('pointerover', () => btn.setFillStyle(0x446688));
//     btn.on('pointerout', () => btn.setFillStyle(0x334466));
//     btn.on('pointerdown', () => { if (score >= cost) { score -= cost; onBuy(); } });
//     return { btn, txt, updateLabel(l) { txt.setText(l); } };
//   }

// --- Combo Counter ---
//   let combo = 0, comboTimer = null;
//   function addCombo(scene) {
//     combo++;
//     if (comboTimer) comboTimer.remove();
//     comboTimer = scene.time.delayedCall(2000, () => { combo = 0; });
//     if (combo >= 3) {
//       const txt = scene.add.text(400, 200, combo + 'x COMBO!', {
//         fontSize: '36px', fill: '#ffff00', stroke: '#000', strokeThickness: 4
//       }).setOrigin(0.5).setDepth(150);
//       scene.tweens.add({ targets: txt, y: 150, alpha: 0, duration: 1000, onComplete: () => txt.destroy() });
//     }
//   }
`;
