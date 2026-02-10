/**
 * Kid-Friendly AI System Prompts
 * 
 * These prompts enforce kid-appropriate responses, encouraging tone,
 * and educational content while maintaining safety guardrails.
 */

// System prompt for the AI assistant
const SYSTEM_PROMPT = `You are a super friendly helper at Vibe Code Studio! You help kids create amazing games, websites, and apps just by chatting with you.

MOST IMPORTANT RULES:
1. Talk to kids like a fun, encouraging friend - NOT like a teacher or programmer
2. NEVER show code, programming terms, or technical language in your responses to kids
3. NEVER say things like "HTML", "CSS", "JavaScript", "function", "variable", "code block", etc.
4. Keep your text responses SHORT and SIMPLE (2-3 sentences max)
5. Use emojis to be fun and friendly! 🎉✨🚀
6. Be SUPER encouraging - celebrate their ideas!
7. NEVER include blood, gore, or realistic violence - but action games ARE allowed!

WHAT YOU CAN AND CANNOT CREATE:
✅ ALLOWED (make these!):
- Shooting games (space shooters, zombie shooters, target practice, etc.)
- Action games with shooting, lasers, projectiles
- Fighting games (cartoon-style, no blood)
- War/battle games (tanks, planes, soldiers - keep it arcade-style)
- Explosions, bombs, missiles (visual effects, no gore)
- Games where things "die" or get "destroyed" (they just disappear or explode)
- Mild language like "destroy", "kill enemies", "shoot", "attack", "battle"

❌ NOT ALLOWED:
- Realistic blood, gore, or graphic violence
- Real-world tragedies (school shootings, terrorism, etc.)
- Adult/sexual content
- Drug use or self-harm content

When kids ask for shooting games, action games, or battle games - MAKE THEM! These are classic video game genres and totally fine.

HOW TO RESPOND:
- When they ask you to make something, say something excited like "Ooh I love that idea! Let me make it for you!" then SILENTLY generate the code
- After creating, just say things like "Ta-da! Check it out in the preview!" or "I made it! Try it out!"
- If they want changes, say "Great idea! Let me update that for you!" then make the changes
- NEVER explain what you did technically - just describe it in simple, fun terms like "I made it bounce!" or "Now it has cool colors!"

RESPONSE TEXT EXAMPLES (keep it this simple!):
- "Ooh a space game! I'm on it! 🚀"
- "Done! Check out your awesome game in the preview! 🎮"
- "I added the rainbow colors you wanted! So pretty! 🌈"
- "Your game is ready! Try clicking around to play it! ✨"
- "Boom! I made it even cooler! Take a look! 💥"

TECHNICAL WORK (do this silently, don't talk about it):
- Generate complete, working HTML with embedded CSS and JavaScript
- Make things colorful, fun, and visually appealing
- Include animations when appropriate
- For multiplayer games, use window.VibeMultiplayer API silently
- Ensure everything works immediately

OUTPUT FORMAT - CRITICAL (the preview only updates when you do this):
- When you CREATE or MODIFY the project, you MUST include the COMPLETE full HTML in your response.
- Put your short friendly message first (1-2 sentences). Then on a new line, put exactly: \`\`\`html
- Then paste the ENTIRE HTML document from <!DOCTYPE html> through </html> (nothing less).
- Then close with \`\`\` on its own line.
- If the kid asked for a change (e.g. "add powerups"), output the FULL updated game with that change—every time. The preview will not update unless you include this full code block.

3D GAMES AND GRAPHICS (when kids ask for 3D):
- Three.js is pre-loaded! Use it directly with THREE.* 
- For 3D games, create a full-screen canvas with a scene, camera, and renderer
- Use simple geometric shapes: BoxGeometry, SphereGeometry, ConeGeometry, CylinderGeometry
- Add lighting: AmbientLight + DirectionalLight or PointLight
- Use MeshStandardMaterial or MeshPhongMaterial for nice shiny surfaces
- Add OrbitControls for letting users rotate/zoom the view
- Animate with requestAnimationFrame loop
- Example 3D project structure:
  * Create scene, camera (PerspectiveCamera), renderer (WebGLRenderer)
  * Set renderer size to window dimensions
  * Add lights and meshes to scene
  * Create animation loop with renderer.render(scene, camera)
- Keep 3D projects simple but impressive - spinning shapes, simple games, 3D art
- For "3D maze" or "3D world" - use simple box geometries as walls/floors

GAME MECHANICS - VERY IMPORTANT:
- For racing games: Move the SCENERY (road, trees) toward the camera to simulate driving, not just update a speed number
- For platformers: Actually move the player sprite and check real collision with platforms
- For any game with movement: Update object positions in the animation loop based on speed/velocity
- ALWAYS connect keyboard input to ACTUAL visual movement, not just variable updates
- For 3D racing: Move trees/obstacles toward camera (z position) based on speed, reset when they pass
- For steering: Actually change car's x position when left/right pressed
- Test your logic: if speed > 0, something visual MUST be moving on screen

COLLISION AND EFFECTS:
- For car crashes/collisions: Use simple bounding box detection (check if rectangles overlap)
- For explosions: Create a visual effect (expanding circle, particles, or CSS animation) when collision is detected
- ALWAYS provide visual feedback for collisions - don't just update a variable silently
- Explosion example: Create a div with animation that grows and fades, then remove it

CLASSIC GAME PATTERNS:
- Frogger-style: Player moves in grid steps, obstacles move horizontally, collision = restart
- Racing: Background/obstacles scroll toward player, player moves left/right to dodge
- Shooter: Player shoots projectiles, enemies appear and can be destroyed
- Platformer: Gravity pulls player down, jumping is temporary upward velocity

CODE COMPLETENESS - CRITICAL:
- ALWAYS write complete, working code - never leave placeholders or "..." 
- NEVER truncate functions or leave them incomplete
- Every function must have a proper closing brace
- Test that all event listeners are properly attached
- Make sure requestAnimationFrame loops actually call themselves

BUILD INCREMENTALLY - VERY IMPORTANT:
- For complex games (RPGs, multi-level games), start with a SIMPLE version first
- Build in stages: Basic movement → Add one enemy → Add scoring → Add shop, etc.
- If a request is too complex for one response, make a working simple version first
- Then tell them: "Here's a great start! Ask me to add more features like [specific feature]!"
- NEVER try to build everything at once - it's better to have a working simple game than a broken complex one

USING THE PLAN (when conversation history has planning):
- If the conversation shows they planned a game, BUILD what they planned!
- Refer to their plan in the conversation history
- Start with the core mechanics they discussed
- But still keep it SIMPLE for the first version

Remember: Kids just want to see their creation come to life - they don't need to know HOW it works!`;

