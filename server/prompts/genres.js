/**
 * Genre-specific AI rules for different game types.
 * These get injected into the system prompt when the AI detects or is told about a game genre.
 */

// Keywords for detecting game genre from free-text messages
export const GENRE_KEYWORDS = {
  racing: ['racing', 'race', 'car game', 'driving', 'dodge cars', 'racing game', 'car racing', 'drive'],
  'street-racing': ['street rod', 'street racing', 'drag race', 'drag racing', 'muscle car', 'hot rod', 'garage racing', 'car customization', 'tuning', 'nitro'],
  shooter: ['shooter', 'shooting', 'space invaders', 'shoot', 'laser', 'zombie', 'space shooter', 'shoot em up', 'shmup', 'bullet'],
  platformer: ['platformer', 'jumping', 'mario', 'jump game', 'side scroller', 'platform game', 'jumping game', 'collect coins'],
  'endless-runner': ['endless runner', 'infinite runner', 'temple run', 'subway surfer', 'run game', 'auto runner', 'runner game'],
  frogger: ['frogger', 'crossing', 'cross the road', 'dodge traffic', 'crossy', 'road crossing'],
  puzzle: ['puzzle', 'matching', 'memory game', 'match 3', 'tile', 'memory', 'card matching', 'match game', 'jigsaw', 'wordle', 'sudoku'],
  clicker: ['clicker', 'clicking', 'idle', 'tapper', 'cookie clicker', 'idle game', 'tap game', 'incremental'],
  rpg: ['rpg', 'adventure', 'quest', 'explore', 'adventure game', 'story game', 'exploration', 'rpg game', 'role playing'],
  fighting: ['fighting game', 'fighter', 'street fighter', 'beat em up', 'brawler', 'boxing', 'wrestling', 'mortal kombat', 'punch', 'kick fight'],
  'tower-defense': ['tower defense', 'td game', 'defend the base', 'tower game', 'place towers', 'defense game', 'castle defense'],
  card: ['card game', 'cards', 'solitaire', 'poker', 'blackjack', 'uno', 'card battle', 'deck building', 'trading card'],
  sports: ['sports', 'soccer', 'football', 'basketball', 'baseball', 'tennis', 'golf', 'hockey', 'bowling'],
  simulation: ['simulation', 'simulator', 'tycoon', 'farm', 'city builder', 'restaurant', 'life sim'],
  snake: ['snake', 'snake game', 'grow longer', 'worm game', 'slither'],
  'brick-breaker': ['breakout', 'brick breaker', 'brick', 'arkanoid', 'paddle ball', 'paddle game', 'break bricks'],
  flappy: ['flappy', 'flappy bird', 'tap to fly', 'fly through pipes', 'bird game'],
  'bubble-shooter': ['bubble shooter', 'bubble pop', 'bubble game', 'pop bubbles', 'aim and shoot bubbles'],
  'falling-blocks': ['tetris', 'falling blocks', 'block stacking', 'stack blocks', 'falling pieces', 'clear lines'],
  rhythm: ['rhythm', 'music game', 'dance game', 'beat game', 'tap to the beat', 'rhythm game', 'guitar hero'],
  'pet-sim': ['pet simulator', 'virtual pet', 'pet game', 'tamagotchi', 'take care of pet', 'feed pet', 'pet sim'],
};

/**
 * Detect game genre from a free-text message
 * @param {string} message - The user's message
 * @returns {string|null} - Genre type or null if no match
 */
export function detectGameGenre(message) {
  const lower = message.toLowerCase();
  for (const [type, keywords] of Object.entries(GENRE_KEYWORDS)) {
    if (keywords.some(kw => lower.includes(kw))) {
      return type;
    }
  }
  return null;
}

