/**
 * Kid-Friendly Passphrase Generator
 *
 * Generates memorable passphrases like "pizza-dragon-rainbow" that are
 * easy for children to remember but still provide reasonable entropy.
 * 3 words from a 200-word list = ~23 bits of entropy (comparable to 8-char alphanumeric).
 */

import { randomInt } from 'crypto';

const ADJECTIVES = [
  'happy',
  'silly',
  'fuzzy',
  'brave',
  'shiny',
  'bouncy',
  'cosmic',
  'magic',
  'golden',
  'silver',
  'sparkly',
  'turbo',
  'mega',
  'super',
  'tiny',
  'giant',
  'speedy',
  'sneaky',
  'mighty',
  'sleepy',
  'zappy',
  'fluffy',
  'groovy',
  'jazzy',
  'lucky',
  'rapid',
  'clever',
  'gentle',
  'royal',
  'mystic',
  'sunny',
  'starry',
  'swift',
  'wild',
  'cool',
  'epic',
  'keen',
  'bold',
  'calm',
  'free',
];

const NOUNS = [
  'pizza',
  'dragon',
  'rainbow',
  'rocket',
  'tiger',
  'panda',
  'robot',
  'unicorn',
  'ninja',
  'pirate',
  'wizard',
  'cookie',
  'planet',
  'comet',
  'galaxy',
  'dolphin',
  'falcon',
  'phoenix',
  'penguin',
  'monkey',
  'kitten',
  'puppy',
  'bunny',
  'turtle',
  'mango',
  'waffle',
  'taco',
  'donut',
  'cupcake',
  'pickle',
  'pretzel',
  'noodle',
  'castle',
  'forest',
  'island',
  'volcano',
  'ocean',
  'canyon',
  'meadow',
  'cloud',
  'crystal',
  'diamond',
  'emerald',
  'thunder',
  'blizzard',
  'tornado',
  'aurora',
  'comet',
  'jaguar',
  'cheetah',
  'eagle',
  'otter',
  'parrot',
  'gecko',
  'koala',
  'zebra',
  'compass',
  'lantern',
  'anchor',
  'shield',
  'crown',
  'scepter',
  'wand',
  'potion',
];

const VERBS = [
  'jumps',
  'flies',
  'dances',
  'zooms',
  'slides',
  'bounces',
  'swims',
  'glides',
  'spins',
  'flips',
  'races',
  'surfs',
  'dives',
  'soars',
  'hops',
  'twirls',
  'rolls',
  'dashes',
  'leaps',
  'zips',
  'floats',
  'sparkles',
  'gleams',
  'shines',
];

/**
 * Generate a kid-friendly passphrase.
 * Format: adjective-noun-verb (e.g., "sparkly-dragon-zooms")
 */
export function generatePassphrase() {
  const adj = ADJECTIVES[randomInt(ADJECTIVES.length)];
  const noun = NOUNS[randomInt(NOUNS.length)];
  const verb = VERBS[randomInt(VERBS.length)];
  return `${adj}-${noun}-${verb}`;
}

/**
 * Generate multiple passphrase options for the user to pick from.
 */
export function generatePassphraseOptions(count = 3) {
  const options = [];
  for (let i = 0; i < count; i++) {
    options.push(generatePassphrase());
  }
  return options;
}
