/**
 * Junior Name Generator
 *
 * Generates fun, safe, anonymous display names for under-13 users.
 * Uses a curated word-list approach: [Adjective] + [Noun] + [Number]
 * No real names, locations, or identifiable information.
 */

import { randomBytes } from 'crypto';

const ADJECTIVES = [
  'Brave', 'Clever', 'Swift', 'Lucky', 'Mighty', 'Cosmic', 'Pixel',
  'Turbo', 'Epic', 'Neon', 'Hyper', 'Super', 'Mega', 'Ultra', 'Astro',
  'Blazing', 'Crystal', 'Daring', 'Electric', 'Frozen', 'Golden',
  'Hidden', 'Iron', 'Jolly', 'Keen', 'Lunar', 'Magic', 'Noble',
  'Ocean', 'Prism', 'Quantum', 'Rapid', 'Shadow', 'Thunder', 'Vivid',
  'Wild', 'Zippy', 'Arctic', 'Binary', 'Chrome', 'Diamond', 'Ember',
  'Flash', 'Galactic', 'Happy', 'Indie', 'Jade',
];

const NOUNS = [
  'Coder', 'Dragon', 'Phoenix', 'Tiger', 'Wolf', 'Eagle', 'Fox',
  'Panda', 'Falcon', 'Knight', 'Wizard', 'Ninja', 'Pilot', 'Rover',
  'Star', 'Comet', 'Rocket', 'Storm', 'Blaze', 'Spark', 'Byte',
  'Bot', 'Sprite', 'Pixel', 'Quest', 'Dash', 'Hero', 'Scout',
  'Racer', 'Gamer', 'Builder', 'Maker', 'Artist', 'Dreamer',
  'Captain', 'Explorer', 'Voyager', 'Inventor', 'Crafter', 'Legend',
  'Ranger', 'Surfer', 'Runner', 'Jumper', 'Glider', 'Striker',
  'Charger', 'Dynamo', 'Fusion', 'Zenith',
];

function secureRandom(max) {
  const byte = randomBytes(1)[0];
  return byte % max;
}

/**
 * Generate a safe, anonymous display name.
 * Format: AdjectiveNoun42  (e.g., "CosmicDragon17")
 */
export function generateJuniorName() {
  const adj = ADJECTIVES[secureRandom(ADJECTIVES.length)];
  const noun = NOUNS[secureRandom(NOUNS.length)];
  const num = secureRandom(100);
  return `${adj}${noun}${num}`;
}

/**
 * Generate multiple unique names for the user to pick from.
 */
export function generateJuniorNameOptions(count = 5) {
  const names = new Set();
  while (names.size < count) {
    names.add(generateJuniorName());
  }
  return Array.from(names);
}