// 3D game rules - controls and camera
export const THREE_D_GAME_RULES = `
3D GAME - CRITICAL CONTROL AND CAMERA RULES:

MOVEMENT CONTROLS - USE ARROW KEYS (not WASD):
- ArrowUp = move FORWARD (the direction the camera faces)
- ArrowDown = move BACKWARD
- ArrowLeft = move LEFT (strafe) or turn left
- ArrowRight = move RIGHT (strafe) or turn right
- ALWAYS call e.preventDefault() for ArrowUp, ArrowDown, ArrowLeft, ArrowRight, and Space to stop browser scrolling
- Movement must be RELATIVE TO THE CAMERA DIRECTION, not absolute world axes
- Forward movement formula: x += Math.sin(cameraYaw) * speed; z += Math.cos(cameraYaw) * speed
- Do NOT use WASD as the primary controls - kids expect arrow keys

CAMERA / LOOK AROUND - FULL 360 DEGREE ROTATION:
- The player MUST be able to look/turn a FULL 360 degrees horizontally (yaw)
- Do NOT clamp the horizontal rotation (yaw) - let it wrap freely from 0 to 2*PI or use unclamped values
- Vertical look (pitch) CAN be clamped to roughly -80 to +80 degrees to prevent flipping
- For mouse look: use mousemove event with movementX for yaw, movementY for pitch
- For keyboard turning: ArrowLeft/ArrowRight can rotate the camera yaw smoothly
- WRONG: if (yaw > Math.PI) yaw = Math.PI  <- this clamps to 180 degrees, NEVER do this
- RIGHT: yaw += rotationSpeed (let it go freely, or use yaw = yaw % (Math.PI * 2) for wrapping)
- Camera rotation code pattern:
  camera.rotation.order = 'YXZ';
  camera.rotation.y = yaw;    // horizontal - NO clamp, full 360
  camera.rotation.x = pitch;  // vertical - clamp between -1.4 and 1.4

MOVEMENT DIRECTION (prevent "backwards" controls):
- When the player presses ArrowUp, they MUST move in the direction the camera is facing
- Calculate movement vector from camera yaw angle:
  var moveX = Math.sin(camera.rotation.y) * speed;
  var moveZ = Math.cos(camera.rotation.y) * speed;
- ArrowUp: position.x -= moveX; position.z -= moveZ (forward)
- ArrowDown: position.x += moveX; position.z += moveZ (backward)
- If controls feel "backwards", the sin/cos signs are wrong - flip them
- Test: pressing ArrowUp while looking north should move north, looking east should move east

3D RPG SPECIFIC:
- Include a visible ground plane (large flat BoxGeometry or PlaneGeometry)
- Add simple lighting (AmbientLight + DirectionalLight minimum)
- Player character should be visible (a colored mesh or emoji sprite)
- Keep the game world simple - a few buildings/trees/objects, not massive
- Use simple AABB collision for walls and objects
- Include a HUD overlay (HTML div) for health, gold, level on top of the 3D canvas
- The 3D canvas should fill the game container
`;

// 3D Racing rules
export const THREE_D_RACING_RULES = `
3D RACING GAME - CRITICAL RULES (these prevent the most common 3D racing bugs):

CAMERA SETUP (chase cam - NOT free-look):
- The camera goes BEHIND and ABOVE the car, looking forward
- Do NOT use OrbitControls or free-look rotation for racing games
- Camera follows the car's X position for steering feel
- Pattern:
  camera.position.set(car.position.x, 5, car.position.z + 10);
  camera.lookAt(car.position.x, 1, car.position.z - 20);

ROAD AND MOVEMENT DIRECTION:
- The road extends along the NEGATIVE Z axis (into the screen, away from camera)
- The car stays at a roughly fixed Z position (e.g. z = 0)
- "Forward driving" is simulated by moving ALL scenery TOWARD the camera (increasing Z each frame)
- Do NOT move the car forward along Z - move the world instead
- ArrowLeft/ArrowRight = steer the car (change car.position.x)
- ArrowUp = speed up, ArrowDown = slow down / brake
- ALWAYS call e.preventDefault() for all arrow keys

SCENERY RECYCLING - CRITICAL (prevents the "world disappears" bug):
- ALL road segments, buildings, trees, and scenery objects MUST be recycled in a loop
- Each frame: move each object's Z position toward camera by speed * deltaTime
- When an object's Z passes the camera (z > cameraZ + buffer), RESET it to the far end:
  if (obj.position.z > 20) { obj.position.z -= totalRoadLength; }
- This creates an endless scrolling effect
- If you do NOT recycle, the world empties out after 2-3 seconds and the player sees nothing
- Create enough objects to fill the visible road (e.g. 20-40 road segments, 10+ buildings per side)

GROUND PLANE:
- Use a very large ground plane (e.g. PlaneGeometry(200, 2000)) so it never runs out
- OR use tiled ground segments that recycle like other scenery
- Color the ground to match the theme (green for grass, grey for asphalt, etc.)

CORRECT CODE PATTERN:
function gameLoop() {
  requestAnimationFrame(gameLoop);
  var delta = clock.getDelta();
  
  // Move scenery toward camera
  for (var i = 0; i < scenery.length; i++) {
    scenery[i].position.z += speed * delta;
    // Recycle when past camera
    if (scenery[i].position.z > 20) {
      scenery[i].position.z -= roadLength;
      // Randomize X for variety
      scenery[i].position.x = (Math.random() - 0.5) * 30;
    }
  }
  
  // Camera follows car
  camera.position.x = car.position.x;
  camera.lookAt(car.position.x, 1, car.position.z - 20);
  
  renderer.render(scene, camera);
}

OBSTACLES AND SCORING:
- Spawn obstacle cars/objects in the road that also scroll toward the camera
- When an obstacle reaches the player's Z and the player dodges it, add score
- When an obstacle overlaps the player's X position, trigger a crash
- Use simple distance checks for collision (not complex physics)
`;

