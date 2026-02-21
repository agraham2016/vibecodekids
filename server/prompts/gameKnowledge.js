/**
 * Game mechanics knowledge base.
 * Gives the AI deeper knowledge of Phaser.js game design patterns.
 * Raw Canvas/Web Audio patterns kept as fallback for non-game projects.
 */

export const GAME_KNOWLEDGE_BASE = `
PHASER.JS GAME DESIGN PATTERNS AND TECHNIQUES:

1. GAME SETUP (every 2D game starts like this):
   const config = {
     type: Phaser.AUTO,
     width: 800, height: 600,
     parent: 'game',
     physics: { default: 'arcade', arcade: { gravity: { y: 0 }, debug: false } },
     scene: { preload, create, update }
   };
   const game = new Phaser.Game(config);
   - Set gravity.y in config for platformers (e.g. 800), leave 0 for top-down games
   - Use parent: 'game' with a <div id="game"> for embedding

2. LOADING SPRITES AND SOUNDS (preferred — use pre-made assets):
   function preload() {
     // Load sprites from the asset library
     this.load.image('player', '/assets/sprites/platformer/player.png');
     this.load.image('coin', '/assets/sprites/platformer/coin.png');
     this.load.image('enemy', '/assets/sprites/platformer/enemy.png');
     this.load.image('particle', '/assets/sprites/common/particle.png');
     // Load spritesheets (for animation)
     this.load.spritesheet('explosion', '/assets/sprites/shooter/explosion.png', { frameWidth: 64, frameHeight: 64 });
     this.load.spritesheet('gems', '/assets/sprites/puzzle/gems.png', { frameWidth: 32, frameHeight: 32 });
     // Load sounds
     this.load.audio('jump', '/assets/sounds/jump.wav');
     this.load.audio('coin', '/assets/sounds/coin.wav');
     this.load.audio('explosion', '/assets/sounds/explosion.wav');
   }
   - Check the AVAILABLE ASSETS section for sprites matching the current genre
   - Play sounds: this.sound.play('coin');  this.sound.play('jump');
   - Common sprites (heart, star, particle) work in any genre

3. GENERATING TEXTURES (fallback for custom/unusual themes):
   If no pre-made sprite fits the kid's request, generate one procedurally:
     const gfx = this.make.graphics({ add: false });
     gfx.fillStyle(0x44aaff); gfx.fillRect(0, 0, 40, 48);
     gfx.generateTexture('player', 40, 48); gfx.destroy();
   - Use this for unique themes like "pizza character" or "rainbow unicorn"
   - Can draw circles with gfx.fillCircle(cx, cy, r)

4. PLAYER MOVEMENT (arcade physics):
   // In create():
   player = this.physics.add.sprite(400, 300, 'player');
   player.setCollideWorldBounds(true);
   cursors = this.input.keyboard.createCursorKeys();

   // In update() — Top-down movement:
   player.setVelocity(0);
   if (cursors.left.isDown) player.setVelocityX(-200);
   if (cursors.right.isDown) player.setVelocityX(200);
   if (cursors.up.isDown) player.setVelocityY(-200);
   if (cursors.down.isDown) player.setVelocityY(200);

   // In update() — Platformer movement:
   if (cursors.left.isDown) player.setVelocityX(-200);
   else if (cursors.right.isDown) player.setVelocityX(200);
   else player.setVelocityX(0);
   if (cursors.up.isDown && player.body.touching.down) player.setVelocityY(-400);

5. PLATFORMS AND COLLIDERS:
   // In create():
   platforms = this.physics.add.staticGroup();
   platforms.create(400, 580, 'ground');  // x, y, texture key
   platforms.create(200, 400, 'platform');
   this.physics.add.collider(player, platforms);
   - staticGroup objects don't move when collided with
   - Use collider for solid surfaces, overlap for collectibles/triggers

6. COLLECTIBLES AND SCORING:
   // In create():
   coins = this.physics.add.group();
   for (let i = 0; i < 10; i++) {
     coins.create(Phaser.Math.Between(50, 750), Phaser.Math.Between(50, 550), 'coin');
   }
   this.physics.add.overlap(player, coins, collectCoin, null, this);
   scoreText = this.add.text(16, 16, 'Score: 0', { fontSize: '28px', fill: '#fff' });

   function collectCoin(player, coin) {
     coin.destroy();
     score += 10;
     scoreText.setText('Score: ' + score);
   }

7. ENEMIES AND SPAWNING:
   // In create():
   enemies = this.physics.add.group();
   this.time.addEvent({ delay: 2000, callback: spawnEnemy, callbackScope: this, loop: true });
   this.physics.add.overlap(bullets, enemies, hitEnemy, null, this);
   this.physics.add.overlap(player, enemies, playerHit, null, this);

   function spawnEnemy() {
     const x = Phaser.Math.Between(50, 750);
     const enemy = enemies.create(x, 0, 'enemy');
     enemy.setVelocityY(Phaser.Math.Between(80, 200));
   }

8. SHOOTING / PROJECTILES:
   // In create():
   bullets = this.physics.add.group();
   fireKey = this.input.keyboard.addKey('SPACE');

   // In update():
   if (Phaser.Input.Keyboard.JustDown(fireKey)) {
     const bullet = bullets.create(player.x, player.y - 20, 'bullet');
     bullet.setVelocityY(-400);
   }
   // Clean up off-screen bullets:
   bullets.children.each(b => { if (b.y < -10) b.destroy(); });

9. CAMERA AND SCROLLING:
   // In create():
   this.cameras.main.startFollow(player, true, 0.1, 0.1);
   this.cameras.main.setBounds(0, 0, worldWidth, worldHeight);
   this.physics.world.setBounds(0, 0, worldWidth, worldHeight);

10. PARTICLES AND EFFECTS:
   // Explosion on enemy death:
   function hitEnemy(bullet, enemy) {
     this.add.particles(enemy.x, enemy.y, 'particle', {
       speed: { min: 50, max: 200 }, lifespan: 400, quantity: 15,
       scale: { start: 1, end: 0 }, emitting: false
     }).explode();
     enemy.destroy(); bullet.destroy(); score += 100;
   }
   // Camera effects:
   this.cameras.main.shake(150, 0.01);   // screen shake
   this.cameras.main.flash(100, 255, 255, 255);  // white flash

11. TWEENS (smooth animations):
    // Coin bounce:
    this.tweens.add({ targets: coin, y: coin.y - 10, duration: 500, yoyo: true, repeat: -1 });
    // Scale pulse:
    this.tweens.add({ targets: sprite, scaleX: 1.2, scaleY: 1.2, duration: 100, yoyo: true });
    // Float up and fade (score popup):
    const txt = this.add.text(x, y, '+100', { fontSize: '20px', fill: '#ff0' });
    this.tweens.add({ targets: txt, y: y - 50, alpha: 0, duration: 800, onComplete: () => txt.destroy() });

12. GAME STATE MANAGEMENT:
    - Use scene methods: this.scene.restart() to restart
    - this.scene.pause() / this.scene.resume() for pause
    - For game over: show overlay text, listen for key to restart
    - For multiple levels: this.scene.start('Level2') with separate scene classes

13. TILEMAPS (for RPG/adventure worlds):
    // Create a tilemap from a 2D array:
    const level = [
      [1,1,1,1,1],
      [1,0,0,0,1],
      [1,0,0,0,1],
      [1,1,1,1,1]
    ];
    // Loop through and place tiles as staticGroup members

14. MOBILE / TOUCH SUPPORT (REQUIRED FOR ALL GAMES):

    A) SCALE MANAGER — include in EVERY Phaser config:
       scale: {
         mode: Phaser.Scale.FIT,
         autoCenter: Phaser.Scale.CENTER_BOTH
       }
       This auto-scales the canvas to fill the device screen while preserving aspect ratio.

    B) VIEWPORT META — include in <head> of EVERY game HTML:
       <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">

    C) TOUCH-ACTION CSS — add to body style in EVERY game:
       body { touch-action: none; }
       This prevents browser swipe/pinch gestures from interfering with gameplay.

    D) VIRTUAL TOUCH BUTTONS — for any game using keyboard controls, add on-screen buttons:
       // Only show on touch devices:
       if ('ontouchstart' in window) {
         const btnLeft = this.add.rectangle(70, height - 60, 80, 80, 0xffffff, 0.25)
           .setScrollFactor(0).setDepth(1000).setInteractive();
         const btnRight = this.add.rectangle(170, height - 60, 80, 80, 0xffffff, 0.25)
           .setScrollFactor(0).setDepth(1000).setInteractive();
         const btnJump = this.add.rectangle(width - 70, height - 60, 80, 80, 0xffffff, 0.25)
           .setScrollFactor(0).setDepth(1000).setInteractive();

         // Add arrow/label text on each button
         this.add.text(70, height - 60, '◀', { fontSize: '28px' }).setOrigin(0.5).setScrollFactor(0).setDepth(1001);
         this.add.text(170, height - 60, '▶', { fontSize: '28px' }).setOrigin(0.5).setScrollFactor(0).setDepth(1001);
         this.add.text(width - 70, height - 60, '▲', { fontSize: '28px' }).setOrigin(0.5).setScrollFactor(0).setDepth(1001);

         // Wire button events to the same variables keyboard uses:
         btnLeft.on('pointerdown', () => { touchLeft = true; });
         btnLeft.on('pointerup', () => { touchLeft = false; });
         btnLeft.on('pointerout', () => { touchLeft = false; });
         btnRight.on('pointerdown', () => { touchRight = true; });
         btnRight.on('pointerup', () => { touchRight = false; });
         btnRight.on('pointerout', () => { touchRight = false; });
         btnJump.on('pointerdown', () => { touchJump = true; });
         btnJump.on('pointerup', () => { touchJump = false; });
         btnJump.on('pointerout', () => { touchJump = false; });
       }

       // In update(), check BOTH keyboard and touch:
       if (cursors.left.isDown || touchLeft) player.setVelocityX(-200);
       if (cursors.up.isDown || touchJump) player.setVelocityY(-400);

    E) POINTER EVENTS (games controlled by tap/click):
       - Phaser handles touch automatically for pointer events (pointerdown, pointerup, pointermove)
       - this.input.on('pointerdown', callback) works for both mouse click and touch tap
       - For drag: use this.input.on('pointermove', callback) — works on touch too
       - No extra code needed for clicker, puzzle, bubble-shooter, etc.

    F) BUTTON SIZING — touch buttons must be at least 44x44 pixels for fingers

FALLBACK: RAW CANVAS / WEB AUDIO (only for non-game projects):
- Canvas API: ctx.fillRect, ctx.drawImage, ctx.arc for 2D drawing
- requestAnimationFrame for animation loops
- Web Audio API: OscillatorNode for beeps, createBuffer for noise
- These are for art tools, visualizations, and non-game creative projects ONLY
- For GAMES, always use Phaser.js instead
`;
