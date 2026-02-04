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
7. NEVER include inappropriate content

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

Remember: Kids just want to see their creation come to life - they don't need to know HOW it works!`;

/**
 * Generate the complete system prompt
 */
export function getSystemPrompt(currentCode) {
  const contextPrompt = currentCode ? `
CURRENT PROJECT (for your reference only - NEVER mention this to the kid):
${currentCode}

When they ask for changes, update this existing project. Keep what they already have and add to it!
` : '';

  return `${SYSTEM_PROMPT}

${contextPrompt}`;
}

/**
 * Content filter patterns - things to block in user input
 */
export function getContentFilter() {
  return [
    // Violence
    'kill', 'murder', 'weapon', 'gun', 'knife', 'blood', 'gore', 'death',
    'shoot', 'shooting', 'bomb', 'explosion', 'war', 'fight', 'attack',
    
    // Adult content
    'nude', 'naked', 'sex', 'porn', 'adult content', 'xxx', 'nsfw',
    
    // Harmful content
    'hack', 'steal', 'phishing', 'malware', 'virus', 'cheat',
    
    // Scary content for young kids
    'horror', 'torture', 'nightmare', 'creepy', 'terrifying',
    
    // Self-harm
    'suicide', 'self-harm', 'cutting', 'hurt myself',
    
    // Drugs
    'drugs', 'cocaine', 'heroin', 'meth', 'weed', 'marijuana', 
    'smoking', 'cigarette', 'vape', 'vaping',
    
    // Alcohol
    'alcohol', 'beer', 'wine', 'vodka', 'whiskey', 'drunk', 
    'drinking alcohol', 'booze', 'liquor', 'cocktail', 'bar',
    
    // Profanity (keeping it kid-friendly)
    'damn', 'crap', 'stupid', 'idiot', 'dumb', 'loser', 
    'shut up', 'sucks', 'hate you',
    
    // Gambling
    'gambling', 'casino', 'betting', 'poker', 'slots', 'lottery',
    'blackjack', 'roulette',
    
    // Bullying/mean content
    'bully', 'bullying', 'mean', 'ugly', 'fat', 'loser',
  ];
}

/**
 * Sanitize AI output to remove code blocks and technical jargon
 * Keep responses simple and kid-friendly!
 */
export function sanitizeOutput(message) {
  // Remove all code blocks
  let cleaned = message
    .replace(/```[\w]*\n[\s\S]*?```/g, '')
    .replace(/```[\s\S]*?```/g, '')
    .replace(/<!DOCTYPE[\s\S]*?<\/html>/gi, '')
    .replace(/<html[\s\S]*?<\/html>/gi, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '');
  
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