// 3D Shooter-specific rules
export const THREE_D_SHOOTER_RULES = `
3D SHOOTING GAME - CRITICAL RULES (FPS / third-person shooter):

POINTER LOCK SETUP (required for mouse look):
- The game MUST use requestPointerLock() for mouse-based camera control
- On page load, show a "Click to Play" overlay message on top of the canvas
- When the player clicks the canvas/overlay, call canvas.requestPointerLock() (or renderer.domElement.requestPointerLock())
- Listen for document 'pointerlockchange' event to detect when pointer lock activates/deactivates
- When pointer lock is lost (player presses Escape), show the "Click to Play" overlay again
- Pattern:
  var canvas = renderer.domElement;
  var overlay = document.getElementById('overlay');
  overlay.addEventListener('click', function() { canvas.requestPointerLock(); });
  document.addEventListener('pointerlockchange', function() {
    if (document.pointerLockElement === canvas) {
      overlay.style.display = 'none'; // Hide overlay, game is active
    } else {
      overlay.style.display = 'flex'; // Show overlay, game is paused
    }
  });

MOUSE LOOK (FPS camera):
- ONLY process mouse look when pointer lock is active (document.pointerLockElement === canvas)
- Use mousemove event with event.movementX for yaw and event.movementY for pitch
- Sensitivity should be low (multiply by 0.002 to 0.004) so it's not too fast for kids
- Yaw (horizontal) = FULL 360 degrees, NO clamping
- Pitch (vertical) = clamp between -1.4 and 1.4 radians to prevent flipping
- Pattern:
  document.addEventListener('mousemove', function(e) {
    if (document.pointerLockElement !== canvas) return;
    yaw -= e.movementX * 0.003;
    pitch -= e.movementY * 0.003;
    pitch = Math.max(-1.4, Math.min(1.4, pitch));
    camera.rotation.order = 'YXZ';
    camera.rotation.y = yaw;
    camera.rotation.x = pitch;
  });

MOVEMENT - ARROW KEYS:
- ArrowUp = move forward (direction camera faces)
- ArrowDown = move backward
- ArrowLeft = strafe left
- ArrowRight = strafe right
- Space = jump (if applicable)
- ALWAYS call e.preventDefault() for arrow keys and space
- Movement MUST be relative to camera yaw direction (use sin/cos)

SHOOTING:
- Click (mousedown) or Space to fire a projectile
- Projectiles fire FROM the camera position IN the camera's forward direction
- Forward direction: new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion)
- Create a small sphere or box mesh for each projectile, add to scene
- Move projectiles forward each frame at a fast speed
- Remove projectiles after they travel a max distance or hit something
- Keep a projectiles array and update/cleanup in the game loop

CROSSHAIR:
- Add a simple crosshair in the CENTER of the screen using an HTML div overlay
- Use position:fixed, top:50%, left:50%, transform:translate(-50%,-50%)
- A simple + or dot shape works well, make it white or bright colored
- The crosshair should ALWAYS be visible on top of the 3D canvas

ENEMIES / TARGETS:
- Spawn enemies as colored meshes (e.g. red cubes or spheres) at random positions
- Use simple distance-based hit detection: when a projectile is within a threshold of an enemy, it's a hit
- On hit: remove the enemy, remove the projectile, increment score, optionally spawn a new enemy
- Keep an enemies array, check collisions each frame in the game loop
- Start with a small number of enemies (5-10) and respawn them when destroyed

HUD OVERLAY:
- Use HTML divs positioned on top of the 3D canvas (position:fixed or position:absolute)
- Show: Score, Health/Lives, Ammo (if limited)
- Use large, readable text with a slight text-shadow for visibility against the 3D scene
- Place at top-left or top-center of the screen

COMMON 3D SHOOTER MISTAKES TO AVOID:
- Forgetting requestPointerLock() - mouse look will NOT work without it
- Processing mousemove when pointer lock is not active - causes jumpy camera
- Not showing a "Click to Play" prompt - kids won't know they need to click
- Making mouse sensitivity too high - kids find it disorienting
- Shooting projectiles in world-axis direction instead of camera direction
- Forgetting to remove old projectiles - causes memory leaks and slowdown
`;

