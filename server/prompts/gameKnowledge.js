/**
 * Game mechanics knowledge base.
 * Gives the AI deeper knowledge of game design patterns and browser gaming APIs.
 */

export const GAME_KNOWLEDGE_BASE = `
GAME DESIGN PATTERNS AND TECHNIQUES:

1. GAME LOOP FUNDAMENTALS:
   - Use requestAnimationFrame for smooth 60fps animation
   - Track deltaTime for consistent speed across devices
   - Pattern: update(dt) -> draw() -> requestAnimationFrame(loop)

2. INPUT HANDLING:
   - Keyboard: Track key states in an object ({ ArrowLeft: true, ArrowRight: false })
   - Touch: Use touchstart/touchmove/touchend for mobile support
   - Gamepad API: navigator.getGamepads() for controller support
   - Pointer Lock API: element.requestPointerLock() for FPS-style mouse control
   - Always support BOTH keyboard and touch for kid-friendly accessibility

3. PHYSICS AND MOVEMENT:
   - Velocity-based movement: position += velocity * deltaTime
   - Gravity: velocityY += gravity * deltaTime; y += velocityY
   - Jumping: Set velocityY to negative value, let gravity bring it back
   - Friction: velocity *= 0.95 each frame for natural deceleration
   - Bouncing: Reverse velocity and multiply by restitution (0.0-1.0)

4. COLLISION DETECTION:
   - AABB (rectangle): Check overlap on both axes
   - Circle: Distance between centers < sum of radii
   - Tile-based: Check grid cell the object occupies
   - Always use simple collision first - complex physics confuses kids

5. CAMERA AND SCROLLING:
   - Side-scrolling: Move world objects, keep player centered
   - Parallax: Move background layers at different speeds for depth
   - Camera follow: Smoothly lerp camera toward player position
   - Chunked rendering: Only draw objects near the camera for performance

6. PARTICLE EFFECTS:
   - Explosions: Spawn 20-50 small divs/circles, animate outward with fade
   - Trails: Spawn particles at object position, shrink and fade over time
   - Sparkles: Random position offset, random size, quick fade
   - Use CSS transforms (translate, scale, rotate) for performance

7. SOUND EFFECTS (Web Audio API):
   - Create AudioContext for sound generation
   - Simple beeps: OscillatorNode with short duration
   - Jump sound: Quick frequency sweep up
   - Explosion: White noise burst (use createBuffer with random values)
   - Background music: Looping OscillatorNode with low volume
   - Pattern: audioCtx.createOscillator() -> connect to destination -> start/stop

8. SCORING AND PROGRESSION:
   - Display score prominently (top of screen, large font)
   - High score saved to localStorage
   - Difficulty ramp: Increase speed/spawn rate as score grows
   - Level transitions: Brief pause with "Level X!" message
   - Achievements: Track milestones and show celebration animation

9. STATE MANAGEMENT:
   - Game states: menu, playing, paused, gameOver, levelComplete
   - Use a state machine pattern: switch(gameState) in the game loop
   - Pause: Simply skip update() when paused, keep rendering
   - Game over: Show score, high score, and "Play Again" button

10. VISUAL POLISH:
    - Screen shake: Briefly offset the game container by random pixels
    - Flash effects: Brief color overlay on hit/damage
    - Smooth transitions: Use CSS transitions or lerp for UI changes
    - Fullscreen API: element.requestFullscreen() for immersive play

BROWSER GAMING APIs TO USE:
- Canvas API: For pixel-perfect 2D rendering (ctx.fillRect, ctx.drawImage, etc.)
- requestAnimationFrame: Smooth animation loop synced to display refresh
- Web Audio API: Generate sound effects without loading audio files
- Gamepad API: Support game controllers (navigator.getGamepads())
- Pointer Lock API: Lock mouse for FPS-style camera control
- Fullscreen API: Immersive full-screen gameplay
- Touch Events: Mobile-friendly touch controls
- localStorage: Save high scores and game progress
- Performance.now(): Precise timing for deltaTime calculations
`;