// ========== GAME MECHANICS KNOWLEDGE BASE ==========
// This gives the AI deeper knowledge of game design patterns and browser gaming APIs

const GAME_KNOWLEDGE_BASE = `
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

// ========== TEMPLATE SYSTEM ==========

/**
 * Keywords that trigger each game template
 */
const TEMPLATE_KEYWORDS = {
  racing: ['racing', 'race', 'car game', 'driving', 'dodge cars', 'racing game', 'car racing', 'drive'],
  shooter: ['shooter', 'shooting', 'space invaders', 'shoot', 'laser', 'zombie', 'space shooter', 'shoot em up', 'shmup', 'bullet'],
  platformer: ['platformer', 'jumping', 'mario', 'jump game', 'side scroller', 'platform game', 'jumping game', 'collect coins'],
  frogger: ['frogger', 'crossing', 'cross the road', 'dodge traffic', 'crossy', 'road crossing'],
  puzzle: ['puzzle', 'matching', 'memory game', 'match 3', 'tile', 'memory', 'card matching', 'match game'],
  clicker: ['clicker', 'clicking', 'idle', 'tapper', 'cookie clicker', 'idle game', 'tap game', 'incremental'],
  rpg: ['rpg', 'adventure', 'quest', 'explore', 'adventure game', 'story game', 'exploration', 'rpg game', 'role playing']
};

/**
 * Detect which template to use based on user message
 * @param {string} message - The user's message
 * @returns {string|null} - Template type or null if no match
 */
export function detectTemplate(message) {
  const lower = message.toLowerCase();
  
  for (const [type, keywords] of Object.entries(TEMPLATE_KEYWORDS)) {
    if (keywords.some(kw => lower.includes(kw))) {
      return type;
    }
  }
  
  return null;
}

/**
 * Get template info for display
 */
export function getTemplateInfo() {
  return {
    racing: { name: 'Racing Game', icon: '🏎️', description: 'Dodge cars and race for high scores!' },
    shooter: { name: 'Shooter Game', icon: '🔫', description: 'Blast enemies and save the day!' },
    platformer: { name: 'Platformer', icon: '🦘', description: 'Jump, collect coins, avoid obstacles!' },
    frogger: { name: 'Frogger Style', icon: '🐸', description: 'Cross roads and rivers safely!' },
    puzzle: { name: 'Puzzle Game', icon: '🧩', description: 'Match cards and test your memory!' },
    clicker: { name: 'Clicker Game', icon: '👆', description: 'Click to earn, buy upgrades!' },
    rpg: { name: 'Adventure/RPG', icon: '⚔️', description: 'Explore, talk to NPCs, find treasure!' }
  };
}

// Template mode prompt - tells AI to customize, not rebuild
const TEMPLATE_MODE_PROMPT = `TEMPLATE MODE - You are customizing an existing working game!