// Platformer safety rules (Phaser-based)
export const PLATFORMER_SAFETY_RULES = `
PLATFORMER GAME (Phaser) - CRITICAL RULES (never break these when customizing):
- The player sprite MUST exist and have arcade physics enabled
- Platforms MUST be in a staticGroup with a collider against the player
- Gravity MUST be set (either in config or via player.setGravityY(800))
- Jumping MUST check player.body.touching.down or player.body.onFloor() before allowing jump
- Camera MUST follow the player: this.cameras.main.startFollow(player)
- Level generation functions (createPlatforms, spawnCoins, etc.) MUST be called in create()
- When changing theme: ONLY change colors, texture generation, and text — keep ALL physics, colliders, and spawn logic intact
- If you rename variables, update ALL references — broken references = game won't start
- DO NOT remove physics.add.collider() calls — the player will fall through platforms
- DO NOT remove setCollideWorldBounds(true) — the player will leave the screen
`;

// Phaser 2D game rules (general, injected when Phaser code is detected)
export const PHASER_GAME_RULES = `
PHASER 2D GAME - IMPORTANT RULES:
- ALWAYS generate textures procedurally in preload() using this.make.graphics() + generateTexture()
- NEVER reference external image files — they won't load
- ALWAYS use arcade physics for movement and collision — never write custom collision math
- Use this.physics.add.collider() for solid walls/platforms, this.physics.add.overlap() for triggers
- Clean up off-screen objects to prevent memory leaks: check bounds and call destroy()
- Use Phaser.Math.Between() for random values, Phaser.Math.Clamp() for clamping
- For game over: display text overlay and this.input.keyboard.once('keydown-SPACE', () => this.scene.restart())
- ALWAYS output the COMPLETE HTML file from <!DOCTYPE html> to </html> with the Phaser CDN script tag
- The Phaser CDN tag MUST be: <script src="https://cdn.jsdelivr.net/npm/phaser@3.86.0/dist/phaser.min.js"><\/script>

MOBILE / RESPONSIVE RULES (MANDATORY for every game):
- ALWAYS include scale config: scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH }
- ALWAYS add <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no"> in <head>
- ALWAYS add body { touch-action: none; } to prevent browser swipe/pinch interference
- For ANY game that uses keyboard input: MUST add on-screen virtual touch buttons visible only on touch devices
- Detect touch with: if ('ontouchstart' in window) { /* create virtual buttons */ }
- Virtual buttons: semi-transparent rectangles with setScrollFactor(0) and high setDepth() so they overlay the game
- In update(), always check BOTH keyboard AND touch flags: if (cursors.left.isDown || touchLeft) ...
- Minimum touch button size: 80x80 pixels, placed in bottom corners of the screen
`;
