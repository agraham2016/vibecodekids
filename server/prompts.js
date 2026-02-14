/**
 * DEPRECATED - This file is kept for backward compatibility.
 * All prompt logic has been moved to server/prompts/ modules.
 * 
 * This re-exports everything from the new location so any
 * remaining imports continue to work.
 */

export {
  getSystemPrompt,
  getContentFilter,
  sanitizeOutput,
  detectGameGenre
} from './prompts/index.js';