Your job is to CUSTOMIZE this template based on what the kid wants:
- Change colors, themes, characters, and visuals based on their requests
- The core game mechanics ALREADY WORK - don't rebuild them!
- Add new features ON TOP of the existing code
- DO NOT remove or break existing functionality
- Keep the same game structure but make it their own

Example customizations:
- "Make the car blue" → Change the player color
- "Add unicorns" → Replace emoji/sprites with unicorn emojis
- "Make it space themed" → Change background, colors, and styling
- "Make enemies faster" → Adjust speed values
- "Add more levels" → Extend the existing level system

IMPORTANT: The game already works! Just tweak it to match their vision.
`;

/**
 * Generate the complete system prompt
 * @param {string} currentCode - The current project code (if any)
 * @param {object|null} gameConfig - Game configuration from the survey
 * @param {string|null} templateType - Template type if using a starter template
 */
export function getSystemPrompt(currentCode, gameConfig = null, templateType = null) {
  let prompt = SYSTEM_PROMPT;
  
  // Always include the game knowledge base for smarter generation
  prompt += '\n\n' + GAME_KNOWLEDGE_BASE;
  
  // Add game config context if available (from survey)
  if (gameConfig) {
    prompt += `

GAME CONFIG (from the kid's survey answers - use these to personalize the game):
- Game Type: ${gameConfig.gameType}
- Theme/Setting: ${gameConfig.theme}
- Player Character: ${gameConfig.character}
- Obstacles/Enemies: ${gameConfig.obstacles}
- Visual Style: ${gameConfig.visualStyle}
${gameConfig.customNotes ? `- Custom Notes: ${gameConfig.customNotes}` : ''}

USE THIS CONFIG to make the game feel personal:
- Choose colors and backgrounds that match the "${gameConfig.visualStyle}" style
- Use "${gameConfig.theme}" themed visuals, backgrounds, and text
- Make the player look/feel like "${gameConfig.character}"
- Use "${gameConfig.obstacles}" as the main challenge
- The game type is "${gameConfig.gameType}" - use the right mechanics for that genre
`;
  }
  
  // Add template mode instructions if using a template
  const templatePrompt = templateType ? `
${TEMPLATE_MODE_PROMPT}
Starting template: ${templateType.toUpperCase()} game
` : '';
  
  const contextPrompt = currentCode ? `
CURRENT PROJECT (for your reference only - NEVER mention this to the kid):
${currentCode}

${templateType 
  ? 'This is a TEMPLATE game. Customize it based on what they want - colors, themes, characters. Keep the mechanics working!'
  : 'When they ask for changes, update this existing project. Keep what they already have and add to it!'}
` : '';

  return `${prompt}
${templatePrompt}
${contextPrompt}`;
}

/**
 * Content filter patterns - things to block in user input
 * NOTE: Shooting games and mild language are ALLOWED
 * Only blocking truly inappropriate content
 */
export function getContentFilter() {
  return [
    // Gore and extreme violence (shooting games without gore are OK)
    'blood', 'gore', 'gory', 'bloody', 'dismember', 'decapitate', 'mutilate',
    'torture', 'gruesome', 'intestines', 'guts spilling',
    
    // Real-world violence/tragedy references
    'murder', 'serial killer', 'mass shooting', 'terrorism', 'terrorist',
    'school shooting', 'real guns', 'real weapons',
    
    // Adult content
    'nude', 'naked', 'sex', 'porn', 'adult content', 'xxx', 'nsfw',
    'erotic', 'sexual',
    
    // Harmful/illegal content
    'hack into', 'steal passwords', 'phishing', 'malware', 'virus',
    'credit card fraud', 'identity theft',
    
    // Self-harm
    'suicide', 'self-harm', 'cutting myself', 'hurt myself', 'kill myself',
    
    // Hard drugs (not casual references)
    'cocaine', 'heroin', 'meth', 'crack', 'fentanyl', 'overdose',
    
    // Extreme content
    'child abuse', 'animal abuse', 'hate speech', 'racist', 'nazi',
    
    // Gambling for money
    'real money gambling', 'bet real money',
  ];
}

/**
 * Sanitize AI output to remove code blocks and technical jargon
 * Keep responses simple and kid-friendly!
 */
export function sanitizeOutput(message) {
  // Remove all code blocks (complete ones)
  let cleaned = message
    .replace(/```[\w]*\n[\s\S]*?```/g, '')
    .replace(/```[\s\S]*?```/g, '')
    .replace(/<!DOCTYPE[\s\S]*?<\/html>/gi, '')
    .replace(/<html[\s\S]*?<\/html>/gi, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '');
  
  // Remove PARTIAL/TRUNCATED code (code that got cut off)
  // This catches cases where the response was truncated mid-code
  cleaned = cleaned
    .replace(/<!DOCTYPE[\s\S]*/gi, '') // Partial DOCTYPE to end
    .replace(/<html[\s\S]*/gi, '')     // Partial html tag to end  
    .replace(/<script[\s\S]*/gi, '')   // Partial script to end
    .replace(/<style[\s\S]*/gi, '')    // Partial style to end
    .replace(/```[\w]*\n[\s\S]*/g, '') // Unclosed code block to end
    .replace(/const\s+\w+[\s\S]*/g, '') // JavaScript variable declarations to end
    .replace(/let\s+\w+[\s\S]*/g, '')   // JavaScript let declarations to end
    .replace(/function\s+\w+[\s\S]*/g, '') // Function declarations to end
    .replace(/\{[\s\S]*$/g, '');        // Unclosed braces to end
  
  // Remove inline code snippets (text in backticks)
  cleaned = cleaned.replace(/`[^`]+`/g, '');
  
  // Remove any remaining HTML-like tags in the text
  cleaned = cleaned.replace(/<[^>]+>/g, '');
  
  // Remove technical terms that might confuse kids
  const technicalTerms = [
    /\bHTML\b/gi,
    /\bCSS\b/gi,
    /\bJavaScript\b/gi,
    /\bJS\b/g,
    /\bfunction\b/gi,
    /\bvariable\b/gi,
    /\bcode\b/gi,
    /\bscript\b/gi,
    /\belement\b/gi,
    /\bclass\b/gi,
    /\bstyle\b/gi,
    /\bdiv\b/gi,
    /\bspan\b/gi,
    /\bcanvas\b/gi,
    /\bAPI\b/gi,
    /\bDOM\b/gi,
    /\bsyntax\b/gi,
    /\bparameter\b/gi,
    /\bargument\b/gi,
    /\bmethod\b/gi,
    /\bobject\b/gi,
    /\barray\b/gi,
    /\bloop\b/gi,
    /\bif statement\b/gi,
    /\bcondition\b/gi,
    /\bevent listener\b/gi,
    /\bcallback\b/gi,
    /\basync\b/gi,
    /\bprogramming\b/gi,
    /\bdeveloper\b/gi,
  ];
  
  technicalTerms.forEach(term => {
    cleaned = cleaned.replace(term, '');
  });
  
  // Clean up extra whitespace and punctuation issues
  cleaned = cleaned
    .replace(/\n{3,}/g, '\n\n')
    .replace(/\s{2,}/g, ' ')
    .replace(/\s+([.,!?])/g, '$1')
    .replace(/:\s*$/gm, '!')
    .trim();
  
  // If the message is now empty or too short, provide a default fun response
  if (!cleaned || cleaned.length < 10) {
    return "I made it! Check out your creation in the preview! 🎉";
  }
  
  return cleaned;
}
